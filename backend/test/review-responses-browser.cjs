const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

module.exports = async ({ origin, directory, chromeBinary, sessions, verify }) => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const chrome = spawn(chromeBinary, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port, '--user-data-dir=' + path.join(directory, 'browser-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let page;
    for (let i = 0; i < 60; i++) {
      try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page'); if (page) break; } catch {}
      await delay(100);
    }
    assert.ok(page, 'Chrome failed to start');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    const exceptions = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
      if (message.id && pending.has(message.id)) {
        const job = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(job.timer);
        if (message.error) job.reject(Error(message.error.message)); else job.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('Chrome command timeout: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
      throw Error('Browser wait timed out: ' + expression + '\n' + await evaluate('document.body?.innerText'));
    };
    const click = async label => {
      const expression = `[...document.querySelectorAll('button,a')].find(element => element.textContent.trim() === ${JSON.stringify(label)} && !element.disabled)`;
      await wait(`Boolean(${expression})`);
      await evaluate(`${expression}.click()`);
    };
    const fill = async value => evaluate(`(() => { const element = document.querySelector('article textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const firstText = "document.querySelector('article')?.innerText";
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: origin + '/auth/login' });
    await wait('document.readyState === "complete"');
    for (const session of sessions) {
      await evaluate(`localStorage.clear();localStorage.setItem('travelio_token', ${JSON.stringify(session.token)});localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(session.user))})`);
      await send('Page.navigate', { url: origin + '/vendor/reviews' });
      await wait('document.querySelectorAll("article").length === 10');
      assert.equal(await evaluate("[...document.querySelectorAll('aside button')].find(element => element.textContent.trim() === 'Đánh giá & Phản hồi')?.getAttribute('aria-current')"), 'page');
      await evaluate("document.querySelector('article button').click()");
      await wait('document.querySelector("article textarea") !== null');
      await fill('   ');
      assert.equal(await evaluate("[...document.querySelectorAll('article button')].find(element => element.textContent.trim() === 'Lưu phản hồi').disabled"), true);
      const content = 'Cảm ơn từ ' + session.user.role;
      await fill(content);
      await click('Lưu phản hồi');
      await wait(`${firstText}?.includes('Đã lưu phản hồi.') && !document.querySelector('article textarea')`);
      assert.ok(await evaluate(`${firstText}.includes(${JSON.stringify(content)})`));
      assert.ok(await evaluate(`${firstText}.includes('Đã phản hồi')`));
      await verify(session.user.id, content);
      await send('Page.reload');
      await wait(`${firstText}?.includes(${JSON.stringify(content)})`);
      await evaluate("document.querySelector('article button').click()");
      await wait(`document.querySelector('article textarea')?.value === ${JSON.stringify(content)}`);
      const edited = content + ' đã sửa';
      await fill(edited);
      await click('Lưu phản hồi');
      await wait(`${firstText}?.includes(${JSON.stringify(edited)}) && !document.querySelector('article textarea')`);
      await verify(session.user.id, edited);
      await click('Trang sau');
      await wait("document.body.innerText.includes('Trang 2 / 2') && document.querySelectorAll('article').length === 1");
      await click('Trang trước');
      await wait("document.body.innerText.includes('Trang 1 / 2') && document.querySelectorAll('article').length === 10");
      for (const width of [1440, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
        await delay(100);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `Layout overflows at ${width}px`);
      }
      await send('Emulation.clearDeviceMetricsOverride');
      await evaluate("document.querySelector('article a').click()");
      await wait(`location.pathname.startsWith('/facilities/') && document.body.innerText.includes(${JSON.stringify(edited)})`);
      const label = session.user.role === 'HOTEL_OWNER' ? 'Phản hồi từ Chủ khách sạn' : 'Phản hồi từ Nhà cung cấp tham quan';
      assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(label)})`));
      await evaluate('localStorage.clear()');
      await send('Page.reload');
      await wait(`document.body?.innerText.includes(${JSON.stringify(edited)})`);
      assert.equal(await evaluate("[...document.querySelectorAll('button')].some(element => element.textContent.includes('Chỉnh sửa phản hồi'))"), false);
    }
    assert.deepEqual(exceptions, [], 'Frontend runtime exceptions');
  } finally {
    socket?.close();
    chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  }
};
