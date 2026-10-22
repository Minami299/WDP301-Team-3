const { test, mock, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'partner-approval-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-approval-tests';
const mongoose = require('mongoose');
const express = require('express');
const { User, Role, Facility, Service } = require('../src/models');
const auth = require('../src/services/auth.service');
const admin = require('../src/services/admin.service');
const { hashPassword } = require('../src/utils/password');
const { generateToken } = require('../src/middlewares/authMiddleware');
const authRoutes = require('../src/routes/auth.routes');
const vendorRoutes = require('../src/routes/vendor.routes');
const id = '507f1f77bcf86cd799439011', roleId = '507f1f77bcf86cd799439012', facilityId = '507f1f77bcf86cd799439013';
const Application = require('../src/models/PartnerApplication');
const emailService = require('../src/services/email.service');
beforeEach(() => {
  mock.method(Application, 'findOne', () => ({ select: async () => null }));
  mock.method(emailService, 'sendPartnerReviewEmail', async () => {});
});
afterEach(() => mock.restoreAll());

test('hotel Account Information rejects invalid credentials, missing confirmation and missing terms before writing', async () => {
  const create = mock.method(User, 'create', async () => { throw Error('No account before the final valid submission'); });
  const payload = { role_name: 'HOTEL_OWNER', full_name: 'Hotel QA', email: 'hotel@example.com', password: 'ValidPassword123', confirm_password: 'ValidPassword123', agree_terms: true };
  for (const [patch, field] of [[{ full_name: '' }, 'full_name'], [{ email: 'invalid' }, 'email'], [{ password: '12345678' }, 'password'], [{ confirm_password: '' }, 'confirm_password'], [{ agree_terms: false }, 'agree_terms']]) {
    await assert.rejects(auth.register({ ...payload, ...patch }), error => error.statusCode === 400 && error.errors.some(item => item.field === field));
  }
  assert.equal(create.mock.callCount(), 0);
});

test('explicit Pending/Rejected override ACTIVE; approval never overrides a lock; legacy accounts retain the ACTIVE rule', async () => {
  const { assertActiveAccount, approvalStatusOf } = require('../src/utils/accountStatus');
  for (const role of ['HOTEL_OWNER', 'ACTIVITY_VENDOR']) {
    const user = { status: 'ACTIVE', role_id: { role_name: role } };
    assert.equal(approvalStatusOf(user), 'APPROVED'); assert.doesNotThrow(() => assertActiveAccount(user));
    assert.throws(() => assertActiveAccount({ ...user, approvalStatus: 'PENDING' }), { code: 'PENDING_APPROVAL' });
    assert.throws(() => assertActiveAccount({ ...user, approvalStatus: 'REJECTED', rejectionReason: 'Hồ sơ chưa đầy đủ' }), { code: 'REGISTRATION_REJECTED' });
    assert.throws(() => assertActiveAccount({ ...user, approvalStatus: 'APPROVED', status: 'LOCKED' }), { statusCode: 403 });
    assert.throws(() => assertActiveAccount({ ...user, status: 'INACTIVE' }), { statusCode: 403 });
  }
  assert.doesNotThrow(() => assertActiveAccount({ status: 'ACTIVE', role_id: { role_name: 'CUSTOMER' } }));
});

test('reject requires reason and permission, records reviewer/time, blocks concurrent review and keeps self-service fields protected', async () => {
  const current = { _id: id, status: 'PENDING', approvalStatus: 'PENDING', role_id: { role_name: 'HOTEL_OWNER' } };
  let permissions = [];
  mock.method(User, 'findById', target => ({ select: () => ({ populate: async () => target === id ? current : { role_id: { role_name: 'MANAGER', permissions } } }) }));
  const actor = { id: roleId, role: 'MANAGER' };
  await assert.rejects(admin.updateUser(actor, id, { approvalStatus: 'REJECTED', reason: 'Missing info' }), { statusCode: 403 });
  permissions = ['users.lock'];
  await assert.rejects(admin.updateUser(actor, id, { approvalStatus: 'REJECTED' }), { statusCode: 400 });
  const session = {}; mock.method(mongoose.connection, 'transaction', async fn => fn(session));
  const update = mock.method(User, 'findOneAndUpdate', async (filter, payload, options) => { assert.equal(options.session, session); assert.equal(payload.$set.approvalStatus, 'REJECTED'); assert.equal(payload.$set.status, 'INACTIVE'); assert.equal(payload.$set.rejectionReason, 'Missing info'); assert.equal(payload.$set.approvalReviewedBy, roleId); assert.ok(payload.$set.approvalReviewedAt instanceof Date); return current; });
  const facility = mock.method(Facility, 'updateMany', async (filter, payload) => assert.equal(payload.$set.status, 'INACTIVE'));
  await admin.updateUser(actor, id, { approvalStatus: 'REJECTED', reason: '  Missing info  ' });
  mock.method(User, 'findOneAndUpdate', async () => null);
  await assert.rejects(admin.updateUser(actor, id, { approvalStatus: 'APPROVED' }), { statusCode: 409 });
  assert.equal(facility.mock.callCount(), 1); assert.equal(update.mock.callCount(), 1);
  const users = require('../src/services/user.service');
  await assert.rejects(users.updateUser({ id, role: 'HOTEL_OWNER' }, id, { approvalStatus: 'APPROVED' }), { statusCode: 400 });
  await assert.rejects(users.updateMyProfile(id, { approvalStatus: 'APPROVED' }), { statusCode: 400 });
});

test('hotel draft rejects invalid room data before creating a user or facility', async () => {
  const create = mock.method(User, 'create', async () => { throw Error('Do not create invalid accounts'); });
  const payload = { full_name: 'Hotel Owner', email: 'hotel@example.com', password: 'TravelioTest123', confirm_password: 'TravelioTest123', agree_terms: true, role_name: 'HOTEL_OWNER', facility_name: 'Demo Hotel', facility_city: 'Da Nang', facility_address: '123 Test Street', phone: '0912345678' };
  for (const rooms of [undefined, [], [{ name: '', price: -1, photos: [], beds: [] }]]) {
    await assert.rejects(auth.register({ ...payload, rooms }), { statusCode: 400 });
  }
  assert.equal(create.mock.callCount(), 0);
});

test('Pending partners cannot log in; wrong password stays 401; approved partners can log in', async () => {
  const current = { _id: id, full_name: 'Partner', email: 'partner@example.com', password_hash: await hashPassword('TravelioTest123'), status: 'PENDING', role_id: { role_name: 'ACTIVITY_VENDOR' } };
  mock.method(User, 'findOne', () => ({ populate: async () => current }));
  mock.method(Facility, 'findOne', () => ({ select: () => ({ sort: async () => ({ name: 'Legacy business' }) }) }));
  await assert.rejects(auth.login({ email: current.email, password: 'wrong' }), { statusCode: 401 });
  for (const role of ['HOTEL_OWNER', 'ACTIVITY_VENDOR']) {
    current.role_id.role_name = role;
    await assert.rejects(auth.login({ email: current.email, password: 'TravelioTest123' }), { statusCode: 403, code: 'PENDING_APPROVAL' });
    current.status = 'ACTIVE'; assert.ok((await auth.login({ email: current.email, password: 'TravelioTest123' })).token); current.status = 'PENDING';
  }
});

test('old authenticated tokens cannot access me or Partner Dashboard while Pending', async () => {
  const user = { status: 'ACTIVE', approvalStatus: 'PENDING', role_id: { role_name: 'HOTEL_OWNER' } };
  mock.method(User, 'findById', () => ({ select: () => ({ populate: async () => user }) }));
  const app = express(); app.use('/auth', authRoutes); app.use('/vendor', vendorRoutes);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const headers = { Authorization: 'Bearer ' + generateToken({ id, role: 'CUSTOMER' }) };
    for (const [approvalStatus, code] of [['PENDING', 'PENDING_APPROVAL'], ['REJECTED', 'REGISTRATION_REJECTED']]) {
      user.approvalStatus = approvalStatus;
      for (const route of ['/auth/me', '/vendor/dashboard']) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { headers });
        assert.equal(response.status, 403); assert.equal((await response.json()).code, code);
      }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('only Admin or Manager may approve; user and pending facilities activate in one transaction', async () => {
  const current = { _id: id, status: 'PENDING', role_id: { role_name: 'ACTIVITY_VENDOR' } };
  mock.method(User, 'findById', target => ({ select: () => ({ populate: async () => target === id ? current : { role_id: { role_name: 'MANAGER', permissions: ['users.lock'] } } }) }));
  await assert.rejects(admin.setStatus({ id: roleId, role: 'CUSTOMER' }, id, 'ACTIVE'), { statusCode: 403 });
  const session = {};
  mock.method(mongoose.connection, 'transaction', async fn => fn(session));
  mock.method(User, 'findOneAndUpdate', async (filter, update, options) => { assert.equal(filter.$or[0].approvalStatus, 'PENDING'); assert.equal(options.session, session); assert.equal(update.$set.status, 'ACTIVE'); assert.equal(update.$set.approvalStatus, 'APPROVED'); assert.equal(update.$set.approvalReviewedBy, roleId); assert.ok(update.$set.approvalReviewedAt instanceof Date); return current; });
  const facilities = mock.method(Facility, 'updateMany', async (filter, update, options) => { assert.equal(filter.vendor_id, id); assert.equal(filter.status, 'PENDING'); assert.equal(update.$set.status, 'ACTIVE'); assert.equal(options.session, session); });
  for (const role of ['ADMIN', 'MANAGER']) await admin.setStatus({ id: roleId, role }, id, 'ACTIVE');
  assert.equal(facilities.mock.callCount(), 2);
});

test('pending confirmation storage whitelists public fields and survives refresh reads', async () => {
  const { registrationSummary, pendingRegistration } = await import('../../frontend/src/services/storage/pendingRegistration.js');
  const data = new Map(); const old = global.sessionStorage;
  global.sessionStorage = { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key), removeItem: key => data.delete(key) };
  try {
    const raw = { status: 'PENDING', approvalStatus: 'PENDING', full_name: 'Vendor QA', role: 'ACTIVITY_VENDOR', email: 'vendor@example.com', facility_name: 'Travelio Tours', password: 'Must not persist', token: 'Must not persist' };
    const summary = pendingRegistration.save(raw); assert.deepEqual(pendingRegistration.read(), summary);
    assert.ok(!JSON.stringify([...data.values()]).includes('Must not persist'));
    assert.equal(registrationSummary({ ...raw, status: 'ACTIVE' }), null);
    assert.equal(registrationSummary({ ...raw, role: 'CUSTOMER' }), null);
    pendingRegistration.clear(); assert.equal(pendingRegistration.read(), null);
  } finally { if (old === undefined) delete global.sessionStorage; else global.sessionStorage = old; }
});
