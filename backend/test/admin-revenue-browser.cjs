const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ExcelJS = require('exceljs');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

module.exports = async ({ origin, directory, chromeBinary, token, currentUser, faults, requests, partner }) => {
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
    const click = text => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)} && !button.disabled).click()`);
    const fill = (name, value) => evaluate(`(() => { const input = document.querySelector('[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const filter = async (from, to) => { await fill('revenue_from', from); await fill('revenue_to', to); await click('Áp dụng'); };
    const done = 'document.querySelector("section[aria-busy]")?.getAttribute("aria-busy") === "false"';
    const metric = name => `document.querySelector('[data-revenue-stat="${name}"] dd')?.textContent`;
    const rowCount = 'document.querySelectorAll("tbody tr").length';
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: `${origin}/admin/revenue` });
    await wait('document.readyState === "complete"');
    await evaluate(`localStorage.clear(); localStorage.setItem('travelio_token', ${JSON.stringify(token)}); localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(currentUser))})`);
    await send('Page.navigate', { url: `${origin}/admin/revenue` });
    await wait(`${done} && document.querySelector('[name="revenue_from"]') !== null`);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
    assert.equal(await evaluate('document.querySelector("[name=revenue_from]").value'), `${parts.year}-${parts.month}-01`);
    await filter('2026-10-01', '2026-10-31');
    await wait(`${done} && ${rowCount} === 20`);
    assert.equal(await evaluate(metric('gross_payments')), '2.200.000 ₫');
    const downloadDirectory = path.join(directory, 'downloads'); fs.mkdirSync(downloadDirectory);
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDirectory, eventsEnabled: true });
    const download = async extension => {
      const existing = new Set(fs.readdirSync(downloadDirectory));
      const before = requests.length;
      const tracked = await evaluate('location.pathname.startsWith("/admin")');
      await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Xuất báo cáo'); button.click(); button.click(); })()`);
      for (let i = 0; i < 100; i++) {
        const filename = fs.readdirSync(downloadDirectory).find(name => name.endsWith(`.${extension}`) && !existing.has(name));
        if (filename) {
          if (tracked) assert.equal(requests.length, before + 1, 'Repeated clicks must send only one export request');
          return { filename, buffer: fs.readFileSync(path.join(downloadDirectory, filename)) };
        }
        await delay(100);
      }
      throw Error(`No actual ${extension} download: ${await evaluate('document.body.innerText')}`);
    };
    // Editing draft dates does not change the applied period being exported.
    await fill('revenue_from', '2030-01-01'); await fill('revenue_to', '2030-01-31');
    const excelFile = await download('xlsx');
    assert.match(excelFile.filename, /2026-10-01-2026-10-31/);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(excelFile.buffer);
    assert.equal(workbook.getWorksheet('Chi tiết').rowCount, 24);
    assert.equal(workbook.getWorksheet('Tổng hợp').getCell('B10').value, 2200000);
    await evaluate(`(() => { const select = document.querySelector('[aria-label="Định dạng xuất báo cáo"]'); select.value = 'pdf'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await wait('document.querySelector("[data-report-export]")?.getAttribute("aria-busy") === "false"');
    const pdfFile = await download('pdf'); assert.equal(pdfFile.buffer.subarray(0, 5).toString(), '%PDF-');
    await wait('document.querySelector("[data-report-export]")?.getAttribute("aria-busy") === "false"');
    faults.fail = true; await click('Xuất báo cáo');
    await wait('document.querySelector("[data-report-export] [role=alert]")?.textContent.includes("Report test outage")');
    faults.fail = false;
    for (const fault of [
      { status: 200, type: 'application/json', body: { success: false, message: 'Export JSON instead of file' }, expected: 'Export JSON instead of file' },
      { status: 200, type: 'text/html', body: '<html>Proxy fallback</html>', expected: 'Máy chủ không trả về file' },
      { status: 502, type: 'text/plain', body: 'Export plain text unavailable', expected: 'Export plain text unavailable' },
    ]) {
      const beforeFiles = fs.readdirSync(downloadDirectory).length;
      faults.exportResponse = fault;
      await click('Xuất báo cáo');
      await wait(`document.querySelector('[data-report-export] [role=alert]')?.textContent.includes(${JSON.stringify(fault.expected)})`);
      assert.equal(fs.readdirSync(downloadDirectory).length, beforeFiles, 'Error response must never download a file');
    }
    faults.exportResponse = null;
    await fill('revenue_from', '2026-10-01'); await fill('revenue_to', '2026-10-31');
    assert.equal(await evaluate(metric('platform_commission')), '220.000 ₫');
    await click('Sau'); await wait(`${done} && ${rowCount} === 2`);
    assert.equal(await evaluate(metric('gross_payments')), '2.200.000 ₫');
    const countBefore = requests.length;
    await filter('2026-11-01', '2026-10-31');
    await wait('document.querySelector("[role=alert]") !== null');
    assert.equal(requests.length, countBefore, 'Invalid period must not call the API');
    faults.fail = true; await click('Làm mới');
    await wait('document.body.innerText.includes("Report test outage")');
    assert.equal(await evaluate(metric('gross_payments')), undefined);
    faults.fail = false; await click('Thử lại'); await wait(`${done} && ${rowCount} === 2`);
    await filter('2026-11-01', '2026-11-30');
    await wait(`${done} && document.body.innerText.includes('Không có giao dịch đủ điều kiện')`);
    faults.delays['2026-10-01'] = 700;
    const beforeRace = requests.length;
    await filter('2026-10-01', '2026-10-31');
    await wait('document.querySelector("[role=status]")?.textContent.includes("Đang tải")');
    for (let i = 0; i < 30 && requests.length === beforeRace; i++) await delay(20);
    await filter('2026-11-01', '2026-11-30');
    await wait(`${done} && ${metric('gross_payments')} === '0 ₫'`);
    await delay(900);
    assert.equal(await evaluate(metric('gross_payments')), '0 ₫');
    faults.delays = {};
    await send('Page.navigate', { url: `${origin}/admin` });
    await wait(`${done} && document.querySelector('section[aria-label="Doanh thu và hoa hồng"]') !== null`);
    assert.ok(await evaluate('document.querySelector("a[href=\\"/admin/revenue\\"]") !== null'));
    await send('Page.navigate', { url: `${origin}/admin/revenue` });
    await wait(done);
    await send('Page.reload'); await wait(`${done} && document.querySelector('h1')?.textContent === 'Revenue & Commission'`);
    await evaluate(`localStorage.setItem('travelio_token', ${JSON.stringify(partner.token)}); localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(partner.user))})`);
    await send('Page.navigate', { url: `${origin}/vendor/revenue?from=2026-10-01&to=2026-10-31` });
    await wait(`${done} && ${rowCount} === 20`);
    assert.equal(await evaluate(metric('gross_payments')), '2.200.000 ₫');
    assert.equal(await evaluate('document.querySelector("[aria-label=\\"Lọc theo đối tác\\"]")'), null);
    const partnerFile = await download('xlsx');
    assert.ok(partnerFile.filename.includes(partner.user.id));
    const partnerWorkbook = new ExcelJS.Workbook(); await partnerWorkbook.xlsx.load(partnerFile.buffer);
    assert.ok(partnerWorkbook.getWorksheet('Tổng hợp').getCell('B4').value.includes(partner.user.id));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Partner financial report overflows mobile viewport');
    assert.deepEqual(exceptions, []);
  } finally {
    faults.fail = false; faults.delays = {}; faults.exportResponse = null;
    for (const request of pending.values()) clearTimeout(request.timer);
    socket?.close(); chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  }
};
