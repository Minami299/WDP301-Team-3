const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
process.env.JWT_SECRET = 'isolated-admin-revenue-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/isolated_admin_revenue';
const mongoose = require('mongoose');
const express = require('express');
const { Booking, BookingDetail, Payment, User, Role, Facility, Service, ServiceInventory } = require('../src/models');
const { revenuePeriod } = require('../src/services/revenue.service');
const { calculateBookingRevenue, round } = require('../src/services/revenueCalculation');
const { generateToken } = require('../src/middlewares/authMiddleware');
const { permissionsOf } = require('../src/configs/permissions');
const october = { from: '2026-10-01', to: '2026-10-31' };
const binary = process.env.MONGOD_BINARY || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';

test('Vietnam month boundaries, strict dates, whole-VND rounding and permissions', () => {
  const period = revenuePeriod({}, new Date('2026-09-30T17:00:00Z'));
  assert.equal(period.from, october.from); assert.equal(period.to, october.to);
  assert.equal(period.start.toISOString(), '2026-09-30T17:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(revenuePeriod({}, new Date('2024-02-15')).to, '2024-02-29');
  for (const query of [{ from: '' }, { from: [] }, { from: '2026-02-29' }, { to: '0000-01-01' }, { ...october, from: '2026-11-01' }]) assert.throws(() => revenuePeriod(query), { statusCode: 400 });
  assert.equal(round(5n, 2n), 2n); assert.equal(round(7n, 2n), 4n);
  assert.ok(permissionsOf({ role_name: 'ADMIN', permissions: ['users.view'] }).includes('revenue.view'));
  assert.ok(!permissionsOf({ role_name: 'MANAGER' }).includes('revenue.view'));
});

test('unsupported partial refunds and invalid money stay unknown; repeated data is not added twice', () => {
  const booking = { _id: 'booking', booking_code: 'B', final_amount: 100000, status: 'CONFIRMED' };
  const detail = { _id: 'detail', quantity: 1, unit_price: 100000, resolved_rate: 12.5 };
  const receipt = { _id: 'payment', transaction_id: 'T', amount: 100000, status: 'SUCCESS', payment_date: new Date('2026-10-10') };
  const calculate = payments => calculateBookingRevenue(booking, payments, [detail], revenuePeriod(october));
  assert.equal(calculate([receipt, receipt]).length, 1);
  assert.equal(calculate([receipt])[0].platform_commission, '12500');
  for (const amount of [0.1, -1, Number.MAX_SAFE_INTEGER + 1]) {
    const row = calculate([{ ...receipt, amount }])[0];
    assert.equal(row.amount, null); assert.equal(row.platform_commission, null);
    assert.ok(row.issues.includes('INVALID_VND'));
  }
  const partial = calculate([{ ...receipt, refunded_amount: 20000 }])[0];
  assert.equal(partial.refund_amount, null); assert.equal(partial.platform_commission, null);
  assert.ok(partial.issues.includes('UNSUPPORTED_REFUND_DATA'));
});

test('real isolated MongoDB: admin reporting, reconciliation, refunds and rate snapshots', { skip: !fs.existsSync(binary), timeout: 90000 }, async t => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-revenue-'));
  const mongo = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'revenueTest', '--quiet', '--logpath', path.join(directory, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  const bootstrap = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  let server;
  try {
    for (let i = 0; i < 40; i++) {
      try { await bootstrap.connect(); break; } catch (error) { if (i === 39) throw error; }
    }
    await bootstrap.db('admin').command({ replSetInitiate: { _id: 'revenueTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    for (let i = 0; i < 100; i++) {
      if ((await bootstrap.db('admin').command({ hello: 1 })).isWritablePrimary) break;
      if (i === 99) throw Error('Replica set did not become primary');
      await delay(100);
    }
    await bootstrap.close();
    await mongoose.connect(`mongodb://127.0.0.1:${port}/admin_revenue?replicaSet=revenueTest`);
    await Promise.all([Booking.init(), BookingDetail.init(), Payment.init(), User.init(), Role.init(), Facility.init(), Service.init(), ServiceInventory.init()]);
    const roles = await Role.create([
      { role_name: 'ADMIN', permissions: ['users.view'] }, { role_name: 'MANAGER' },
      { role_name: 'CUSTOMER' }, { role_name: 'HOTEL_OWNER' }, { role_name: 'ACTIVITY_VENDOR' },
    ]);
    const person = async (name, role) => User.create({ full_name: name, email: `${name}@example.test`, password_hash: 'unused', status: 'ACTIVE', is_verified: true, role_id: roles.find(r => r.role_name === role)._id });
    const admin = await person('admin', 'ADMIN'), manager = await person('manager', 'MANAGER');
    const customer = await person('buyer', 'CUSTOMER'), hotel = await person('hotel', 'HOTEL_OWNER'), vendor = await person('vendor', 'ACTIVITY_VENDOR');
    const facility = await Facility.create({ vendor_id: hotel._id, type: 'HOTEL', name: 'Hotel', city: 'Da Nang', address: 'Test', status: 'ACTIVE', commission_rate: 10 });
    const room = await Service.create({ facility_id: facility._id, type: 'ROOM', name: 'Room', base_price: 100000, total_rooms: 10, capacity: 2 });
    const attraction = await Facility.create({ vendor_id: vendor._id, type: 'ATTRACTION', name: 'Attraction', city: 'Da Nang', address: 'Test', status: 'ACTIVE', commission_rate: 12.5 });
    const ticket = await Service.create({ facility_id: attraction._id, type: 'TICKET', name: 'Ticket', base_price: 100000 });
    const inventory = await ServiceInventory.create({ service_id: ticket._id, target_date: new Date('2099-10-10'), time_slot: 'ALL_DAY', available_qty: 10, price: 100000 });
    const faults = { fail: false, delays: {} }, requests = [];
    const app = express(); app.use(express.json());
    app.use('/api/admin/revenue', async (req, res, next) => {
      requests.push({ ...req.query });
      if (req.path === '/export' && faults.exportResponse) {
        const { status, type, body } = faults.exportResponse;
        return res.status(status).type(type).send(body);
      }
      if (faults.fail) return res.status(503).json({ success: false, message: 'Report test outage' });
      if (faults.delays[req.query.from]) await delay(faults.delays[req.query.from]);
      next();
    });
    app.use('/api/admin', require('../src/routes/admin.routes'));
    app.use('/api/vendor', require('../src/routes/vendor.routes'));
    app.use('/api/auth', require('../src/routes/auth.routes'));
    const frontend = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(frontend));
    app.get(['/admin', '/admin/revenue', '/vendor/revenue'], (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const request = async (query = october, user = admin) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/revenue?${new URLSearchParams(query)}`, { headers: user ? { Authorization: `Bearer ${generateToken({ id: String(user._id), role: 'ADMIN' })}` } : {} });
      return { status: response.status, ...await response.json() };
    };
    let sequence = 0;
    const reset = async () => { for (const model of [Payment, BookingDetail, Booking]) await model.deleteMany({}); };
    const sale = async ({ final = 100000, status = 'CONFIRMED', lines, receipts = [{}] } = {}) => {
      const booking = await Booking.create({ booking_code: `REV-${++sequence}`, customer_id: customer._id, guest_name: 'Test', guest_email: 'test@example.test', guest_phone: '0912345678', final_amount: final, total_amount: final, status });
      await BookingDetail.create((lines || [{ service_id: room._id, quantity: 1, unit_price: final, commission_rate: 10 }]).map(line => ({ booking_id: booking._id, ...line })));
      const payments = [];
      for (const receipt of receipts) payments.push(await Payment.create({ booking_id: booking._id, transaction_id: `REV-PAY-${++sequence}`, payment_gateway: 'PAYOS', amount: final, status: 'SUCCESS', payment_date: new Date('2026-10-10T00:00:00+07:00'), ...receipt }));
      return { booking, payments };
    };
    const totals = async () => (await request()).data.totals;
    await t.test('empty, successful, unpaid, failed and cancelled; totals agree with Mongo receipts', async () => {
      assert.deepEqual(await totals(), { gross_payments: '0', refunds: '0', net_revenue: '0', platform_commission: '0' });
      await sale(); await sale({ status: 'PENDING', receipts: [{ status: 'PENDING' }] });
      await sale({ receipts: [{ status: 'FAILED' }] }); await sale({ status: 'CANCELLED', receipts: [] }); await sale({ receipts: [] });
      const response = await request(); assert.equal(response.status, 200); assert.equal(response.data.total, 1);
      assert.deepEqual(response.data.totals, { gross_payments: '100000', refunds: '0', net_revenue: '100000', platform_commission: '10000' });
      const eligible = await Payment.find({ status: 'SUCCESS', booking_id: { $in: await Booking.find({ status: { $ne: 'CANCELLED' } }).distinct('_id') } }).lean();
      assert.equal(response.data.totals.gross_payments, eligible.reduce((sum, p) => sum + BigInt(p.amount), 0n).toString());
      assert.ok(!JSON.stringify(response).includes('guest_email'));
    });
    await t.test('a cancelled booking does not erase collected cash; orphan receipts remain visible', async () => {
      await reset(); await sale({ status: 'CANCELLED' });
      assert.deepEqual(await totals(), { gross_payments: '100000', refunds: '0', net_revenue: '100000', platform_commission: null });
      assert.ok((await request()).data.quality.issues.includes('CANCELLED_BOOKING_WITH_PAYMENT'));
      await reset(); const { booking } = await sale(); await Booking.deleteOne({ _id: booking._id });
      const response = await request();
      assert.equal(response.data.totals.gross_payments, '100000'); assert.equal(response.data.totals.platform_commission, null);
      assert.ok(response.data.quality.issues.includes('MISSING_BOOKING'));
    });
    await t.test('full refund is read once from current payment state; booking state alone proves no refund', async () => {
      await reset(); const { booking, payments } = await sale();
      for (let i = 0; i < 2; i++) await Payment.updateOne({ _id: payments[0]._id }, { $set: { status: 'REFUNDED' } });
      await Booking.updateOne({ _id: booking._id }, { $set: { status: 'REFUNDED' } });
      assert.deepEqual(await totals(), { gross_payments: '100000', refunds: '100000', net_revenue: '0', platform_commission: '0' });
      await Payment.updateOne({ _id: payments[0]._id }, { $set: { status: 'SUCCESS' } });
      const response = await request(); assert.equal(response.data.totals.refunds, '0'); assert.equal(response.data.totals.platform_commission, null);
      assert.ok(response.data.quality.issues.includes('REFUND_STATUS_MISMATCH'));
    });
    await t.test('partial refund data cannot be reported as zero refund or invented commission', async () => {
      await reset(); const { payments } = await sale();
      await Payment.collection.updateOne({ _id: payments[0]._id }, { $set: { refunded_amount: 25000 } });
      const response = await request();
      assert.equal(response.data.totals.gross_payments, '100000'); assert.equal(response.data.totals.refunds, null);
      assert.equal(response.data.totals.net_revenue, null); assert.equal(response.data.totals.platform_commission, null);
      assert.ok(response.data.quality.issues.includes('UNSUPPORTED_REFUND_DATA'));
    });
    await t.test('mixed rates, discounts, legacy inventory reference and current-rate warning', async () => {
      await reset(); await sale({ final: 100001, lines: [
        { service_id: room._id, quantity: 1, unit_price: 100000, commission_rate: 10 },
        { inventory_id: inventory._id, quantity: 1, unit_price: 100000, commission_rate: 12.5 },
      ] });
      assert.equal((await totals()).platform_commission, '11250');
      await reset(); await sale({ lines: [{ inventory_id: inventory._id, quantity: 1, unit_price: 100000 }] });
      const response = await request(); assert.equal(response.data.totals.platform_commission, '12500');
      assert.ok(response.data.quality.issues.includes('CURRENT_RATE_FALLBACK'));
      await BookingDetail.updateMany({}, { $set: { commission_rate: 0 } });
      assert.equal((await totals()).platform_commission, '0');
    });
    await t.test('receipts across periods cap commission at final booking value; pagination preserves full totals', async () => {
      await reset(); await sale({ receipts: [
        { amount: 60000, payment_date: new Date('2026-09-30T16:59:59.999Z') },
        { amount: 60000, payment_date: new Date('2026-09-30T17:00:00Z') },
        { amount: 100000, payment_date: new Date('2026-10-31T16:59:59.999Z') },
        { amount: 100000, payment_date: new Date('2026-10-31T17:00:00Z') },
      ] });
      const result = await request({ ...october, page: '1', page_size: '1' });
      assert.equal(result.data.total, 2); assert.equal(result.data.rows.length, 1);
      assert.deepEqual(result.data.totals, { gross_payments: '160000', refunds: '0', net_revenue: '160000', platform_commission: '4000' });
      const second = await request({ ...october, page: '2', page_size: '1' });
      assert.deepEqual(result.data.totals, second.data.totals); assert.notEqual(result.data.rows[0].payment_id, second.data.rows[0].payment_id);
      for (const query of [{ ...october, page: '0' }, { ...october, page_size: '101' }, { from: '2026-02-30' }]) assert.equal((await request(query)).status, 400);
    });
    await t.test('whole VND above aggregate safe-number limit remains exact; missing rates stay unknown', async () => {
      await reset(); await sale({ final: Number.MAX_SAFE_INTEGER }); await sale({ final: Number.MAX_SAFE_INTEGER });
      assert.equal((await totals()).gross_payments, (2n * BigInt(Number.MAX_SAFE_INTEGER)).toString());
      await reset(); await sale({ lines: [{ service_id: new mongoose.Types.ObjectId(), quantity: 1, unit_price: 100000 }] });
      assert.equal((await totals()).platform_commission, null);
    });
    await t.test('real PayOS reconciliation repeated/concurrent writes produce one receipt and unchanged totals', async () => {
      await reset(); const { booking } = await sale({ status: 'PENDING', receipts: [] });
      await Booking.updateOne({ _id: booking._id }, { $set: { payos_order_code: 12345678 } });
      const payment = require('../src/services/payment.service');
      process.env.PAYOS_CLIENT_ID = 'test'; process.env.PAYOS_API_KEY = 'test'; process.env.PAYOS_CHECKSUM_KEY = 'test';
      payment.setClientForTests({ paymentRequests: { get: async () => ({ orderCode: 12345678, transactions: [{ reference: 'BANK-1', amount: 100000, transactionDateTime: '2026-10-10 10:00:00' }] }) } });
      const pending = await Booking.findById(booking._id);
      await Promise.all([payment.reconcileBooking(pending), payment.reconcileBooking(pending)]);
      await payment.reconcileBooking(pending);
      assert.equal(await Payment.countDocuments({ booking_id: booking._id }), 1);
      assert.equal((await totals()).platform_commission, '10000');
      assert.equal((await Booking.findById(booking._id)).status, 'CONFIRMED');
      await assert.rejects(Payment.create({ booking_id: booking._id, transaction_id: 'PAYOS-12345678-BANK-1', payment_gateway: 'PAYOS', amount: 100000, status: 'SUCCESS' }), { code: 11000 });
    });
    await t.test('new room, direct-ticket and scheduled-ticket bookings snapshot configured commission', async () => {
      await reset(); const bookingService = require('../src/services/booking.service');
      const guest = () => ({ guest_name: 'Buyer', guest_email: 'buyer@example.test', guest_phone: '0912345678', agree_conditions: true, request_id: randomUUID() });
      const roomBooking = await bookingService.createRoomBooking(customer._id, { ...guest(), service_id: String(room._id), check_in: '2099-10-01', check_out: '2099-10-03', rooms: 1, guests: 1 });
      assert.equal(roomBooking.details[0].commission_rate, 10);
      const directService = await Service.create({ facility_id: attraction._id, type: 'TICKET', name: 'Direct ticket', base_price: 100000 });
      const direct = await bookingService.createBooking(customer._id, { ...guest(), items: [{ service_id: String(directService._id), ticket_type_id: String(directService._id), quantity: 1, visit_date: '2099-10-10' }] });
      const scheduled = await bookingService.createBooking(customer._id, { ...guest(), items: [{ inventory_id: String(inventory._id), quantity: 1 }] });
      assert.equal(direct.details[0].commission_rate, 12.5); assert.equal(scheduled.details[0].commission_rate, 12.5);
      await Facility.updateOne({ _id: facility._id }, { $set: { commission_rate: 90 } });
      await Payment.create({ booking_id: roomBooking._id, transaction_id: 'SNAPSHOT-PAY', payment_gateway: 'PAYOS', amount: 200000, status: 'SUCCESS', payment_date: new Date('2026-10-10') });
      assert.equal((await totals()).platform_commission, '20000');
    });
    await require('./report-export-cases.cjs')({ t, origin: `http://127.0.0.1:${server.address().port}`, reset, sale, admin, manager, hotel, vendor, customer, room, ticket, october });
    const chromeBinary = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    await t.test('browser: admin dashboard, real API totals, date filters, pagination, loading/error/empty and stale responses', { skip: !fs.existsSync(chromeBinary) || !fs.existsSync(path.join(frontend, 'index.html')) }, async () => {
      await reset();
      for (let i = 0; i < 22; i++) await sale();
      const token = generateToken({ id: String(admin._id), role: 'ADMIN' });
      const currentUser = { id: String(admin._id), full_name: admin.full_name, email: admin.email, role: 'ADMIN', permissions: permissionsOf(roles.find(r => r.role_name === 'ADMIN')), status: 'ACTIVE' };
      await require('./admin-revenue-browser.cjs')({ origin: `http://127.0.0.1:${server.address().port}`, directory, chromeBinary, token, currentUser, faults, requests,
        partner: { token: generateToken({ id: String(hotel._id), role: 'HOTEL_OWNER' }), user: { id: String(hotel._id), full_name: hotel.full_name, email: hotel.email, role: 'HOTEL_OWNER', permissions: ['vendor.dashboard'], status: 'ACTIVE' } },
      });
    });
    await t.test('JWT, current permission grants/revocation and account locks are enforced', async () => {
      assert.equal((await request(october, null)).status, 401);
      for (const actor of [customer, hotel, vendor, manager]) assert.equal((await request(october, actor)).status, 403);
      await Role.updateOne({ _id: manager.role_id }, { $set: { permissions: ['revenue.view'] } });
      assert.equal((await request(october, manager)).status, 200);
      await Role.updateOne({ _id: manager.role_id }, { $set: { permissions: [] } });
      assert.equal((await request(october, manager)).status, 403);
      await User.updateOne({ _id: admin._id }, { $set: { status: 'LOCKED' } });
      assert.equal((await request()).status, 403);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await bootstrap.close(); await mongoose.disconnect(); mongo.kill();
    await new Promise(resolve => mongo.exitCode !== null ? resolve() : mongo.once('exit', resolve));
    // Only remove the exact temporary directory created above.
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('travelio-revenue-')) fs.rmSync(directory, { recursive: true, force: true });
  }
});
