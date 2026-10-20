const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
process.env.JWT_SECRET = 'isolated-partner-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/isolated_partner_test';
process.env.CLOUDINARY_CLOUD_NAME = 'travelio-test';
const mongoose = require('mongoose');
const express = require('express');
const { User, Role, Facility, Service, FacilityImage, Booking, AuditLog } = require('../src/models');
const Application = require('../src/models/PartnerApplication');
const Document = require('../src/models/PartnerDocument');
const email = require('../src/services/email.service');
const policy = require('../src/services/partnerPolicy');
const applications = require('../src/services/partnerApplication.service');
const { generateToken } = require('../src/middlewares/authMiddleware');
const binary = process.env.PARTNER_TEST_MONGOD || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';

const business = {
  facility_name: 'Demo Travel', facility_address: '123 Test Street', facility_city: 'Da Nang', phone: '0912345678', business_type: 'TOUR',
  services: [{ name: 'Demo tour', service_category: 'TOUR', location: 'Hoi An', pricing_unit: 'PERSON', ticket_types: [{ name: 'Adult', price: 150000 }, { name: 'Free', price: 0 }] }],
};
const profile = {
  entity_type: 'COMPANY', legal_name: 'Demo Company', registered_address: '123 Test Street', registration_number: 'DEMO-001', tax_number: 'DEMO-TAX',
  representative_name: 'Demo Owner', representative_title: 'Director', authority: 'OWNER', supply_type: 'DIRECT_OPERATOR', operator_name: 'Demo Operator', accommodation_type: 'Hotel',
};
const consents = { version: policy.TERMS_VERSION, authority: true, agreement: true, privacy: true };
const checklist = Object.fromEntries(policy.CHECKS.map(key => [key, true]));
const signup = (emailAddress, role = 'ACTIVITY_VENDOR') => ({ ...business, full_name: 'Demo Owner', email: emailAddress, password: 'TravelioTest123', confirm_password: 'TravelioTest123', agree_terms: true, role_name: role });

test('conditional evidence matrix, consent, business validation and upload content validation', () => {
  assert.deepEqual(policy.requiredDocuments({ entity_type: 'INDIVIDUAL', authority: 'OWNER' }), ['AUTHORITY_PROOF', 'IDENTITY_PROOF']);
  assert.deepEqual(policy.requiredDocuments({ entity_type: 'HOUSEHOLD', authority: 'AUTHORIZED', requires_license: true, requires_insurance: true }), ['AUTHORITY_PROOF', 'BUSINESS_REGISTRATION', 'AUTHORIZATION', 'LICENSE', 'INSURANCE']);
  assert.throws(() => policy.normalizeBusiness({ ...business, services: [] }, 'ACTIVITY_VENDOR'), { statusCode: 400 });
  const normalized = policy.normalizeBusiness({ ...business, role_id: 'ADMIN', status: 'APPROVED', password: 'secret' }, 'ACTIVITY_VENDOR');
  for (const key of ['password', 'role_id', 'status']) assert.equal(normalized[key], undefined);
  assert.equal(normalized.services[0].ticket_types[1].price, 0);
  assert.throws(() => policy.normalizeProfile({ ...profile, tax_number: '' }, 'HOTEL_OWNER', true), { statusCode: 400 });
  const app = { business: normalized, role: 'ACTIVITY_VENDOR', profile, documents: [], required_documents: [], consent: consents };
  assert.throws(() => policy.validateSubmission(app), error => error.errors.some(field => field.field === 'documents.AUTHORITY_PROOF'));
  app.documents = [{ kind: 'BUSINESS_REGISTRATION' }, { kind: 'AUTHORITY_PROOF' }];
  assert.doesNotThrow(() => policy.validateSubmission(app));
  for (const consent of [null, { ...consents, version: 'old' }, { ...consents, authority: false }]) {
    assert.throws(() => policy.validateSubmission({ ...app, consent }), { statusCode: 400 });
  }
  for (const bytes of [Buffer.from('<html>fake document</html>'), Buffer.from('%PDF-1.4 incomplete')]) {
    assert.throws(() => applications.validateFile({ buffer: bytes, size: bytes.length, mimetype: 'application/pdf' }), { statusCode: 400 });
  }
});

test('isolated replica set: partner draft, OTP, private evidence, supplementation, review and atomic publication', { skip: !fs.existsSync(binary), timeout: 90000 }, async t => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-partner-app-test-'));
  const mongo = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'partnerTest', '--quiet', '--logpath', path.join(directory, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  const bootstrap = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  let server;
  try {
    for (let i = 0; i < 40; i++) {
      try { await bootstrap.connect(); break; } catch (e) { if (i === 39) throw e; await delay(100); }
    }
    await bootstrap.db('admin').command({ replSetInitiate: { _id: 'partnerTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    for (let i = 0; i < 150; i++) {
      if ((await bootstrap.db('admin').command({ hello: 1 })).isWritablePrimary) break;
      if (i === 149) throw Error('Temporary replica set did not become primary');
      await delay(100);
    }
    await bootstrap.close();
    await mongoose.connect(`mongodb://127.0.0.1:${port}/partner_app_test?replicaSet=partnerTest`, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), Role.init(), Facility.init(), Service.init(), Booking.init(), Application.init(), Document.init(), AuditLog.init()]);
    const roles = await Role.create(['CUSTOMER', 'HOTEL_OWNER', 'ACTIVITY_VENDOR', 'ADMIN', 'MANAGER'].map(role_name => ({ role_name })));
    const role = name => roles.find(item => item.role_name === name)._id;
    const manager = await User.create({ full_name: 'Demo Manager', email: 'manager@example.test', password_hash: 'not-used', role_id: role('MANAGER'), status: 'ACTIVE' });
    const outsider = await User.create({ full_name: 'Other Customer', email: 'other@example.test', password_hash: 'not-used', role_id: role('CUSTOMER'), status: 'ACTIVE', is_verified: true });
    const managerToken = generateToken({ id: manager._id, role: 'MANAGER' });
    const outsiderToken = generateToken({ id: outsider._id, role: 'CUSTOMER' });
    const codes = new Map();
    mock.method(email, 'assertSmtpConfigured', () => {});
    mock.method(email, 'sendOtpEmail', async (address, code) => codes.set(address, code));
    let mailFails = false;
    mock.method(email, 'sendPartnerReviewEmail', async () => { if (mailFails) throw Error('Simulated mail failure'); });
    const app = express(); app.use(express.json());
    app.use('/api/auth', require('../src/routes/auth.routes'));
    app.use('/api/admin', require('../src/routes/admin.routes'));
    app.use('/api/users', require('../src/routes/user.routes'));
    app.use('/api/vendor', require('../src/routes/vendor.routes'));
    app.use('/api/facilities', require('../src/routes/facility.routes'));
    app.use('/api/bookings', require('../src/routes/booking.routes'));
    const frontend = path.resolve(__dirname, '../../frontend/dist');
    if (fs.existsSync(path.join(frontend, 'index.html'))) {
      app.use(express.static(frontend));
      app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(frontend, 'index.html')));
    }
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message, errors: error.errors || [] }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const api = '/auth/partner-applications';
    const request = async (route, method = 'GET', body, token) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, ...(await response.json()) };
    };
    const upload = async (token, version, kind, valid = true) => {
      const form = new FormData(); form.append('version', String(version)); form.append('kind', kind);
      form.append('document', new Blob([valid ? '%PDF-1.4\nDemo evidence only\n%%EOF\n' : '<html>not a pdf</html>'], { type: 'application/pdf' }), 'demo-evidence.pdf');
      const response = await fetch(base + api + '/mine/documents', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      return { status: response.status, ...(await response.json()) };
    };
    const saved = async (token, patch = {}) => {
      const current = await request(api + '/mine', 'GET', null, token); assert.equal(current.status, 200);
      const result = await request(api + '/mine', 'PUT', { version: current.data.version, profile, consent: consents, ...patch }, token);
      assert.equal(result.status, 200, result.message);
      return result.data;
    };
    let vendorToken, vendorId, vendorApp;
    await t.test('new partner stays customer/unverified, OTP does not grant business role, draft is server-side only', async () => {
      const response = await request('/auth/register', 'POST', { ...signup('vendor@example.test'), status: 'ACTIVE', approvalStatus: 'APPROVED', is_verified: true });
      assert.equal(response.status, 202, response.message); assert.equal(response.verificationRequired, true);
      assert.equal(response.registration.status, 'DRAFT'); assert.equal(response.token, undefined); assert.equal(response.user, undefined);
      const user = await User.findOne({ email: 'vendor@example.test' }).populate('role_id'); vendorId = user._id;
      assert.equal(user.role_id.role_name, 'CUSTOMER'); assert.equal(user.is_verified, false); assert.equal(user.status, 'ACTIVE');
      assert.equal(await Facility.countDocuments({}), 0); assert.equal(await Service.countDocuments({}), 0);
      assert.equal((await request('/auth/login', 'POST', { email: user.email, password: 'TravelioTest123' })).status, 403);
      const forged = generateToken({ id: user._id, role: 'HOTEL_OWNER' });
      assert.equal((await request(api + '/mine', 'GET', null, forged)).status, 403);
      assert.equal((await request('/auth/verify-email', 'POST', { email: user.email, otp: codes.get(user.email) })).status, 200);
      const login = await request('/auth/login', 'POST', { email: user.email, password: 'TravelioTest123' }); vendorToken = login.token;
      assert.equal(login.user.role, 'CUSTOMER'); assert.equal((await request('/vendor/dashboard', 'GET', null, vendorToken)).status, 403);
      vendorApp = (await request(api + '/mine', 'GET', null, vendorToken)).data;
      assert.equal(vendorApp.status, 'DRAFT'); assert.equal(vendorApp.business.services[0].ticket_types[1].price, 0);
    });
    await t.test('missing evidence/consent, forged review fields and stale edits are rejected', async () => {
      vendorApp = await saved(vendorToken, { consent: {}, status: 'APPROVED', reviewedBy: manager._id });
      assert.equal(vendorApp.status, 'DRAFT'); assert.equal(vendorApp.consent, null);
      assert.equal((await request(api + '/mine/submit', 'POST', { version: vendorApp.version }, vendorToken)).status, 400);
      assert.equal((await request(api + '/mine', 'PUT', { version: vendorApp.version - 1, profile }, vendorToken)).status, 409);
      assert.equal((await upload(vendorToken, vendorApp.version, 'AUTHORITY_PROOF', false)).status, 400);
      assert.equal(await Document.countDocuments({}), 0);
    });
    await t.test('private upload/download/delete enforce ownership, versions and authentication', async () => {
      const uploaded = await upload(vendorToken, vendorApp.version, 'AUTHORITY_PROOF'); assert.equal(uploaded.status, 201, uploaded.message); vendorApp = uploaded.data;
      const doc = vendorApp.documents[0];
      assert.equal((await fetch(base + api + '/documents/' + doc._id)).status, 401);
      assert.equal((await fetch(base + api + '/documents/' + doc._id, { headers: { Authorization: `Bearer ${outsiderToken}` } })).status, 403);
      for (const token of [vendorToken, managerToken]) {
        const response = await fetch(base + api + '/documents/' + doc._id, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.match(response.headers.get('content-disposition'), /^attachment/); assert.match(await response.text(), /Demo evidence/);
      }
      assert.equal((await request(api + '/mine/documents/' + doc._id, 'DELETE', { version: vendorApp.version }, outsiderToken)).status, 404);
      assert.equal((await request(api + '/mine/documents/' + doc._id, 'DELETE', { version: vendorApp.version - 1 }, vendorToken)).status, 409);
      const deleted = await request(api + '/mine/documents/' + doc._id, 'DELETE', { version: vendorApp.version }, vendorToken); assert.equal(deleted.status, 200); vendorApp = deleted.data;
      assert.equal(await Document.countDocuments({}), 0);
      for (const kind of ['AUTHORITY_PROOF', 'BUSINESS_REGISTRATION']) { const result = await upload(vendorToken, vendorApp.version, kind); assert.equal(result.status, 201); vendorApp = result.data; }
      const stored = await Document.findOne({ application_id: vendorApp._id }).lean(); assert.equal(stored.data, undefined);
    });
    await t.test('submission locks evidence, preserves customer access and prevents generic role/status bypasses', async () => {
      vendorApp = await saved(vendorToken);
      const result = await request(api + '/mine/submit', 'POST', { version: vendorApp.version }, vendorToken); assert.equal(result.status, 200, result.message); vendorApp = result.data;
      assert.equal(vendorApp.status, 'PENDING'); assert.equal(vendorApp.submitted_version, vendorApp.version);
      assert.equal((await request(api + '/mine', 'PUT', { version: vendorApp.version, profile }, vendorToken)).status, 409);
      assert.equal((await upload(vendorToken, vendorApp.version, 'INSURANCE')).status, 409);
      assert.equal((await request('/auth/me', 'GET', null, vendorToken)).data.role, 'CUSTOMER');
      assert.equal((await request('/vendor/dashboard', 'GET', null, vendorToken)).status, 403);
      assert.equal((await request('/admin/users/' + vendorId, 'PATCH', { role_name: 'HOTEL_OWNER' }, managerToken)).status, 409);
      assert.equal((await request('/admin/users/' + vendorId + '/status', 'PATCH', { approvalStatus: 'APPROVED' }, managerToken)).status, 409);
      assert.equal((await request('/users/' + vendorId, 'PATCH', { approvalStatus: 'APPROVED' }, vendorToken)).status, 400);
      assert.equal((await request('/admin/users', 'POST', { full_name: 'Bypass', email: 'bypass@example.test', password: 'TravelioTest123', role_name: 'HOTEL_OWNER' }, managerToken)).status, 400);
      assert.equal((await request('/users', 'POST', { full_name: 'Bypass', email: 'bypass@example.test', password: 'TravelioTest123', role_name: 'ACTIVITY_VENDOR' }, managerToken)).status, 400);
      assert.equal(await Facility.countDocuments({}), 0);
    });
    await t.test('review authorization, checklist, reasons, supplementation and resubmission', async () => {
      const route = api + '/reviews/' + vendorApp._id;
      assert.equal((await request(route, 'GET', null, outsiderToken)).status, 403);
      assert.equal((await request(route, 'POST', { version: vendorApp.version, status: 'APPROVED', checklist }, vendorToken)).status, 403);
      assert.equal((await request(route, 'POST', { version: vendorApp.version, status: 'APPROVED' }, managerToken)).status, 400);
      for (const status of ['REJECTED', 'NEEDS_ADDITIONAL_INFO']) assert.equal((await request(route, 'POST', { version: vendorApp.version, status }, managerToken)).status, 400);
      const result = await request(route, 'POST', { version: vendorApp.version, status: 'NEEDS_ADDITIONAL_INFO', reason: 'Please add insurance evidence', required_documents: ['INSURANCE'] }, managerToken); assert.equal(result.status, 200, result.message);
      vendorApp = result.data.application; assert.equal(vendorApp.status, 'NEEDS_ADDITIONAL_INFO');
      assert.equal((await request(api + '/reviews?status=NEEDS_ADDITIONAL_INFO', 'GET', null, managerToken)).data.total, 1);
      vendorApp = await saved(vendorToken);
      assert.equal((await request(api + '/mine/submit', 'POST', { version: vendorApp.version }, vendorToken)).status, 400);
      const uploaded = await upload(vendorToken, vendorApp.version, 'INSURANCE'); assert.equal(uploaded.status, 201); vendorApp = uploaded.data;
      const submitted = await request(api + '/mine/submit', 'POST', { version: vendorApp.version }, vendorToken); assert.equal(submitted.status, 200); vendorApp = submitted.data;
    });
    await t.test('concurrent approval grants business once; mail failure does not undo committed result', async () => {
      mailFails = true;
      const decisions = await Promise.all([1, 2].map(() => request(api + '/reviews/' + vendorApp._id, 'POST', { version: vendorApp.version, status: 'APPROVED', checklist }, managerToken)));
      assert.deepEqual(decisions.map(result => result.status).sort(), [200, 409]);
      assert.equal(decisions.find(result => result.status === 200).data.emailSent, false);
      const user = await User.findById(vendorId).populate('role_id'); assert.equal(user.role_id.role_name, 'ACTIVITY_VENDOR'); assert.equal(user.approvalStatus, 'APPROVED'); assert.equal(user.status, 'ACTIVE');
      assert.equal(await Facility.countDocuments({ vendor_id: vendorId, status: 'ACTIVE' }), 1);
      assert.equal(await Service.countDocuments({}), 1);
      const service = await Service.findOne({}); assert.equal(service.ticket_types[1].price, 0); assert.equal(service.type, 'TICKET');
      assert.equal(await AuditLog.countDocuments({ action: 'PARTNER_APPROVED', record_id: vendorApp._id }), 1);
      const login = await request('/auth/login', 'POST', { email: user.email, password: 'TravelioTest123' }); assert.equal(login.user.role, 'ACTIVITY_VENDOR');
      assert.equal((await request(api + '/mine', 'GET', null, vendorToken)).data.status, 'APPROVED');
      assert.equal((await request('/vendor/dashboard', 'GET', null, vendorToken)).status, 200);
      assert.equal((await request('/admin/users/' + vendorId, 'PATCH', { role_name: 'HOTEL_OWNER' }, managerToken)).status, 409);
      mailFails = false;
    });
    await t.test('existing customer starts hotel draft without changing login/role; rejection is final', async () => {
      const photos = [1, 2, 3].map(i => `https://res.cloudinary.com/travelio-test/image/upload/v1/room-${i}.jpg`);
      const hotel = { ...signup('other@example.test', 'HOTEL_OWNER'), rooms: [{ name: 'Double', price: 500000, photos, beds: [{ bed_type: 'Double Bed', count: 1 }] }], service_capacity: 2 };
      const response = await request('/auth/become-partner', 'POST', hotel, outsiderToken); assert.equal(response.status, 200, response.message); assert.equal(response.registration.status, 'DRAFT'); assert.equal(response.token, undefined);
      assert.equal((await request('/auth/me', 'GET', null, outsiderToken)).data.role, 'CUSTOMER');
      let hotelApp = (await request(api + '/mine', 'GET', null, outsiderToken)).data;
      assert.equal(hotelApp.business.rooms[0].photos.length, 3); assert.equal(await Facility.countDocuments({ vendor_id: outsider._id }), 0);
      for (const kind of ['AUTHORITY_PROOF', 'BUSINESS_REGISTRATION']) { const result = await upload(outsiderToken, hotelApp.version, kind); assert.equal(result.status, 201); hotelApp = result.data; }
      hotelApp = await saved(outsiderToken);
      hotelApp = (await request(api + '/mine/submit', 'POST', { version: hotelApp.version }, outsiderToken)).data;
      const result = await request(api + '/reviews/' + hotelApp._id, 'POST', { version: hotelApp.version, status: 'REJECTED', reason: 'Evidence cannot be verified in this review' }, managerToken); assert.equal(result.status, 200, result.message);
      assert.equal((await request(api + '/mine', 'PUT', { version: result.data.application.version, profile }, outsiderToken)).status, 409);
      assert.equal((await request('/auth/become-partner', 'POST', hotel, outsiderToken)).status, 409);
      assert.equal((await request('/auth/me', 'GET', null, outsiderToken)).data.role, 'CUSTOMER');
      assert.equal(await Facility.countDocuments({ vendor_id: outsider._id }), 0);
    });
    await t.test('transaction rollback prevents partial role, facility or approval on a business write failure', async () => {
      const user = await User.create({ full_name: 'Rollback Demo', email: 'rollback@example.test', password_hash: 'not-used', role_id: role('CUSTOMER'), status: 'ACTIVE', is_verified: true });
      const token = generateToken({ id: user._id, role: 'CUSTOMER' });
      const started = await request('/auth/become-partner', 'POST', signup('rollback@example.test'), token); assert.equal(started.status, 200);
      let draft = (await request(api + '/mine', 'GET', null, token)).data;
      for (const kind of ['AUTHORITY_PROOF', 'BUSINESS_REGISTRATION']) draft = (await upload(token, draft.version, kind)).data;
      draft = await saved(token); draft = (await request(api + '/mine/submit', 'POST', { version: draft.version }, token)).data;
      const original = Service.insertMany;
      const failing = mock.method(Service, 'insertMany', async () => { throw Error('Simulated service write failure'); });
      const result = await request(api + '/reviews/' + draft._id, 'POST', { version: draft.version, status: 'APPROVED', checklist }, managerToken); assert.equal(result.status, 500);
      failing.mock.restore(); assert.equal(Service.insertMany, original);
      assert.equal((await Application.findById(draft._id)).status, 'PENDING');
      assert.equal((await User.findById(user._id)).role_id.toString(), role('CUSTOMER').toString());
      assert.equal(await Facility.countDocuments({ vendor_id: user._id }), 0);
      assert.equal(await AuditLog.countDocuments({ action: 'PARTNER_APPROVED', record_id: draft._id }), 0);
    });
    await t.test('hotel evidence is conditional; draft cannot be searched, fetched or booked; approved rooms preserve their setup', async () => {
      const user = await User.create({ full_name: 'Hotel Demo', email: 'hotel-approved@example.test', password_hash: 'not-used', role_id: role('CUSTOMER'), status: 'ACTIVE', is_verified: true });
      const token = generateToken({ id: user._id, role: 'CUSTOMER' });
      const photos = [1, 2, 3].map(i => `https://res.cloudinary.com/travelio-test/image/upload/v1/hotel-${i}.jpg`);
      const hotel = { ...signup(user.email, 'HOTEL_OWNER'), rooms: [{ name: 'Garden Room', price: 320000, photos, beds: [{ bed_type: 'Queen Bed', count: 2 }] }], amenities: ['Demo Wi-Fi'], service_capacity: 4, bathrooms: 2, latitude: 16, longitude: 108 };
      const started = await request('/auth/become-partner', 'POST', hotel, token); assert.equal(started.status, 200, started.message);
      let draft = (await request(api + '/mine', 'GET', null, token)).data;
      assert.equal((await request('/facilities/' + draft._id)).status, 404);
      const search = await request('/facilities?type=HOTEL'); assert.equal(search.status, 200); assert.ok(!JSON.stringify(search).includes('Garden Room'));
      const checkIn = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
      const checkOut = new Date(Date.now() + 86400000 * 11).toISOString().slice(0, 10);
      const booking = await request('/bookings/rooms', 'POST', { service_id: draft._id, request_id: 'draft-hotel-booking', check_in: checkIn, check_out: checkOut, rooms: 1, guests: 2, guest_name: 'Demo Guest', guest_email: 'guest@example.test', guest_phone: '0912345678', agree_conditions: true }, token);
      assert.equal(booking.status, 409, booking.message); assert.equal(await Booking.countDocuments({}), 0);
      const individual = { ...profile, entity_type: 'INDIVIDUAL', authority: 'AUTHORIZED', registration_number: '', tax_number: '' };
      for (const kind of ['AUTHORITY_PROOF', 'IDENTITY_PROOF', 'AUTHORIZATION']) draft = (await upload(token, draft.version, kind)).data;
      draft = await saved(token, { profile: individual });
      draft = (await request(api + '/mine/submit', 'POST', { version: draft.version }, token)).data;
      const result = await request(api + '/reviews/' + draft._id, 'POST', { version: draft.version, status: 'APPROVED', checklist }, managerToken); assert.equal(result.status, 200, result.message);
      const facility = await Facility.findOne({ vendor_id: user._id }); assert.equal(facility.type, 'HOTEL'); assert.equal(facility.status, 'ACTIVE'); assert.equal(facility.latitude, 16);
      const room = await Service.findOne({ facility_id: facility._id }); assert.equal(room.name, 'Garden Room'); assert.equal(room.base_price, 320000); assert.equal(room.capacity, 4); assert.equal(room.bathrooms, 2); assert.equal(room.bedrooms[0].beds[0].count, 2); assert.deepEqual([...room.photos], photos);
      assert.equal(await FacilityImage.countDocuments({ facility_id: facility._id }), 3);
      assert.equal((await request('/facilities/' + facility._id)).status, 200);
      assert.equal((await User.findById(user._id).populate('role_id')).role_id.role_name, 'HOTEL_OWNER');
    });
    await t.test('self review and revoked reviewer permissions are denied', async () => {
      const own = await Application.create({ user_id: manager._id, role: 'ACTIVITY_VENDOR', business: policy.normalizeBusiness(business, 'ACTIVITY_VENDOR'), status: 'PENDING', version: 1, submitted_version: 1 });
      const self = await request(api + '/reviews/' + own._id, 'POST', { version: 1, status: 'REJECTED', reason: 'self attempt' }, managerToken); assert.equal(self.status, 403);
      const managerRole = roles.find(item => item.role_name === 'MANAGER');
      await Role.updateOne({ _id: managerRole._id }, { $set: { permissions: ['users.view'] } });
      assert.equal((await request(api + '/reviews', 'GET', null, managerToken)).status, 403);
      await Role.updateOne({ _id: managerRole._id }, { $unset: { permissions: 1 } });
    });
    await t.test('failed OTP delivery preserves a recoverable draft and does not grant access', async () => {
      const failedSend = mock.method(email, 'sendOtpEmail', async () => { throw Error('Simulated OTP delivery failure'); });
      const response = await request('/auth/register', 'POST', signup('otp-failure@example.test'));
      assert.equal(response.status, 202); assert.equal(response.emailSent, false); assert.equal(response.token, undefined);
      failedSend.mock.restore();
      const user = await User.findOne({ email: 'otp-failure@example.test' });
      assert.equal(user.is_verified, false); assert.equal((await Application.findOne({ user_id: user._id })).status, 'DRAFT');
      assert.equal(await Facility.countDocuments({ vendor_id: user._id }), 0);
      await User.updateOne({ _id: user._id }, { $set: { verification_otp_last_sent_at: new Date(Date.now() - 61000) } });
      const resent = await request('/auth/resend-verification', 'POST', { email: user.email }); assert.equal(resent.status, 202);
      assert.equal((await request('/auth/verify-email', 'POST', { email: user.email, otp: codes.get(user.email) })).status, 200);
      assert.equal((await Application.findOne({ user_id: user._id })).status, 'DRAFT');
    });
    const chromeBinary = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    await t.test('browser: save/reload draft, upload evidence, submit, mobile layout and admin approval', { skip: !fs.existsSync(chromeBinary) || !fs.existsSync(path.join(frontend, 'index.html')) }, async () => {
      const user = await User.create({ full_name: 'Browser Applicant', email: 'browser@example.test', password_hash: 'not-used', role_id: role('CUSTOMER'), status: 'ACTIVE', is_verified: true });
      const token = generateToken({ id: user._id, role: 'CUSTOMER' });
      assert.equal((await request('/auth/become-partner', 'POST', signup(user.email), token)).status, 200);
      const browser = require('./partner-browser.cjs');
      await browser({ origin: base.replace(/\/api$/, ''), directory, chromeBinary,
        applicant: { token, user: (await request('/auth/me', 'GET', null, token)).data },
        reviewer: { token: managerToken, user: (await request('/auth/me', 'GET', null, managerToken)).data },
        verifyResult: async () => {
          assert.equal((await Application.findOne({ user_id: user._id })).status, 'APPROVED');
          assert.equal((await User.findById(user._id).populate('role_id')).role_id.role_name, 'ACTIVITY_VENDOR');
        },
      });
    });
  } finally {
    mock.restoreAll();
    if (server) await new Promise(resolve => server.close(resolve));
    await bootstrap.close().catch(() => {});
    if (mongoose.connection.readyState === 1) { try { await mongoose.connection.db.admin().command({ shutdown: 1 }); } catch {} }
    await mongoose.disconnect();
    mongo.kill();
    await new Promise(resolve => mongo.exitCode !== null ? resolve() : mongo.once('exit', resolve));
    const target = path.resolve(directory);
    const temp = path.resolve(os.tmpdir()) + path.sep;
    if (target.startsWith(temp) && path.basename(target).startsWith('travelio-partner-app-test-')) fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
