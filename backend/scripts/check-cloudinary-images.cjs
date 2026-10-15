// Runs against the current Travelio API/database. Uses an existing test vendor,
// creates one temporary service, and removes only its own service/uploaded assets.
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const net = require('node:net'); const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const fixture = require('../test/ticket-orders-results.json');
const api = 'http://localhost:5000/api', frontend = 'http://localhost:5173';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assets = new Set(); let serviceId, token, chrome, socket;
const keepAlive = setInterval(() => {}, 1000);
async function request(route, method = 'GET', body, status = 200) {
  const response = await fetch(api + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json(); assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`); return result.data ?? result;
}
(async () => {
  const auth = await request('/auth/login', 'POST', { email: fixture.vendorEmail, password: 'TravelioTest123' }); token = auth.token;
  const facilities = await request('/vendor/attractions'); const facility = facilities.find(f => f.status === 'ACTIVE'); assert.ok(facility);
  const name = 'Cloudinary image check ' + Date.now();
  const payload = { name, service_category: 'TICKET', pricing_unit: 'TICKET', ticket_types: [{ name: 'Vé thử ảnh', price: 150000 }], photos: [] };
  const service = await request(`/vendor/attractions/${facility._id}/tickets`, 'POST', payload, 201); serviceId = service._id;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-images-browser-'));
  const image = path.resolve(__dirname, '../../frontend/src/assets/hero.png');
  const invalid = path.join(temporary, 'invalid.png'); fs.writeFileSync(invalid, 'Not an image');
  const svg = path.join(temporary, 'unsupported.svg'); fs.writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + path.join(temporary, 'profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let page; for (let i = 0; i < 50; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page'); if (page) break; } catch {} await delay(100); }
  socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let seq = 0; const pending = new Map(), exceptions = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(Error('CDP timeout ' + method)); } }, 15000).unref(); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.id) { const task = pending.get(data.id); pending.delete(data.id); if (task) data.error ? task.reject(Error(JSON.stringify(data.error))) : task.resolve(data.result); } if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text); });
  await send('Runtime.enable'); await send('Page.enable');
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { for (let i = 0; i < 400; i++) { if (await evaluate(expression)) return; await delay(100); } throw Error('Timeout: ' + expression); };
  const click = async text => { await wait(`[...document.querySelectorAll('button,a')].some(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled)`); await evaluate(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled).click()`); };
  const navigate = route => send('Page.navigate', { url: frontend + route });
  const uploadSelector = 'section[aria-label="Ảnh dịch vụ (không bắt buộc)"]';
  const images = `document.querySelector(${JSON.stringify(uploadSelector)})?.querySelectorAll('img')`;
  const files = async paths => { const doc = await send('DOM.getDocument'); const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: uploadSelector + ' input[type=file]' }); assert.ok(node.nodeId); await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files: paths }); };
  const openService = async () => {
    await navigate('/vendor/registration'); await wait(`[...document.querySelectorAll('h4')].some(e=>e.textContent===${JSON.stringify(name)})`);
    await evaluate(`[...document.querySelectorAll('h4')].find(e=>e.textContent===${JSON.stringify(name)}).parentElement.querySelectorAll('button').forEach(e=>{if(e.textContent.trim()==='Sửa dịch vụ')e.click()})`);
    await wait(`document.querySelector(${JSON.stringify(uploadSelector)})!==null`);
  };
  await navigate('/'); await wait("location.pathname==='/'&&document.readyState==='complete'");
  await evaluate(`localStorage.setItem('travelio_token',${JSON.stringify(token)});localStorage.setItem('travelio_user',${JSON.stringify(JSON.stringify(auth.user))})`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await openService(); assert.equal(await evaluate("document.querySelectorAll('input[type=url],textarea[name=photos]').length"), 0);
  await files([svg]); await wait("document.body?.innerText.includes('Chỉ nhận ảnh JPG')"); assert.equal(await evaluate(`${images}.length`), 0);
  await files([image, image]); await wait(`document.querySelector(${JSON.stringify(uploadSelector)})?.getAttribute('aria-busy')==='true'`);
  assert.ok(await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Lưu dịch vụ').disabled"));
  await wait(`${images}?.length===2`);
  const uploaded = await evaluate(`[...${images}].map(e=>e.src)`); uploaded.forEach(url => assets.add(url));
  assert.ok(uploaded.every(url => url.includes('/travelio/attractions/')));
  await files([invalid]); await wait("document.body?.innerText.includes('content does not match')"); assert.equal(await evaluate(`${images}.length`), 2);
  assert.equal(await evaluate("document.querySelector('[name=name]').value"), name);
  await evaluate(`document.querySelector(${JSON.stringify(uploadSelector)})?.querySelector('button[aria-label="Xóa ảnh 2"]').click()`); await wait(`${images}.length===1`);
  await click('Lưu dịch vụ'); await wait("document.body?.innerText.includes('Đã lưu dịch vụ và hạng vé')");
  const saved = (await request('/vendor/attractions')).flatMap(f => f.tickets).find(s => s._id === serviceId); assert.deepEqual(saved.photos, [uploaded[0]]);
  const remote = await fetch(uploaded[0]); assert.equal(remote.status, 200); assert.match(remote.headers.get('content-type'), /^image\//);
  await request(`/vendor/tickets/${serviceId}`, 'PUT', { ...payload, ticket_types: saved.ticket_types, photos: ['https://example.com/pasted.jpg'] }, 400);
  await openService(); await wait(`${images}?.length===1`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  await evaluate(`document.querySelector(${JSON.stringify(uploadSelector)}).scrollIntoView({block:'center'})`);
  const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(os.tmpdir(), 'travelio-cloudinary-images-mobile.png'), Buffer.from(shot.data, 'base64'));
  const mongoose = require('mongoose');
  try { await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false }); const { Service } = require('../src/models'); const row = await Service.findById(serviceId).lean(); assert.deepEqual(row.photos, [uploaded[0]]); }
  finally { await mongoose.disconnect(); }
  assert.deepEqual(exceptions, []);
  console.log('PASS real browser: no URL input; SVG rejected; two images uploaded to Cloudinary; save disabled during upload; bad image keeps fields/photos; remove/save/reload; mobile 390px; persisted MongoDB photo; HTTPS image 200; external URL rejected.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  clearInterval(keepAlive); socket?.close(); chrome?.kill();
  if (serviceId && token) await request(`/vendor/tickets/${serviceId}`, 'DELETE').catch(e => { console.error('Test service cleanup:', e.message); process.exitCode = 1; });
  const storage = require('../src/services/avatar.service');
  for (const url of assets) await storage.deleteByPublicId(storage.publicIdFromUrl(url)).catch(e => { console.error('Test asset cleanup:', e.message); process.exitCode = 1; });
});
