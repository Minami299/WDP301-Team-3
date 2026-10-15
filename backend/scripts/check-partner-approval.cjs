// Live registration/approval checks use Travelio's current database only.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { User, Role, Facility, Service } = require('../src/models');
const { hashPassword } = require('../src/utils/password');
const api = 'http://localhost:5000/api', frontend = 'http://localhost:5173';
const stamp = Date.now(), password = 'TravelioApproval123!';
// Admin QA creation requires separate explicit authorization; Manager QA was already authorized.
const withAdmin = process.argv.includes('--with-admin');
const staffPassword = crypto.randomBytes(24).toString('base64url');
const managerEmail = `approval-manager-${stamp}@example.com`, adminEmail = `approval-admin-${stamp}@example.com`, vendorEmail = `approval-vendor-${stamp}@example.com`, hotelEmail = `approval-hotel-${stamp}@example.com`;
let managerId, adminId, chrome, socket, staffToken;
const checks = [], delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const keepAlive = setInterval(() => {}, 1000);
async function request(route, method = 'GET', body, token, expected = 200) {
  const response = await fetch(api + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); assert.equal(response.status, expected, `${method} ${route}: ${data.message}`); return data;
}
function pass(name) { checks.push(name); console.log('PASS ' + name); }

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false });
  const role = await Role.findOne({ role_name: 'MANAGER' }); assert.ok(role);
  managerId = new mongoose.Types.ObjectId();
  await User.create({ _id: managerId, email: managerEmail, full_name: 'Approval QA Manager', password_hash: await hashPassword(staffPassword), role_id: role._id, status: 'ACTIVE', is_verified: true });
  if (withAdmin) {
    const adminRole = await Role.findOne({ role_name: 'ADMIN' }); assert.ok(adminRole);
    adminId = new mongoose.Types.ObjectId();
    await User.create({ _id: adminId, email: adminEmail, full_name: 'Approval QA Admin', password_hash: await hashPassword(staffPassword), role_id: adminRole._id, status: 'ACTIVE', is_verified: true });
  }
  staffToken = (await request('/auth/login', 'POST', { email: managerEmail, password: staffPassword })).token;
  const customerEmail = `approval-customer-${stamp}@example.com`;
  const customer = await request('/auth/register', 'POST', { full_name: 'Customer Approval QA', email: customerEmail, password }, null, 201);
  assert.ok(customer.token); assert.equal(customer.user.status, 'ACTIVE');
  await request('/auth/me', 'GET', null, customer.token);
  const customerLogin = await request('/auth/login', 'POST', { email: customerEmail, password });
  assert.ok(customerLogin.token); assert.equal(customerLogin.user.role, 'CUSTOMER');
  pass('Customer registration still signs in normally');
  await request('/auth/register', 'POST', { full_name: 'Invalid partner', email: `invalid-${stamp}@example.com`, password, role_name: 'ACTIVITY_VENDOR' }, null, 400);
  assert.equal(await User.countDocuments({ email: `invalid-${stamp}@example.com` }), 0);
  pass('Failed partner registration does not create an account');

  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-approval-browser-'));
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + path.join(temp, 'profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let page; for (let i = 0; i < 50; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page'); if (page) break; } catch {} await delay(100); }
  socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let seq = 0, signupPosts = 0; const pending = new Map(), exceptions = [], browserRequests = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(Error('CDP timeout ' + method)); } }, 20000).unref(); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.id) { const job = pending.get(data.id); pending.delete(data.id); if (job) data.error ? job.reject(Error(JSON.stringify(data.error))) : job.resolve(data.result); } if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text); if (data.method === 'Network.requestWillBeSent' && data.params.request.method === 'POST' && data.params.request.url.endsWith('/auth/register')) { signupPosts++; const payload = JSON.parse(data.params.request.postData); delete payload.password; delete payload.confirm_password; browserRequests.push({ requestId: data.params.requestId, payload }); } if (data.method === 'Network.responseReceived') { const entry = browserRequests.find(item => item.requestId === data.params.requestId); if (entry) entry.httpStatus = data.params.response.status; } });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { for (let i = 0; i < 400; i++) { if (await evaluate(expression)) return; await delay(100); } throw Error('Timeout: ' + expression + '\nUI: ' + (await evaluate('document.body?.innerText') || '').slice(0, 6000)); };
  const text = value => wait(`document.body?.innerText.includes(${JSON.stringify(value)})`);
  const click = async label => { await wait(`[...document.querySelectorAll('button,a')].some(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled)`); await evaluate(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled).click()`); };
  const fill = async (selector, value) => { await wait(`document.querySelector(${JSON.stringify(selector)})!==null`); await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); };
  const navigate = route => send('Page.navigate', { url: frontend + route });
  const submit = () => evaluate("document.querySelector('form').requestSubmit()");
  const step = n => wait(`document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='${n}'`);
  const noSession = async () => { assert.equal(await evaluate("localStorage.getItem('travelio_token')"), null); assert.equal(await evaluate("localStorage.getItem('travelio_user')"), null); };
  const verifyPending = async (email, roleName, businessName) => {
    await wait("location.pathname==='/partner/registration-pending'"); await text('Đăng ký thành công!'); await text(email); await text(businessName); await text(roleName === 'HOTEL_OWNER' ? 'Hotel Owner' : 'Attraction Vendor'); await text('Pending Approval'); await noSession();
    const snapshot = await evaluate("JSON.parse(sessionStorage.getItem('travelio_pending_registration'))");
    assert.deepEqual(Object.keys(snapshot).sort(), ['approvalStatus', 'email', 'facility_name', 'full_name', 'role', 'status']);
    assert.equal(snapshot.status, 'PENDING'); assert.equal(snapshot.role, roleName);
    assert.equal(snapshot.approvalStatus, 'PENDING'); await text(snapshot.full_name);
    const posts = signupPosts; await send('Page.reload'); await delay(800); await text('Đăng ký thành công!'); await text(email); assert.equal(signupPosts, posts); await noSession();
    const account = await User.findOne({ email }).populate('role_id'); assert.equal(account.status, 'PENDING'); assert.equal(account.approvalStatus, 'PENDING'); assert.equal(account.full_name, snapshot.full_name);
    const facility = await Facility.findOne({ vendor_id: account._id }); assert.equal(facility.status, 'PENDING');
    const blocked = await request('/auth/login', 'POST', { email, password }, null, 403); assert.equal(blocked.code, 'PENDING_APPROVAL'); assert.equal(blocked.token, undefined);
    return { id: String(account._id), email, role: roleName, facilityId: String(facility._id), facilityName: facility.name };
  };
  const reviewThroughUi = async (partner, reviewer = 'MANAGER', decision = 'APPROVED') => {
    await navigate('/'); await wait("location.pathname==='/'&&document.readyState==='complete'");
    await evaluate("localStorage.removeItem('travelio_token');localStorage.removeItem('travelio_user')");
    await navigate('/auth/login'); await wait("location.pathname==='/auth/login'&&document.querySelector('input[type=email]')!==null");
    await fill('input[type=email]', reviewer === 'ADMIN' ? adminEmail : managerEmail); await fill('input[placeholder="Enter your password"]', staffPassword); await submit(); await wait("location.pathname.startsWith('/admin')");
    await navigate('/admin/users?approvalStatus=PENDING&search=' + encodeURIComponent(partner.email)); await text(partner.email); await click('View registration'); await text('Partner registration details'); await text(partner.facilityName);
    if (decision === 'REJECTED') {
      await click('Reject registration'); await text('Vui lòng nhập lý do từ chối');
      await fill('textarea[aria-label="Rejection reason"]', 'QA: Thiếu giấy tờ kinh doanh'); await click('Reject registration');
    } else await click('Approve registration');
    await wait("!document.querySelector('[role=dialog]')");
    const active = await User.findById(partner.id); assert.equal(active.approvalStatus, decision); assert.equal(active.status, decision === 'APPROVED' ? 'ACTIVE' : 'INACTIVE'); assert.equal((await Facility.findById(partner.facilityId)).status, decision === 'APPROVED' ? 'ACTIVE' : 'INACTIVE');
    assert.equal(String(active.approvalReviewedBy), String(reviewer === 'ADMIN' ? adminId : managerId)); assert.ok(active.approvalReviewedAt instanceof Date);
    const detail = await request('/users/' + partner.id, 'GET', null, staffToken); assert.equal(detail.data.approvalStatus, decision); assert.equal(detail.data.facilities[0].name, partner.facilityName); assert.ok(detail.data.reviewedBy); assert.equal(detail.data.password_hash, undefined);
    if (decision === 'REJECTED') { assert.equal(active.rejectionReason, 'QA: Thiếu giấy tờ kinh doanh'); const blocked = await request('/auth/login', 'POST', { email: partner.email, password }, null, 403); assert.equal(blocked.code, 'REGISTRATION_REJECTED'); assert.ok(blocked.message.includes(active.rejectionReason)); assert.equal(blocked.token, undefined); return; }
    const login = await request('/auth/login', 'POST', { email: partner.email, password }); assert.ok(login.token); assert.equal(login.user.status, 'ACTIVE'); assert.equal(login.user.approvalStatus, 'APPROVED');
    await request('/vendor/dashboard', 'GET', null, login.token);
    // Exercise the approved partner's real frontend dashboard, too.
    await navigate('/'); await wait("location.pathname==='/'&&document.readyState==='complete'"); await evaluate("localStorage.clear()"); await navigate('/auth/login'); await wait("document.querySelector('input[type=email]')!==null"); await fill('input[type=email]', partner.email); await fill('input[placeholder="Enter your password"]', password); await submit(); await wait("location.pathname==='/vendor'"); await text('Dashboard');
  };

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/auth/register'); await click('Attraction Vendor'); await step(1); await text('Account Information');
  for (const [key, value] of [['full_name', 'Vendor Approval QA'], ['email', vendorEmail], ['password', password], ['confirm_password', password]]) await fill('#vendor-' + key, value);
  await evaluate("document.querySelector('input[type=checkbox]').click()"); await submit(); await step(2);
  for (const [key, value] of [['facility_name', 'Travelio Tours Pending QA'], ['facility_address', '123 Test Street'], ['facility_city', 'Đà Nẵng'], ['phone', '0912345678']]) await fill('#vendor-' + key, value);
  await submit(); await step(3); await fill('[name="services.0.name"]', 'Vé chờ phê duyệt'); await fill('[name="services.0.location"]', 'Đà Nẵng'); await fill('[name="services.0.ticket_types.0.name"]', 'Người lớn'); await fill('[name="services.0.ticket_types.0.price"]', '150000');
  await click('+ Add Ticket Type'); await fill('[name="services.0.ticket_types.1.name"]', 'Trẻ em'); await fill('[name="services.0.ticket_types.1.price"]', '0');
  await click('+ Add Another Service'); await fill('[name="services.1.name"]', 'Vé bảo tàng QA'); await fill('[name="services.1.location"]', 'Đà Nẵng'); await fill('[name="services.1.ticket_types.0.name"]', 'Vé tiêu chuẩn'); await fill('[name="services.1.ticket_types.0.price"]', '50000');
  await submit(); await step(4); await click('Back'); await step(3); assert.equal(await evaluate("document.querySelector('[name=\"services.1.name\"]').value"), 'Vé bảo tàng QA'); await fill('[name="services.1.name"]', 'Vé bảo tàng QA đã sửa'); await submit(); await step(4); await text('Vé bảo tàng QA đã sửa'); await submit();
  const vendor = await verifyPending(vendorEmail, 'ACTIVITY_VENDOR', 'Travelio Tours Pending QA');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  const mobile = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(os.tmpdir(), 'travelio-pending-approval-mobile.png'), Buffer.from(mobile.data, 'base64'));
  await click('Back to Home'); await wait("location.pathname==='/'"); await navigate('/partner/registration-pending'); await text('Đăng ký thành công!'); await click('Go to Login'); await wait("location.pathname==='/auth/login'&&document.querySelector('input[type=email]')!==null");
  assert.equal(await evaluate("document.querySelector('input[type=email]').value"), vendorEmail); await fill('input[placeholder="Enter your password"]', password); await submit(); await text('Tài khoản đang chờ Admin hoặc Manager xét duyệt'); await noSession();
  pass('Attraction Vendor wizard -> Pending page; correct public info; refresh without repost; Home/Login links; blocked login; mobile 390px');
  const vendorServices = await Service.find({ facility_id: vendor.facilityId }).sort({ created_at: 1 }); assert.equal(vendorServices.length, 2); const ticket = vendorServices.find(service => service.name === 'Vé chờ phê duyệt'); assert.deepEqual(ticket.ticket_types.map(type => type.price), [150000, 0]); assert.ok(vendorServices.some(service => service.name === 'Vé bảo tàng QA đã sửa'));
  await reviewThroughUi(vendor); pass('Manager reviews full Vendor profile and approves; multiple services/ticket types including price 0 saved; login/API/UI dashboard succeed');

  await navigate('/'); await wait("location.pathname==='/'&&document.readyState==='complete'"); await evaluate("localStorage.clear();sessionStorage.removeItem('travelio_pending_registration')");
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/auth/register'); await click('Hotel Owner'); await step(1); await text('Account Information'); assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuemax')"), '9');
  assert.equal(await evaluate("document.querySelector('input[placeholder^=\"Nhập địa chỉ đầy đủ\"]')"), null); await click('Continue'); await wait("document.querySelector('[aria-invalid=true]')!==null"); await step(1); assert.equal(signupPosts, 1);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  for (const [key, value] of [['full_name', 'Hotel Approval QA'], ['email', hotelEmail], ['password', password], ['confirm_password', 'incorrect']]) await fill('#vendor-' + key, value);
  await evaluate("document.querySelector('input[type=checkbox]').click()"); await click('Continue'); await step(1); await wait("document.querySelector('#vendor-confirm_password').getAttribute('aria-invalid')==='true'"); await fill('#vendor-confirm_password', password); await click('Continue'); await step(2); await text('Vị trí');
  assert.equal(await User.countDocuments({ email: hotelEmail }), 0); assert.equal(signupPosts, 1); await click('Quay trở lại'); await step(1); assert.equal(await evaluate("document.querySelector('#vendor-email').value"), hotelEmail); assert.equal(await evaluate("document.querySelector('#vendor-password').value"), password);
  const accountScreenshot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(os.tmpdir(), 'travelio-hotel-account-mobile.png'), Buffer.from(accountScreenshot.data, 'base64'));
  await click('Continue'); await step(2); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await fill('input[placeholder^="Nhập địa chỉ đầy đủ"]', '123 Test Street, Đà Nẵng'); await click('Tiếp theo'); await step(3); await click('Tiếp theo'); await step(4); await click('Tiếp theo'); await step(5);
  await text('Hình ảnh phòng nghỉ');
  const files = [0, 1, 2].map(i => { const name = path.join(temp, `hotel-${i}.png`); fs.copyFileSync(path.join(__dirname, '../../frontend/src/assets/hero.png'), name); return name; });
  const document = await send('DOM.getDocument'); const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type=file]' }); assert.ok(input.nodeId); await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files });
  await wait("document.querySelector('section[aria-label=\"Hình ảnh phòng\"]')?.querySelectorAll('img').length===3"); await click('Tiếp theo'); await click('Tiếp theo'); await fill('input[placeholder="VD: Grand Tourane Hotel Danang"]', 'Hotel Pending Approval QA'); await click('Tiếp theo');
  assert.equal(await evaluate("document.querySelector('input[placeholder=\"trantrungquan2904@gmail.com\"]').value"), hotelEmail); assert.equal(await evaluate("document.querySelector('input[type=password]')"), null); await click('Tiếp theo'); await step(9);
  await evaluate("[...document.querySelectorAll('input[type=checkbox]')].filter(e=>!e.checked).forEach(e=>e.click())"); await click('Đăng tải');
  const hotel = await verifyPending(hotelEmail, 'HOTEL_OWNER', 'Hotel Pending Approval QA');
  const desktop = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(os.tmpdir(), 'travelio-pending-approval-desktop.png'), Buffer.from(desktop.data, 'base64'));
  pass('Sign Up -> Hotel Owner Account Information is step 1/9; field validation/back preserves data; no early account/request; all 8 original steps retained; real Cloudinary photos; Pending page with full name; mobile/desktop');
  await reviewThroughUi(hotel, withAdmin ? 'ADMIN' : 'MANAGER'); pass(`${withAdmin ? 'Admin' : 'Manager'} reviews and approves Hotel Owner; account/hotel APPROVED and active; reviewer/time saved; login/API/UI dashboard succeed`);

  const upgrade = await request('/auth/become-partner', 'POST', { role_name: 'ACTIVITY_VENDOR', agree_terms: true, facility_name: 'Customer Upgrade Pending QA', facility_address: '123 Test', facility_city: 'Đà Nẵng', phone: '0912345678', business_type: 'TICKET', services: [{ name: 'Vé nâng cấp', base_price: 100000 }] }, customer.token);
  assert.equal(upgrade.user.status, 'PENDING'); assert.equal(upgrade.token, undefined);
  const oldSession = await request('/auth/me', 'GET', null, customer.token, 403); assert.equal(oldSession.code, 'PENDING_APPROVAL');
  await request('/vendor/dashboard', 'GET', null, customer.token, 403);
  pass('Existing Customer conversion becomes Pending and old customer token stops working');
  const convertedFacility = await Facility.findOne({ vendor_id: customer.user.id });
  await reviewThroughUi({ id: customer.user.id, email: customerEmail, facilityId: String(convertedFacility._id), facilityName: convertedFacility.name }, 'MANAGER', 'REJECTED');
  await request('/vendor/dashboard', 'GET', null, customer.token, 403);
  pass('Manager Reject requires reason, persists reviewer/time, refuses rejected login and old-token dashboard');
  const hotelPayload = browserRequests.find(item => item.payload.role_name === 'HOTEL_OWNER').payload;
  const rejectedHotelEmail = `approval-hotel-rejected-${stamp}@example.com`;
  const rejectedHotel = await request('/auth/register', 'POST', { ...hotelPayload, email: rejectedHotelEmail, password, confirm_password: password, approvalStatus: 'APPROVED' }, null, 201);
  assert.equal(rejectedHotel.user.approvalStatus, 'PENDING'); assert.equal(rejectedHotel.token, undefined);
  await request('/admin/users/' + rejectedHotel.user.id + '/status', 'PATCH', { approvalStatus: 'REJECTED' }, staffToken, 400);
  await request('/admin/users/' + rejectedHotel.user.id + '/status', 'PATCH', { approvalStatus: 'REJECTED', reason: 'QA: Hồ sơ khách sạn chưa đầy đủ' }, staffToken);
  const denied = await request('/auth/login', 'POST', { email: rejectedHotelEmail, password }, null, 403); assert.equal(denied.code, 'REGISTRATION_REJECTED'); assert.ok(denied.message.includes('Hồ sơ khách sạn chưa đầy đủ'));
  await request('/admin/users/' + rejectedHotel.user.id + '/status', 'PATCH', { approvalStatus: 'APPROVED' }, staffToken, 409);
  const partnerLogin = await request('/auth/login', 'POST', { email: vendorEmail, password }); await request('/users/' + vendor.id, 'PATCH', { approvalStatus: 'APPROVED' }, partnerLogin.token, 400);
  pass('Hotel rejection blocks login; direct API cannot self-approve; registration ignores forged approval; repeat review returns 409');
  assert.deepEqual(exceptions, []); assert.equal(signupPosts, 2);
  assert.ok(browserRequests.every(item => item.httpStatus === 201));
  const evidence = { at: new Date().toISOString(), database: mongoose.connection.name, checks, adminReviewTested: withAdmin, signupPosts, partners: [vendor, hotel], customerUpgradeEmail: customerEmail, rejectedHotelEmail, browserRequests, createdNewDatabase: false, pendingTokensIssued: 0, browserExceptions: exceptions };
  fs.writeFileSync(path.join(__dirname, '../test/partner-approval-results.json'), JSON.stringify(evidence, null, 2) + '\n'); console.log(JSON.stringify(evidence, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  clearInterval(keepAlive); socket?.close(); chrome?.kill();
  // Remove only the privileged QA account created by this run.
  if (managerId) await User.deleteOne({ _id: managerId, email: managerEmail }).catch(error => console.error(error.message));
  if (adminId) await User.deleteOne({ _id: adminId, email: adminEmail }).catch(error => console.error(error.message));
  await mongoose.disconnect();
});
