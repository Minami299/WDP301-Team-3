const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

module.exports = async function browserCheck({ origin, directory, chromeBinary, applicant, reviewer, verifyResult }) {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const chrome = spawn(chromeBinary, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port, '--user-data-dir=' + path.join(directory, 'browser-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
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
    const pending = new Map(); const exceptions = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('Browser command timed out: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
      throw Error('Browser wait timed out: ' + expression + '\n' + (await evaluate('document.body?.innerText') || '').slice(0, 2500) + '\nRuntime: ' + exceptions.join('\n'));
    };
    const click = async label => {
      const selector = `[...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(label)} && !e.disabled)`;
      await wait(`Boolean(${selector})`); await evaluate(`${selector}.click()`);
    };
    const fill = async (name, value) => {
      const selector = `[name="${name}"]`;
      await wait(`document.querySelector(${JSON.stringify(selector)}) !== null`);
      await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const p = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
    };
    const session = async details => {
      await evaluate(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('travelio_token', ${JSON.stringify(details.token)}); localStorage.setItem('travelio_user', ${JSON.stringify(JSON.stringify(details.user))})`);
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: origin + '/partner/registration-pending?verify=1&email=demo%40example.test' });
    await wait("document.body?.innerText.includes('Xác minh email đăng ký')");
    assert.equal(await evaluate("localStorage.getItem('travelio_token')"), null);
    await session(applicant); await send('Page.navigate', { url: origin + '/partner/registration-pending' });
    await wait("document.querySelector('[name=\"profile.legal_name\"]') !== null");
    for (const [name, value] of Object.entries({ entity_type: 'COMPANY', legal_name: 'Browser Demo Company', registered_address: '123 Browser Street', registration_number: 'DEMO-REG', tax_number: 'DEMO-TAX', representative_name: 'Demo Representative', representative_title: 'Director', authority: 'OWNER', supply_type: 'DIRECT_OPERATOR', operator_name: 'Browser Operator' })) await fill('profile.' + name, value);
    await evaluate("[...document.querySelectorAll('label')].filter(e => e.textContent.includes('Tôi đã đọc và chấp nhận')).forEach(e => e.querySelector('input').click())");
    await click('Lưu nháp'); await wait("document.body.innerText.includes('Đã lưu hồ sơ nháp')");
    await send('Page.reload');
    await wait("document.querySelector('[name=\"profile.legal_name\"]')?.value === 'Browser Demo Company'");
    const evidence = path.join(directory, 'browser-demo-evidence.pdf'); fs.writeFileSync(evidence, '%PDF-1.4\nDemo browser evidence\n%%EOF\n');
    for (const kind of ['AUTHORITY_PROOF', 'BUSINESS_REGISTRATION']) {
      await fill('document_kind', kind);
      const root = await send('DOM.getDocument');
      const target = await send('DOM.querySelector', { nodeId: root.root.nodeId, selector: 'input[accept="application/pdf,image/png,image/jpeg"]' });
      await send('DOM.setFileInputFiles', { nodeId: target.nodeId, files: [evidence] });
      await wait("document.body.innerText.includes('Đã lưu tài liệu riêng tư.')");
    }
    await click('Gửi hồ sơ đăng ký đối tác');
    await wait("document.body.innerText.includes('Đã gửi hồ sơ xét duyệt.')");
    assert.equal(await evaluate("document.querySelector('[name=\"profile.legal_name\"]').disabled"), true);
    assert.equal(await evaluate("sessionStorage.getItem('travelio_pending_registration')"), null);
    assert.ok(!(await evaluate('JSON.stringify(localStorage)')).includes('Demo browser evidence'));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    await send('Emulation.clearDeviceMetricsOverride');
    await session(reviewer); await send('Page.navigate', { url: origin + '/admin/approvals' });
    const target = `[...document.querySelectorAll('tbody tr')].find(e => e.textContent.includes(${JSON.stringify(applicant.user.email)}))`;
    await wait(`Boolean(${target})`); await evaluate(`${target}.querySelector('button').click()`);
    await wait("document.querySelector('[role=dialog]')?.textContent.includes('Checklist kiểm tra thủ công')");
    const checks = ['Đã đối chiếu chủ thể kinh doanh và người đại diện', 'Đã kiểm tra quyền quản lý / vận hành / phân phối', 'Đã kiểm tra tài liệu, thời hạn và điều kiện áp dụng', 'Đã kiểm tra cơ sở, dịch vụ, giá và điều kiện công khai'];
    for (const label of checks) await evaluate(`[...document.querySelectorAll('[role=dialog] label')].find(e => e.textContent.trim() === ${JSON.stringify(label)}).querySelector('input').click()`);
    await click('Phê duyệt và cấp quyền');
    await wait("!document.querySelector('[role=dialog]') && document.body.innerText.includes('Đã lưu quyết định')");
    await verifyResult();
    assert.deepEqual(exceptions, [], 'Frontend runtime exceptions');
  } finally {
    if (socket) socket.close();
    chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  }
};
