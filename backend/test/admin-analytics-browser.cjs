const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

module.exports = async ({ origin, directory, chromeBinary, token, currentUser, faults }) => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const chrome = spawn(chromeBinary, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(directory, 'browser-profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  const pending = new Map();
  try {
    let page;
    for (let i = 0; i < 60; i++) {
      try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page'); if (page) break; } catch {}
      await delay(100);
    }
    assert.ok(page, 'Headless browser did not start');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const exceptions = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error(`Browser timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
      throw Error(`Browser wait failed: ${expression}\n${await evaluate('document.body?.innerText')}`);
    };
    const click = label => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(label)} && !button.disabled).click()`);
    const fill = (name, value) => evaluate(`(() => { const input = document.querySelector('[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const select = (label, value) => evaluate(`(() => { const select = document.querySelector('[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, ${JSON.stringify(value)}); select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const done = 'document.querySelector("[data-admin-analytics]")?.getAttribute("aria-busy") === "false"';
    const metric = key => `document.querySelector('[data-analytics-kpi="${key}"] dd')?.textContent`;
    const ready = key => `${done} && document.querySelector('[data-analytics-period]')?.textContent.includes(${JSON.stringify(key)})`;
    const filter = async (from, to) => { await fill('analytics_from', from); await fill('analytics_to', to); await click('Áp dụng bộ lọc'); };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: `${origin}/admin/analytics` }); await wait('document.readyState === "complete"');
    await evaluate(`localStorage.clear(); localStorage.setItem('travelio_token', ${JSON.stringify(token)}); localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(currentUser))})`);
    await send('Page.navigate', { url: `${origin}/admin/analytics?analytics_from=2026-10-01&analytics_to=2026-10-07&analytics_interval=daily` });
    await wait(ready('2026-10-01'));
    assert.equal(await evaluate(metric('gross_payments')), '100.000 ₫');
    assert.equal(await evaluate(metric('completed_bookings')), '1');
    assert.equal(await evaluate('document.querySelectorAll("[data-analytics-kpi]").length'), 7);
    await wait('document.querySelectorAll("[data-admin-analytics] .recharts-wrapper").length === 5');
    for (const interval of ['monthly', 'yearly', 'daily']) {
      await select('Nhóm thời gian analytics', interval); await click('Áp dụng bộ lọc');
      await wait(`${done} && location.search.includes('analytics_interval=${interval}') && document.querySelectorAll('[data-analytics-kpi]').length === 7`);
      assert.equal(faults.requests.at(-1).interval, interval);
      assert.equal(await evaluate(metric('gross_payments')), '100.000 ₫');
    }
    await send('Page.reload'); await wait(ready('2026-10-01'));
    assert.equal(await evaluate('document.querySelector("[name=analytics_to]").value'), '2026-10-07');
    for (const [preset, interval] of [['7d', 'daily'], ['30d', 'daily'], ['6m', 'monthly'], ['12m', 'monthly']]) {
      const before = faults.requests.length;
      await select('Khoảng thời gian analytics', preset);
      await wait(`${done} && document.querySelectorAll('[data-analytics-kpi]').length === 7`);
      assert.ok(faults.requests.length > before); assert.equal(faults.requests.at(-1).interval, interval);
    }
    faults.delay['2026-09-01'] = 500;
    await filter('2026-09-01', '2026-09-07');
    await wait('document.querySelector("[data-admin-analytics]").getAttribute("aria-busy") === "true"');
    await filter('2026-10-01', '2026-10-07'); await wait(ready('2026-10-01'));
    await delay(650);
    assert.equal(await evaluate(metric('gross_payments')), '100.000 ₫');
    assert.ok(await evaluate('document.querySelector("[data-analytics-period]").textContent.includes("2026-10-01")'));
    faults.fail = true; await click('Làm mới số liệu');
    await wait(`${done} && document.body.innerText.includes('Analytics test outage')`);
    assert.equal(await evaluate('document.querySelectorAll("[data-analytics-kpi]").length'), 0);
    faults.fail = false; await click('Thử lại'); await wait(ready('2026-10-01'));
    await filter('2030-01-01', '2030-01-07'); await wait(ready('2030-01-01'));
    assert.equal(await evaluate(metric('total_bookings')), '0');
    assert.ok(await evaluate('document.body.innerText.includes("Chưa có booking hoặc thanh toán")'));
    await filter('2026-10-01', '2026-10-07'); await wait(ready('2026-10-01'));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(250);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile page must not overflow horizontally');
    assert.ok(await evaluate('document.querySelector("main").scrollWidth <= document.querySelector("main").clientWidth'), 'Mobile dashboard must fit its main container');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Page.navigate', { url: `${origin}/admin?analytics_from=2026-10-01&analytics_to=2026-10-07` });
    await wait(ready('2026-10-01'));
    assert.equal(await evaluate(metric('gross_payments')), '100.000 ₫');
    assert.deepEqual(exceptions, []);
  } finally {
    if (socket) socket.close();
    for (const request of pending.values()) clearTimeout(request.timer);
    chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  }
};
