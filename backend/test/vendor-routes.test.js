const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'vendor-routes-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/vendor-routes-test';
const express = require('express');
const { User, Facility } = require('../src/models');
const { generateToken } = require('../src/middlewares/authMiddleware');
const routes = require('../src/routes/vendor.routes');
const authRoutes = require('../src/routes/auth.routes');
const { draftSetup } = require('./partner-fixtures.cjs');

test('HTTP API xác thực token, vai trò hiện tại và quyền sở hữu dữ liệu', async () => {
  let role = 'ACTIVITY_VENDOR';
  const actorId = '507f1f77bcf86cd799439011';
  mock.method(User, 'findById', () => ({ select: () => ({ populate: async () => ({ status: 'ACTIVE', role_id: { role_name: role } }) }) }));
  mock.method(Facility, 'create', async (payload) => ({ ...payload, _id: '507f1f77bcf86cd799439012' }));
  mock.method(Facility, 'findOne', async () => null);
  const app = express();
  app.use(express.json());
  app.use('/api/vendor', routes);
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/vendor/attractions`;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${generateToken({ id: actorId, role: 'ACTIVITY_VENDOR' })}` };
  const body = JSON.stringify({ name: 'Điểm tham quan', city: 'Đà Nẵng', address: '123 Trần Phú' });
  try {
    assert.equal((await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })).status, 401);
    role = 'HOTEL_OWNER';
    assert.equal((await fetch(url, { method: 'POST', body, headers })).status, 403);
    role = 'ACTIVITY_VENDOR';
    const response = await fetch(url, { method: 'POST', body, headers });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.success, true);
    assert.equal(result.data.vendor_id, actorId);
    assert.equal((await fetch(`${url}/507f1f77bcf86cd799439012`, { method: 'PUT', body, headers })).status, 404);
    const qrUrl = url.replace('/attractions', '/qr/verify');
    assert.equal((await fetch(qrUrl, { method: 'POST', body: '{}', headers })).status, 403);
    role = 'HOTEL_OWNER';
    // Hotel Owner still reaches its QR handler (400 missing code, rather than 403).
    assert.equal((await fetch(qrUrl, { method: 'POST', body: '{}', headers })).status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  }
});

test('HTTP partner signup requires email verification and returns only a draft summary, never a business token', async () => {
  draftSetup();
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/auth`;
  try {
    const response = await fetch(`${url}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'Vendor', email: 'vendor@example.com', password: 'password123', confirm_password: 'password123', agree_terms: true, role_name: 'ACTIVITY_VENDOR', facility_name: 'Vendor Business', facility_address: '123 Trần Phú', facility_city: 'Đà Nẵng', phone: '0912345678', business_type: 'ATTRACTION', services: [{ name: 'Vé miễn phí', base_price: 0 }] })
    });
    const result = await response.json();
    assert.equal(response.status, 202);
    assert.equal(Object.hasOwn(result, 'token'), false);
    assert.equal(result.user, undefined);
    assert.equal(result.verificationRequired, true);
    assert.equal(result.registration.status, 'DRAFT');
    assert.equal(result.registration.role, 'ACTIVITY_VENDOR');
    assert.equal(result.registration.password_hash, undefined);
    assert.equal((await fetch(`${url}/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  }
});
