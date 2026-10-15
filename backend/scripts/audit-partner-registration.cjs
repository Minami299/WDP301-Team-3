// QA audit only: exercise the current app/database and record defects without changing app code.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), net = require('node:net');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { User, Facility, Service } = require('../src/models');
const api = 'http://localhost:5000/api', front = 'http://localhost:5173';
const stamp = Date.now(), password = 'TravelioApproval123!';
const evidence = { at: new Date().toISOString(), cases: [], browser: [], createdNewDatabase: false };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket;
async function register(body) {
  const response = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  return { httpStatus: response.status, success: data.success, message: data.message, errors: data.errors, user: data.user, tokenIssued: Boolean(data.token) };
}
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false });
  evidence.database = mongoose.connection.name;
  const positive = JSON.parse(fs.readFileSync(path.join(__dirname, '../test/partner-approval-results.json'), 'utf8'));
  const base = role => ({ ...structuredClone(positive.browserRequests.find(item => item.payload.role_name === role).payload), password, confirm_password: password });
  const hotel = base('HOTEL_OWNER'), vendor = base('ACTIVITY_VENDOR');
  const cases = [
    ['hotel-missing-phone', 'HOTEL_OWNER', p => { delete p.phone; }, 400],
    ['hotel-invalid-phone', 'HOTEL_OWNER', p => { p.phone = 'abc'; }, 400],
    ['hotel-zero-price', 'HOTEL_OWNER', p => { p.rooms[0].price = 0; p.service_price = 0; }, 400],
    ['hotel-text-price', 'HOTEL_OWNER', p => { p.rooms[0].price = 'not-a-price'; p.service_price = 'not-a-price'; }, 400],
    ['hotel-missing-price', 'HOTEL_OWNER', p => { delete p.rooms[0].price; }, 400],
    ['hotel-negative-price', 'HOTEL_OWNER', p => { p.rooms[0].price = -1; }, 400],
    ['hotel-no-photos', 'HOTEL_OWNER', p => { p.photos = []; p.rooms[0].photos = []; }, 400],
    ['hotel-whitespace-address', 'HOTEL_OWNER', p => { p.facility_address = '   '; }, 400],
    ['hotel-confirm-password', 'HOTEL_OWNER', p => { p.confirm_password = 'wrong'; }, 400],
    ['hotel-terms', 'HOTEL_OWNER', p => { p.agree_terms = false; }, 400],
    ['vendor-missing-phone', 'ACTIVITY_VENDOR', p => { delete p.phone; }, 400],
    ['vendor-invalid-phone', 'ACTIVITY_VENDOR', p => { p.phone = 'abc'; }, 400],
    ['vendor-missing-service', 'ACTIVITY_VENDOR', p => { p.services = []; }, 400],
    ['vendor-ticket-name', 'ACTIVITY_VENDOR', p => { p.services[0].ticket_types[0].name = ''; }, 400],
    ['vendor-ticket-price', 'ACTIVITY_VENDOR', p => { p.services[0].ticket_types[0].price = '150,000'; }, 400],
    ['vendor-duplicate-ticket', 'ACTIVITY_VENDOR', p => { p.services[0].ticket_types[1].name = p.services[0].ticket_types[0].name; }, 400],
    ['vendor-external-image', 'ACTIVITY_VENDOR', p => { p.services[0].photos = ['https://example.com/photo.jpg']; }, 400],
    ['vendor-confirm-password', 'ACTIVITY_VENDOR', p => { p.confirm_password = 'wrong'; }, 400],
  ];
  for (const [id, role, change, expected] of cases) {
    const payload = base(role); payload.email = `audit-${id}-${stamp}@example.com`; payload.facility_name = `QA ${id}`; change(payload);
    const result = await register(payload);
    const account = await User.findOne({ email: payload.email }).lean();
    const facility = account ? await Facility.findOne({ vendor_id: account._id }).lean() : null;
    const services = facility ? await Service.find({ facility_id: facility._id }).select('name base_price photos').lean() : [];
    const row = { id, expectedHttpStatus: expected, ...result, email: payload.email, accountSaved: Boolean(account), facilitySaved: Boolean(facility), storedServices: services, passed: result.httpStatus === expected && !account };
    evidence.cases.push(row); console.log(`${row.passed ? 'PASS' : 'DEFECT'} ${id}: HTTP ${result.httpStatus}, saved=${row.accountSaved}`);
  }
  // Use a separate Chrome profile so no existing user's browser/session is changed.
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-registration-audit-'));
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, '--user-data-dir=' + path.join(temp, 'profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let page;
  for (let i = 0; i < 50; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page'); if (page) break; } catch {} await delay(100); }
  socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let seq = 0; const pending = new Map(), requests = [], exceptions = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(Error('CDP timeout ' + method)); } }, 20000).unref(); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.id) { const job = pending.get(data.id); pending.delete(data.id); if (job) data.error ? job.reject(Error(JSON.stringify(data.error))) : job.resolve(data.result); } if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text); if (data.method === 'Network.responseReceived' && data.params.response.url.endsWith('/auth/register')) requests.push({ status: data.params.response.status }); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { const deadline = Date.now() + 45000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(100); } throw Error('Timeout ' + expression + '\n' + (await evaluate('document.body?.innerText') || '').slice(0, 5000)); };
  const step = number => wait(`document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='${number}'`);
  const navigate = route => send('Page.navigate', { url: front + route });
  const click = async label => { await wait(`[...document.querySelectorAll('button,a')].some(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled)`); await evaluate(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled).click()`); };
  const fill = async (selector, value) => { await wait(`document.querySelector(${JSON.stringify(selector)})!==null`); await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); };
  const submit = () => evaluate("document.querySelector('form').requestSubmit()");
  const capture = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); const file = path.join(__dirname, '../test/registration-audit', name + '.png'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(shot.data, 'base64')); return path.relative(path.join(__dirname, '../test'), file).replaceAll('\\', '/'); };
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/partner/register/hotel'); await step(1);
  const hotelEmail = `audit-hotel-ui-${stamp}@example.com`;
  for (const [key, value] of [['full_name', 'Hotel Boundary QA'], ['email', hotelEmail], ['password', password], ['confirm_password', password]]) await fill('#vendor-' + key, value);
  await evaluate("document.querySelector('input[type=checkbox]').click()"); await click('Continue'); await step(2); await click('Tiếp theo'); await step(3); await click('Tiếp theo'); await step(4);
  await fill('input[placeholder="200000"]', '0'); await click('Tiếp theo'); await step(4); await wait("document.querySelector('[role=alert]')!==null");
  evidence.browser.push({ id: 'hotel-ui-zero-price', passed: true, actual: 'Remains at step 4; validation message is shown' });
  await fill('input[placeholder="200000"]', '200000'); await click('Tiếp theo'); await step(5); await click('Tiếp theo'); await step(5); await wait("document.querySelector('[role=alert]')!==null");
  evidence.browser.push({ id: 'hotel-ui-photo-minimum', passed: true, actual: await evaluate("document.querySelector('[role=alert]').innerText") });
  const files = [0, 1, 2].map(i => { const name = path.join(temp, `audit-${i}.png`); fs.copyFileSync(path.join(__dirname, '../../frontend/src/assets/hero.png'), name); return name; });
  const document = await send('DOM.getDocument'), input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type=file]' }); await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files });
  await wait("document.querySelector('section[aria-label=\"Hình ảnh phòng\"]')?.querySelectorAll('img').length===3"); await click('Tiếp theo'); await step(6); await click('Tiếp theo'); await step(7); await click('Tiếp theo'); await step(8);
  await fill('input[type=tel]', 'abc'); await click('Tiếp theo'); await step(9);
  evidence.browser.push({ id: 'hotel-ui-invalid-phone', passed: false, actual: 'Phone abc accepted at step 8; Continue opens step 9', accountSaved: Boolean(await User.exists({ email: hotelEmail })), screenshot: await capture('hotel-invalid-phone') });
  await click('Lưu và thoát'); await wait("location.pathname==='/'"); await navigate('/partner/register/hotel'); await step(1);
  const restoredEmail = await evaluate("document.querySelector('#vendor-email').value");
  evidence.browser.push({ id: 'hotel-save-and-exit', passed: restoredEmail === hotelEmail, expectedEmail: hotelEmail, actualEmail: restoredEmail, actualStep: 1, screenshot: await capture('hotel-save-and-exit') });

  await navigate('/partner/register/attraction'); await step(1);
  const longEmail = 'audit-' + stamp + '-' + 'a'.repeat(310) + '@example.com';
  for (const [key, value] of [['full_name', 'Vendor Long Email QA'], ['email', longEmail], ['password', password], ['confirm_password', password]]) await fill('#vendor-' + key, value);
  await evaluate("document.querySelector('input[type=checkbox]').click()"); await submit(); await step(2);
  for (const [key, value] of [['facility_name', 'Vendor Long Email QA'], ['facility_address', '123 QA'], ['facility_city', 'Đà Nẵng'], ['phone', '0912345678']]) await fill('#vendor-' + key, value);
  await submit(); await step(3); await fill('[name="services.0.name"]', 'QA ticket'); await fill('[name="services.0.location"]', 'Đà Nẵng'); await fill('[name="services.0.ticket_types.0.name"]', 'Người lớn'); await fill('[name="services.0.ticket_types.0.price"]', '150000'); await submit(); await step(4); await submit();
  await wait("document.querySelector('[role=alert]')!==null");
  const saved = await User.findOne({ email: longEmail }).lean();
  evidence.browser.push({ id: 'vendor-long-email', passed: !saved, emailLength: longEmail.length, email: longEmail, apiResponses: requests, url: await evaluate('location.pathname'), message: await evaluate("document.querySelector('[role=alert]').innerText"), accountSaved: Boolean(saved), approvalStatus: saved?.approvalStatus, tokenStored: await evaluate("Boolean(localStorage.getItem('travelio_token'))"), screenshot: await capture('vendor-long-email') });
  await click('Create Vendor Account'); await wait("document.querySelector('#vendor-email')!==null");
  evidence.browser.push({ id: 'vendor-long-email-retry', actualStep: await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"), message: await evaluate("document.body.innerText.includes('Email này đã được đăng ký')"), accountCount: await User.countDocuments({ email: longEmail }) });
  evidence.browserExceptions = exceptions;
  console.log('Browser boundary checks completed');
})().catch(error => { evidence.runError = error.message; console.error(error.message); process.exitCode = 1; }).finally(async () => {
  evidence.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, '../test/partner-registration-audit.json'), JSON.stringify(evidence, null, 2) + '\n');
  socket?.close(); chrome?.kill(); await mongoose.disconnect();
});
