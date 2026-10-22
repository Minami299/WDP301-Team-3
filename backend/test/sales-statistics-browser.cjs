const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

module.exports = async ({ origin, directory, chromeBinary, token, currentUser, faults, requests, paymentRequests, preparePayments }) => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const chrome = spawn(chromeBinary, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port, '--user-data-dir=' + path.join(directory, 'browser-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let page;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page'); if (page) break; } catch {}
      await delay(100);
    }
    assert.ok(page, 'Headless browser did not start'); socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0; const pending = new Map(), exceptions = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('Browser command timed out: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await delay(100); }
      throw Error('Browser wait timed out: ' + expression + '\n' + (await evaluate('document.body?.innerText') || '').slice(0, 3000) + '\n' + exceptions.join('\n'));
    };
    const click = async text => {
      const selector = `[...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(text)} && !e.disabled)`;
      await wait(`Boolean(${selector})`); await evaluate(`${selector}.click()`);
    };
    const fill = async (name, value) => {
      await evaluate(`(() => { const e = document.querySelector('[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    };
    const period = async (from, to) => { await fill('sales_from', from); await fill('sales_to', to); await click('Áp dụng'); };
    const stat = label => `document.querySelector(${JSON.stringify(`[data-stat="${label}"]`)})?.lastElementChild.textContent`;
    const done = 'document.querySelector("[aria-busy]")?.getAttribute("aria-busy") === "false"';
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: origin + '/vendor' });
    await wait('document.readyState === "complete"');
    await evaluate(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('travelio_token', ${JSON.stringify(token)}); localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(currentUser))})`);
    await send('Page.navigate', { url: origin + '/vendor' });
    await wait('document.querySelector("[name=sales_from]") !== null');
    const initialRequest = requests.at(-1);
    const defaults = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
    assert.equal(await evaluate('document.querySelector("[name=sales_from]").value'), `${defaults.year}-${defaults.month}-01`);
    await wait(done);
    assert.ok(initialRequest === undefined || initialRequest.from !== undefined);
    await period('2026-10-01', '2026-10-31'); await wait(`${done} && ${stat('Số vé đã bán')} === '5'`);
    assert.equal(await evaluate(stat('Doanh thu bán vé')), '700.000 đ');
    assert.equal(await evaluate(stat('Lượt quét QR hợp lệ')), '1'); assert.equal(await evaluate(stat('Tổng lượt quét QR')), '4');
    await wait('document.querySelectorAll(".recharts-surface").length >= 2');
    assert.ok((await evaluate('document.body.innerText')).includes('Chức năng soát QR cho Attraction Vendor cần được tích hợp riêng.'));
    const beforeInvalid = requests.length;
    await period('2026-11-01', '2026-10-31'); await wait('document.body.innerText.includes("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")');
    assert.equal(requests.length, beforeInvalid);
    faults.fail = true; await click('Tải lại báo cáo'); await wait('document.body.innerText.includes("Simulated report outage")');
    assert.equal(await evaluate(stat('Doanh thu bán vé')), '—'); assert.equal(await evaluate(stat('Số vé đã bán')), '—');
    faults.fail = false; await click('Tải lại báo cáo'); await wait(`${done} && ${stat('Số vé đã bán')} === '5'`);
    assert.ok(!(await evaluate('document.body.innerText')).includes('Simulated report outage'));
    await period('2026-11-01', '2026-11-30'); await wait(`${done} && ${stat('Số vé đã bán')} === '0'`);
    assert.ok((await evaluate('document.body.innerText')).includes('Chưa có bản ghi quét QR trong kỳ.'));
    faults.delays['2026-10-01'] = 600;
    const beforeRace = requests.length;
    await period('2026-10-01', '2026-10-31');
    for (let attempt = 0; requests.length === beforeRace && attempt < 30; attempt++) await delay(20);
    await period('2026-11-01', '2026-11-30'); await wait(`${done} && ${stat('Số vé đã bán')} === '0'`);
    await delay(900); assert.equal(await evaluate(stat('Doanh thu bán vé')), '0 đ'); assert.equal(await evaluate(stat('Số vé đã bán')), '0');
    faults.delays = {};
    await period('2026-10-01', '2026-10-31'); await wait(`${done} && ${stat('Số vé đã bán')} === '5'`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(150); assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Dashboard overflows the mobile viewport');
    await send('Emulation.clearDeviceMetricsOverride');
    await preparePayments();
    await click('Thanh toán');
    await wait('location.pathname === "/vendor/payments" && document.querySelector("h1")?.textContent === "Thanh toán"');
    const paymentDone = 'document.querySelector("[data-payment-transactions]")?.getAttribute("aria-busy") === "false"';
    const rowCount = 'document.querySelectorAll("[data-payment-transactions] tbody tr").length';
    await wait(`${paymentDone} && ${rowCount} === 10`);
    assert.ok((await evaluate('document.querySelector("[data-payment-transactions]").innerText')).includes('17 dòng'));
    assert.equal(await evaluate('[...document.querySelectorAll("aside button")].find(e => e.textContent.trim() === "Thanh toán")?.getAttribute("aria-current")'), 'page');
    const status = async value => {
      await evaluate(`(() => { const e = document.querySelector('[name="payment_status"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    };
    await status('FAILED'); await wait(`${paymentDone} && ${rowCount} === 10 && document.querySelector('[data-payment-transactions] tbody').innerText.includes('Thất bại')`);
    const firstPage = await evaluate('[...document.querySelectorAll("[data-payment-transactions] tbody tr")].map(e => e.cells[0].textContent)');
    await click('Trang sau'); await wait(`${paymentDone} && ${rowCount} === 3`);
    const secondPage = await evaluate('[...document.querySelectorAll("[data-payment-transactions] tbody tr")].map(e => e.cells[0].textContent)');
    assert.ok(secondPage.every(code => !firstPage.includes(code)));
    assert.equal(await evaluate(stat('Số vé đã bán')), '5'); assert.equal(await evaluate(stat('Doanh thu bán vé')), '700.000 đ');
    await status('PENDING'); await wait(`${paymentDone} && ${rowCount} === 1 && document.querySelector('[data-payment-transactions] tbody').innerText.includes('Đang chờ')`);
    assert.ok(paymentRequests.at(-1).page === '1');
    faults.paymentFail = true; await click('Tải lại giao dịch'); await wait('document.body.innerText.includes("Simulated payment history outage")');
    assert.equal(await evaluate(rowCount), 0); assert.equal(await evaluate(stat('Doanh thu bán vé')), '700.000 đ');
    faults.paymentFail = false; await click('Tải lại giao dịch'); await wait(`${paymentDone} && ${rowCount} === 1`);
    faults.paymentStatusDelays.FAILED = 600; const beforeStatusRace = paymentRequests.length;
    await status('FAILED');
    for (let attempt = 0; paymentRequests.length === beforeStatusRace && attempt < 30; attempt++) await delay(20);
    await status('SUCCESS'); await wait(`${paymentDone} && ${rowCount} === 2`);
    await delay(900); assert.equal(await evaluate(rowCount), 2);
    assert.ok(!(await evaluate('document.querySelector("[data-payment-transactions] tbody").innerText')).includes('Thất bại'));
    faults.paymentStatusDelays = {};
    await status('FAILED'); await wait(`${paymentDone} && ${rowCount} === 10`); await click('Trang sau'); await wait(`${paymentDone} && ${rowCount} === 3`);
    await period('2026-11-01', '2026-11-30'); await wait(`${paymentDone} && document.querySelector('[data-payment-transactions]').innerText.includes('Không có giao dịch phù hợp')`);
    assert.equal(paymentRequests.at(-1).page, '1'); assert.equal(await evaluate(stat('Số vé đã bán')), '0');
    await send('Page.reload'); await wait('document.querySelector("h1")?.textContent === "Thanh toán"'); await wait(`${paymentDone} && ${rowCount} === 10`);
    assert.equal(await evaluate('location.pathname'), '/vendor/payments');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(150);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify('main nav a[href="/vendor/payments"]')})?.getAttribute('aria-current')`), 'page');
    await evaluate(`document.querySelector(${JSON.stringify('main nav a[href="/vendor"]')}).click()`); await wait('document.querySelector("h1")?.textContent === "Tổng quan kinh doanh"');
    await evaluate(`document.querySelector(${JSON.stringify('main nav a[href="/vendor/payments"]')}).click()`); await wait('document.querySelector("h1")?.textContent === "Thanh toán"'); await wait(`${paymentDone} && ${rowCount} === 10`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Payment page overflows the mobile viewport');
    assert.deepEqual(exceptions, [], 'Frontend runtime exceptions');
  } finally {
    faults.fail = false; faults.delays = {}; faults.paymentFail = false; faults.paymentStatusDelays = {};
    if (socket) socket.close(); chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  }
};
