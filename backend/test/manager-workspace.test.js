const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
process.env.JWT_SECRET = 'isolated-manager-workspace-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/manager_workspace_test';
const mongoose = require('mongoose');
const express = require('express');
const ExcelJS = require('exceljs');
const { Role, User, Facility, Service, Booking, BookingDetail, Payment } = require('../src/models');
const { permissionsOf, DEFAULT_ROLE_PERMISSIONS } = require('../src/configs/permissions');
const { migrateStaffRoles } = require('../src/migrations/staffRoles');
const { generateToken, verifyToken, authorizeExactRoles } = require('../src/middlewares/authMiddleware');
const binary = process.env.MONGOD_BINARY || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
const period = { from: '2026-10-01', to: '2026-10-31' };

test('legacy grants cannot cross the responsibility boundary', () => {
  assert.deepEqual(permissionsOf({ role_name: 'ADMIN', permissions: ['users.view', 'revenue.view', 'roles.manage', 'vendor.dashboard'] }), ['users.view']);
  assert.deepEqual(permissionsOf({ role_name: 'MANAGER', permissions: ['users.update', 'partners.review'] }), ['partners.review']);
  assert.deepEqual(permissionsOf({ role_name: 'CUSTOMER', permissions: ['revenue.view'] }), []);
});

test('isolated MongoDB: staff policy, migration, hotel allocation, owner boundaries and filtered exports', { skip: !fs.existsSync(binary), timeout: 90000 }, async t => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-manager-'));
  const mongo = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet', '--logpath', path.join(directory, 'mongo.log')], { windowsHide: true, stdio: 'ignore' });
  let server;
  try {
    for (let i = 0; i < 40; i++) {
      try { await mongoose.connect(`mongodb://127.0.0.1:${port}/manager_workspace_test`, { serverSelectionTimeoutMS: 500 }); break; }
      catch (error) { if (i === 39) throw error; }
    }
    await Promise.all([Role, User, Facility, Service, Booking, BookingDetail, Payment].map(model => model.init()));
    const roles = await Role.create([
      { role_name: 'ADMIN', permissions: ['users.view', 'users.update', 'revenue.view', 'roles.manage', 'pricing.manage'] },
      { role_name: 'MANAGER', permissions: ['users.view', 'users.create', 'users.update', 'users.lock'] },
      { role_name: 'HOTEL_OWNER' }, { role_name: 'ACTIVITY_VENDOR' }, { role_name: 'CUSTOMER' },
    ]);
    const person = (name, role) => User.create({ full_name: name, email: `${name}@manager.test`, password_hash: 'unused', status: 'ACTIVE', is_verified: true, role_id: roles.find(item => item.role_name === role)._id });
    const admin = await person('admin', 'ADMIN'), manager = await person('manager', 'MANAGER');
    const owner = await person('owner', 'HOTEL_OWNER'), other = await person('other', 'HOTEL_OWNER'), buyer = await person('buyer', 'CUSTOMER');
    const app = express(); app.use(express.json());
    const routes = require('../src/routes/admin.routes');
    app.use('/api/admin', routes);
    app.use('/api/manager', verifyToken, authorizeExactRoles('MANAGER'), routes);
    app.use('/api/users', require('../src/routes/user.routes'));
    app.use('/api/vendor', require('../src/routes/vendor.routes'));
    app.use('/api/partner-applications', require('../src/routes/partnerApplication.routes'));
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = (endpoint, actor = manager, method = 'GET', body) => fetch(`${origin}/api${endpoint}`, { method, headers: { Authorization: `Bearer ${generateToken({ id: String(actor._id), role: 'ADMIN' })}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const read = async (query = {}, actor = manager, prefix = '/manager') => {
      const response = await request(`${prefix}/revenue?${new URLSearchParams({ ...period, ...query })}`, actor);
      const data = await response.json(); assert.equal(response.status, 200, data.message); return data.data;
    };
    await t.test('migration changes stored staff lists, is idempotent and grants no cross-role rights', async () => {
      const result = await migrateStaffRoles(Role); assert.equal(result.length, 2);
      const repeated = await migrateStaffRoles(Role); assert.ok(repeated.every(item => item.modified === 0));
      for (const name of ['ADMIN', 'MANAGER']) assert.deepEqual((await Role.findOne({ role_name: name })).permissions.toObject(), DEFAULT_ROLE_PERMISSIONS[name]);
    });
    await t.test('API matrix includes legacy URLs, exports, account writes, role edits and partner reviews', async () => {
      for (const endpoint of ['/admin/revenue', '/admin/revenue/export?format=xlsx', '/admin/analytics', '/admin/configs', '/admin/promotions', '/admin/settlements', '/admin/partners', '/manager/revenue', '/partner-applications/reviews']) assert.equal((await request(endpoint, admin)).status, 403, endpoint);
      for (const endpoint of ['/manager/revenue', '/manager/analytics', '/manager/configs', '/manager/promotions', '/manager/settlements', '/manager/partners', '/partner-applications/reviews']) assert.equal((await request(endpoint)).status, 200, endpoint);
      assert.equal((await request('/admin/revenue')).status, 200);
      assert.equal((await request('/admin/users', admin)).status, 200);
      assert.equal((await request('/users', manager)).status, 403);
      assert.equal((await request('/admin/users', manager)).status, 403);
      assert.equal((await request(`/users/${buyer._id}`, manager, 'PATCH', { full_name: 'Changed' })).status, 403);
      assert.equal((await request(`/admin/users/${manager._id}`, admin, 'PATCH', { password: 'Impersonate123' })).status, 403);
      assert.equal((await request(`/admin/users/${admin._id}`, admin, 'PATCH', { role_name: 'MANAGER' })).status, 403);
      assert.equal((await request('/admin/users', admin, 'POST', { email: 'newstaff@manager.test', full_name: 'Staff', password: 'Password123', role_name: 'MANAGER' })).status, 403);
      assert.equal((await request('/admin/users', admin, 'POST', { email: 'newbuyer@manager.test', full_name: 'Buyer', password: 'Password123' })).status, 201);
      assert.equal((await request(`/admin/roles/${roles[0]._id}/permissions`, admin, 'PUT', { permissions: ['revenue.view'] })).status, 403);
    });
    const venue = (name, vendor, type = 'HOTEL') => Facility.create({ name, vendor_id: vendor._id, type, city: 'Da Nang', address: 'Test', status: 'ACTIVE', commission_rate: 10 });
    const hotelA = await venue('Hotel A', owner), hotelB = await venue('Hotel B', owner), hotelC = await venue('Hotel C', other), zero = await venue('Hotel zero', owner), attraction = await venue('Attraction', other, 'ATTRACTION');
    const rooms = await Service.create([hotelA, hotelB, hotelC, attraction].map((facility, i) => ({ facility_id: facility._id, name: `Service ${i}`, type: i === 3 ? 'TICKET' : 'ROOM', base_price: 100000 })));
    const sale = async (code, lines, amounts, status = 'SUCCESS') => {
      const booking = await Booking.create({ user_id: buyer._id, guest_name: 'Guest', guest_email: 'guest@example.test', guest_phone: '0912345678', booking_code: code, total_amount: 100000 * lines.length, final_amount: amounts.reduce((a, b) => a + b, 0), status: status === 'REFUNDED' ? 'REFUNDED' : 'CONFIRMED' });
      await BookingDetail.create(lines.map(service => ({ booking_id: booking._id, service_id: service._id, facility_id: service.facility_id, quantity: 1, unit_price: 100000, commission_rate: 10 })));
      await Payment.create(amounts.map((amount, i) => ({ booking_id: booking._id, transaction_id: `${code}-${i}`, amount, status, payment_gateway: 'PAYOS', payment_date: new Date(`2026-10-${10 + i}T00:00:00+07:00`) })));
    };
    await sale('MIX', rooms.slice(0, 3), [150001, 150000]);
    await sale('REFUND', [rooms[0]], [50000], 'REFUNDED');
    await sale('TICKET', [rooms[3]], [100000]);
    await t.test('hotel and service groups reconcile after allocating mixed bookings; booking counts remain distinct', async () => {
      const all = await read(); assert.equal(all.totals.gross_payments, '450001');
      const hotels = await read({ facility_type: 'HOTEL' }); assert.equal(hotels.totals.gross_payments, '350001');
      assert.equal(hotels.facilities.length, 4); assert.equal(hotels.booking_count, 2);
      assert.equal(hotels.facilities.reduce((total, item) => total + BigInt(item.amount), 0n).toString(), hotels.totals.gross_payments);
      assert.equal(hotels.services.reduce((total, item) => total + BigInt(item.net_revenue), 0n).toString(), hotels.totals.net_revenue);
      assert.equal(hotels.timeline.reduce((total, item) => total + BigInt(item.platform_commission), 0n).toString(), hotels.totals.platform_commission);
      assert.equal(hotels.facilities.find(item => item.id === String(hotelB._id)).booking_count, 1);
      assert.equal(hotels.facilities.find(item => item.id === String(hotelB._id)).payment_count, 2);
      assert.equal(hotels.facilities.find(item => item.id === String(zero._id)).amount, '0');
      const monthly = await read({ facility_type: 'HOTEL', interval: 'monthly' }); assert.deepEqual(monthly.totals, hotels.totals);
      const selected = await read({ facility_id: String(hotelB._id) }); assert.equal(selected.facilities.length, 1); assert.equal(selected.rows.length, 2);
      assert.ok(selected.rows.every(row => row.lines.every(line => line.facility_id === String(hotelB._id))));
      const refunded = await read({ facility_type: 'HOTEL', status: 'REFUNDED' }); assert.equal(refunded.totals.refunds, '50000'); assert.equal(refunded.totals.net_revenue, '0');
      assert.equal(hotels.partner_revenue, (BigInt(hotels.totals.net_revenue) - BigInt(hotels.totals.platform_commission)).toString());
    });
    await t.test('owner only receives its own allocated lines, options and summaries; forged filters and exports are blocked', async () => {
      const own = await read({ facility_type: 'HOTEL' }, owner, '/vendor');
      assert.equal(own.facility_options.length, 3); assert.ok(!JSON.stringify(own).includes('Hotel C'));
      assert.ok(own.rows.every(row => row.lines.every(line => line.vendor_id === String(owner._id))));
      const selected = await read({ facility_id: String(hotelA._id) }, owner, '/vendor'); assert.equal(selected.facilities.length, 1);
      for (const endpoint of [`/vendor/revenue?facility_id=${hotelC._id}`, `/vendor/revenue/export?format=xlsx&facility_id=${hotelC._id}`, `/vendor/revenue?vendor_id=${other._id}`]) assert.equal((await request(endpoint, owner)).status, 403);
    });
    await t.test('export uses identical hotel, status and date filters and includes exact grouped totals', async () => {
      const query = { ...period, facility_id: String(hotelA._id), facility_type: 'HOTEL', status: 'REFUNDED', interval: 'monthly' };
      const report = await read(query);
      const response = await request(`/manager/revenue/export?${new URLSearchParams({ ...query, format: 'xlsx' })}`);
      assert.equal(response.status, 200);
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
      const sheet = workbook.getWorksheet('Theo cơ sở'); assert.equal(sheet.rowCount, 2);
      assert.equal(sheet.getCell('F2').value, Number(report.totals.gross_payments));
      assert.equal(sheet.getCell('G2').value, Number(report.totals.refunds));
      assert.equal(workbook.getWorksheet('Chi tiết').rowCount, report.total + 2);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); mongo.kill();
    await new Promise(resolve => mongo.exitCode !== null ? resolve() : mongo.once('exit', resolve));
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('travelio-manager-')) fs.rmSync(directory, { recursive: true, force: true });
  }
});
