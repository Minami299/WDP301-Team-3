const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
process.env.JWT_SECRET = 'isolated-analytics-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/isolated_analytics_test';
const mongoose = require('mongoose');
const express = require('express');
const { Booking, BookingDetail, Payment, User, Role, Facility, Service, ServiceInventory } = require('../src/models');
const { analyticsPeriod, bucketKey, comparison } = require('../src/services/adminAnalytics.service');
const { calculateBookingRevenue } = require('../src/services/revenueCalculation');
const { permissionsOf } = require('../src/configs/permissions');
const { generateToken } = require('../src/middlewares/authMiddleware');
const binary = process.env.MONGOD_BINARY || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
const period = { from: '2026-10-01', to: '2026-10-07', interval: 'daily' };

test('growth handles zero, declines, unknowns, rates and exact large monetary strings', () => {
  assert.equal(comparison('150', '100').growth_percent, 50);
  assert.equal(comparison(75, 100).growth_percent, -25);
  assert.equal(comparison(0, 0).growth_percent, 0);
  assert.equal(comparison(10, 0).growth_state, 'new');
  assert.equal(comparison(10, 0).growth_percent, null);
  assert.equal(comparison(null, 20).growth_state, 'unavailable');
  assert.equal(comparison('20000000000000000000', '10000000000000000000').growth_percent, 100);
  assert.equal(comparison(12.5, 25, 'percent').growth_percent, -50);
});

test('Vietnam date boundaries, comparable period, leap days and aggregation validation', () => {
  const range = analyticsPeriod(period);
  assert.equal(range.current.start.toISOString(), '2026-09-30T17:00:00.000Z');
  assert.equal(range.current.end.toISOString(), '2026-10-07T17:00:00.000Z');
  assert.equal(range.previous.from, '2026-09-24');
  assert.equal(range.previous.to, '2026-09-30');
  assert.equal(range.previous.end.getTime(), range.current.start.getTime());
  assert.equal(range.buckets.length, 7);
  assert.equal(analyticsPeriod({}, new Date('2026-10-26T17:00:00Z')).current.to, '2026-10-27');
  assert.equal(analyticsPeriod({ from: '2024-02-28', to: '2024-03-01' }).days, 3);
  assert.deepEqual(analyticsPeriod({ from: '2025-12-31', to: '2026-01-01', interval: 'yearly' }).buckets, ['2025', '2026']);
  assert.deepEqual(analyticsPeriod({ from: '2026-09-30', to: '2026-10-01', interval: 'monthly' }).buckets, ['2026-09', '2026-10']);
  assert.equal(bucketKey('2026-09-30T17:00:00Z', 'monthly'), '2026-10');
  for (const query of [{ from: '2026-02-29' }, { from: [] }, { ...period, to: '2026-09-30' }, { ...period, interval: 'weekly' }, { from: '2000-01-01', to: '2026-01-01' }, { from: '2024-01-01', to: '2026-01-01', interval: 'daily' }]) assert.throws(() => analyticsPeriod(query), { statusCode: 400 });
});

test('retry transaction IDs count once, actual installments count separately and commission stays capped', () => {
  const booking = { _id: 'B', booking_code: 'B', final_amount: 100000, status: 'CONFIRMED' };
  const lines = [{ _id: 'L', quantity: 1, unit_price: 100000, resolved_rate: 10, resolved_vendor_id: 'V' }];
  const payment = { _id: 'P', transaction_id: 'BANK-1', amount: 60000, status: 'SUCCESS', payment_date: new Date('2026-10-01') };
  const rows = calculateBookingRevenue(booking, [payment, { ...payment, _id: 'RETRY' }, { ...payment, _id: 'P2', transaction_id: 'BANK-2' }], lines, analyticsPeriod(period).current);
  assert.equal(rows.length, 2);
  assert.equal(rows.reduce((sum, row) => sum + BigInt(row.amount), 0n), 120000n);
  assert.equal(rows.reduce((sum, row) => sum + BigInt(row.platform_commission), 0n), 10000n);
});

test('isolated MongoDB: analytics KPIs, cohorts, refunds, ownership and authorization', { skip: !fs.existsSync(binary), timeout: 90000 }, async t => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-analytics-'));
  const mongo = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet', '--logpath', path.join(directory, 'mongo.log')], { windowsHide: true, stdio: 'ignore' });
  let server;
  try {
    for (let i = 0; i < 40; i++) {
      try { await mongoose.connect(`mongodb://127.0.0.1:${port}/analytics_test`, { serverSelectionTimeoutMS: 500 }); break; }
      catch (error) { if (i === 39) throw error; }
    }
    await Promise.all([Booking, BookingDetail, Payment, User, Role, Facility, Service, ServiceInventory].map(model => model.init()));
    const roles = await Role.create(['ADMIN', 'MANAGER', 'CUSTOMER', 'HOTEL_OWNER', 'ACTIVITY_VENDOR'].map(role_name => ({ role_name, ...(role_name === 'ADMIN' ? { permissions: ['users.view'] } : {}) })));
    const person = (name, role) => User.create({ full_name: name, email: `${name}@analytics.test`, password_hash: 'unused', status: 'ACTIVE', role_id: roles.find(item => item.role_name === role)._id });
    const admin = await person('admin', 'ADMIN'), manager = await person('manager', 'MANAGER'), customer = await person('buyer', 'CUSTOMER');
    const hotel = await person('hotel', 'HOTEL_OWNER'), vendor = await person('vendor', 'ACTIVITY_VENDOR');
    const venue = (owner, type, name) => Facility.create({ vendor_id: owner._id, type, name, city: 'Da Nang', address: 'Test', status: 'ACTIVE', commission_rate: 10 });
    const hotelFacility = await venue(hotel, 'HOTEL', 'Test Hotel'), attraction = await venue(vendor, 'ATTRACTION', 'Test Attraction');
    const room = await Service.create({ facility_id: hotelFacility._id, type: 'ROOM', name: 'Room', base_price: 100000 });
    const ticket = await Service.create({ facility_id: attraction._id, type: 'TICKET', name: 'Ticket', base_price: 100000 });
    const inventory = await ServiceInventory.create({ service_id: ticket._id, target_date: new Date('2026-10-01'), time_slot: 'ALL_DAY', available_qty: 10, price: 100000 });
    const faults = { fail: false, delay: {}, requests: [] };
    const app = express(); app.use(express.json());
    app.use('/api/admin/analytics', async (req, res, next) => {
      faults.requests.push({ ...req.query });
      if (faults.delay[req.query.from]) await new Promise(resolve => setTimeout(resolve, faults.delay[req.query.from]));
      if (faults.fail) return res.status(503).json({ success: false, message: 'Analytics test outage' });
      next();
    });
    app.use('/api/admin', require('../src/routes/admin.routes'));
    const frontend = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(frontend));
    app.get(['/admin', '/admin/analytics'], (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = async (query = period, actor = admin, endpoint = 'analytics') => {
      const response = await fetch(`${origin}/api/admin/${endpoint}?${new URLSearchParams(query)}`, { headers: actor ? { Authorization: `Bearer ${generateToken({ id: String(actor._id), role: 'ADMIN' })}` } : {} });
      return { status: response.status, ...await response.json() };
    };
    const reset = async () => { for (const model of [Payment, BookingDetail, Booking]) await model.deleteMany({}); };
    let sequence = 0;
    const sale = async ({ at = '2026-10-01T00:00:00+07:00', paidAt = at, final = 100000, status = 'CONFIRMED', lines, receipts = [{}] } = {}) => {
      const booking = await Booking.create({ booking_code: `ANA-${++sequence}`, guest_name: 'Test', guest_email: 'test@analytics.test', guest_phone: '0912345678', status, final_amount: final, total_amount: final, created_at: new Date(at) });
      await BookingDetail.create((lines || [{ service_id: room._id, quantity: 1, unit_price: final, commission_rate: 10 }]).map(line => ({ ...line, booking_id: booking._id })));
      const payments = [];
      for (const receipt of receipts) payments.push(await Payment.create({ booking_id: booking._id, transaction_id: `ANA-PAY-${++sequence}`, payment_gateway: 'PAYOS', amount: final, status: 'SUCCESS', payment_date: new Date(paidAt), ...receipt }));
      return { booking, payments };
    };

    await t.test('empty database gives zero counts, no invented growth and filled trend buckets', async () => {
      const response = await request(); assert.equal(response.status, 200);
      const report = response.data;
      assert.equal(report.empty, true);
      assert.deepEqual(report.summary.gross_payments, { current: '0', previous: '0', growth_percent: 0, growth_state: 'stable' });
      assert.equal(report.summary.total_bookings.current, 0);
      assert.equal(report.summary.cancellation_rate.current, null);
      assert.equal(report.summary.active_partners.current, 0);
      assert.equal(report.trends.length, 7); assert.ok(report.trends.every(row => row.bookings === 0 && row.platform_commission === '0'));
      assert.equal(report.distribution.length, 5); assert.deepEqual(report.top_partners, []);
    });
    await t.test('KPIs agree with revenue; completed bookings and cancellations use the booking creation cohort', async () => {
      await reset();
      await sale({ at: '2026-09-24T00:00:00+07:00', final: 50000 });
      await sale({ status: 'COMPLETED' });
      await sale({ status: 'CONFIRMED', receipts: [] });
      await sale({ status: 'PENDING', receipts: [{ status: 'PENDING' }, { status: 'FAILED' }] });
      await sale({ status: 'CANCELLED', receipts: [] });
      await sale({ status: 'REFUNDED', receipts: [{ status: 'REFUNDED' }] });
      const report = (await request()).data;
      assert.equal(report.summary.gross_payments.current, '200000');
      assert.equal(report.summary.gross_payments.previous, '50000');
      assert.equal(report.summary.gross_payments.growth_percent, 300);
      assert.equal(report.summary.net_payments.current, '100000');
      assert.equal(report.summary.platform_commission.current, '10000');
      assert.equal(report.summary.total_bookings.current, 5);
      assert.equal(report.summary.completed_bookings.current, 1);
      assert.equal(report.summary.cancellation_rate.current, 20);
      assert.equal(report.summary.active_partners.current, 1);
      assert.deepEqual(Object.fromEntries(report.distribution.map(row => [row.status, row.count])), { PENDING: 1, CONFIRMED: 1, CANCELLED: 1, REFUNDED: 1, COMPLETED: 1 });
      assert.equal(report.trends.reduce((sum, row) => sum + row.bookings, 0), 5);
      assert.equal(report.trends.reduce((sum, row) => sum + BigInt(row.gross_payments), 0n), 200000n);
      const revenue = (await request(period, admin, 'revenue')).data;
      assert.equal(report.summary.gross_payments.current, revenue.totals.gross_payments);
      assert.equal(report.summary.net_payments.current, revenue.totals.net_revenue);
      assert.equal(report.summary.platform_commission.current, revenue.totals.platform_commission);
    });
    await t.test('only recorded payment refunds reduce net; booking refunds and cancellation requests do not', async () => {
      await reset(); const { booking, payments } = await sale({ status: 'REFUNDED' });
      await Booking.updateOne({ _id: booking._id }, { $set: { cancellation_requests: [{ request_id: 'R', requested_by: customer._id, reason: 'Test', type: 'REFUND', status: 'APPROVED' }] } });
      let report = (await request()).data;
      assert.equal(report.summary.net_payments.current, '100000');
      assert.equal(report.summary.platform_commission.current, null);
      assert.ok(report.quality.issues.includes('REFUND_STATUS_MISMATCH'));
      await Payment.updateOne({ _id: payments[0]._id }, { $set: { status: 'REFUNDED' } });
      report = (await request()).data;
      assert.equal(report.summary.gross_payments.current, '100000');
      assert.equal(report.summary.net_payments.current, '0');
      assert.equal(report.summary.platform_commission.current, '0');
      await Payment.collection.updateOne({ _id: payments[0]._id }, { $set: { refunded_amount: 20000 } });
      report = (await request()).data;
      assert.equal(report.summary.net_payments.current, null);
      assert.equal(report.trends[0].net_payments, null);
      assert.equal(report.summary.net_payments.growth_state, 'unavailable');
      assert.ok(report.quality.issues.includes('UNSUPPORTED_REFUND_DATA'));
    });
    await t.test('Vietnam bounds are inclusive/exclusive and daily, monthly, yearly trends retain identical totals', async () => {
      await reset();
      for (const at of ['2026-09-30T16:59:59.999Z', '2026-09-30T17:00:00Z', '2026-10-07T16:59:59.999Z', '2026-10-07T17:00:00Z']) await sale({ at });
      const daily = (await request()).data;
      assert.equal(daily.summary.total_bookings.current, 2);
      assert.equal(daily.summary.total_bookings.previous, 1);
      assert.equal(daily.trends[0].bookings, 1); assert.equal(daily.trends[6].bookings, 1);
      for (const interval of ['monthly', 'yearly']) {
        const report = (await request({ ...period, interval })).data;
        assert.deepEqual(report.summary, daily.summary); assert.equal(report.trends.length, 1);
        assert.equal(report.trends[0].gross_payments, '200000'); assert.equal(report.trends[0].bookings, 2);
      }
      for (const query of [{ ...period, interval: 'weekly' }, { ...period, from: '2026-02-30' }, { ...period, to: '2026-09-30' }]) assert.equal((await request(query)).status, 400);
    });
    await t.test('installments spanning periods cap commission once; booking and partner counts never multiply', async () => {
      await reset(); const { booking, payments } = await sale({ receipts: [
        { amount: 60000, payment_date: new Date('2026-09-30T16:59:59.999Z') },
        { amount: 60000 }, { amount: 20000, status: 'FAILED' }, { amount: 50000, status: 'PENDING' },
      ] });
      const report = (await request()).data;
      assert.equal(report.summary.gross_payments.current, '60000');
      assert.equal(report.summary.gross_payments.previous, '60000');
      assert.equal(report.summary.platform_commission.current, '4000');
      assert.equal(report.summary.platform_commission.previous, '6000');
      assert.equal(report.summary.total_bookings.current, 1);
      assert.equal(report.top_partners[0].bookings, 1); assert.equal(report.top_partners[0].booking_value, '100000');
      await assert.rejects(Payment.create({ booking_id: booking._id, transaction_id: payments[0].transaction_id, payment_gateway: 'PAYOS', amount: 60000, status: 'SUCCESS' }), { code: 11000 });
      assert.deepEqual((await request()).data.summary, report.summary);
    });
    await t.test('multi-partner discounted bookings and legacy inventory allocate once; active eligibility is explicit', async () => {
      await reset(); await sale({ final: 100001, lines: [
        { service_id: room._id, quantity: 1, unit_price: 100000, commission_rate: 10 },
        { inventory_id: inventory._id, quantity: 1, unit_price: 100000, commission_rate: 10 },
      ] });
      let report = (await request()).data;
      assert.equal(report.summary.active_partners.current, 2);
      assert.equal(report.top_partners.length, 2);
      assert.equal(report.top_partners.reduce((sum, row) => sum + BigInt(row.booking_value), 0n), 100001n);
      assert.ok(report.top_partners.every(row => row.bookings === 1));
      await User.updateOne({ _id: hotel._id }, { $set: { status: 'LOCKED' } });
      report = (await request()).data; assert.equal(report.summary.active_partners.current, 1);
      await User.updateOne({ _id: hotel._id }, { $set: { status: 'ACTIVE', approvalStatus: 'REJECTED' } });
      assert.equal((await request()).data.summary.active_partners.current, 1);
      await User.updateOne({ _id: hotel._id }, { $set: { approvalStatus: 'APPROVED' } });
    });
    await t.test('top five ranking orders booking value independently of payment volume', async () => {
      await reset();
      for (let i = 1; i <= 6; i++) {
        const partner = await person(`rank${i}`, 'ACTIVITY_VENDOR');
        const facility = await venue(partner, 'ATTRACTION', `Rank ${i}`);
        await sale({ final: i * 10000, lines: [{ facility_id: facility._id, service_id: new mongoose.Types.ObjectId(), quantity: 1, unit_price: i * 10000, commission_rate: 10 }], receipts: [] });
      }
      const report = (await request()).data;
      assert.equal(report.summary.gross_payments.current, '0');
      assert.equal(report.summary.active_partners.current, 6);
      assert.deepEqual(report.top_partners.map(row => row.booking_value), ['60000', '50000', '40000', '30000', '20000']);
    });
    await t.test('unknown ownership and invalid money remain visible as data issues', async () => {
      await reset(); await sale({ lines: [{ service_id: new mongoose.Types.ObjectId(), unit_price: 100000, quantity: 1 }] });
      const report = (await request()).data;
      assert.equal(report.summary.gross_payments.current, '100000');
      assert.equal(report.summary.platform_commission.current, null);
      assert.equal(report.top_partners.length, 0);
      assert.ok(report.quality.issues.includes('MISSING_PARTNER'));
    });
    await t.test('authentication, database role, dedicated permission, revocation and locks are enforced', async () => {
      assert.equal((await request(period, null)).status, 401);
      for (const actor of [customer, hotel, vendor, manager]) assert.equal((await request(period, actor)).status, 403);
      await Role.updateOne({ _id: customer.role_id }, { $set: { permissions: ['analytics.view'] } });
      assert.equal((await request(period, customer)).status, 403);
      await Role.updateOne({ _id: manager.role_id }, { $set: { permissions: ['analytics.view'] } });
      assert.equal((await request(period, manager)).status, 200);
      await Role.updateOne({ _id: manager.role_id }, { $set: { permissions: [] } });
      assert.equal((await request(period, manager)).status, 403);
      await User.updateOne({ _id: admin._id }, { $set: { status: 'LOCKED' } });
      assert.equal((await request()).status, 403);
      await User.updateOne({ _id: admin._id }, { $set: { status: 'ACTIVE' } });
    });
    const chromeBinary = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    await t.test('browser: charts, unified filters, aggregation, reload, empty/error/stale responses and mobile layout', { skip: !fs.existsSync(chromeBinary) || !fs.existsSync(path.join(frontend, 'index.html')) }, async () => {
      await reset(); await sale({ status: 'COMPLETED' });
      await sale({ at: '2026-09-01T00:00:00+07:00', final: 200000 });
      const currentUser = { id: String(admin._id), full_name: admin.full_name, email: admin.email, role: 'ADMIN', permissions: permissionsOf(roles[0]), status: 'ACTIVE' };
      await require('./admin-analytics-browser.cjs')({ origin, directory, chromeBinary, currentUser, token: generateToken({ id: String(admin._id), role: 'ADMIN' }), faults });
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); mongo.kill();
    await new Promise(resolve => mongo.exitCode !== null ? resolve() : mongo.once('exit', resolve));
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('travelio-analytics-')) fs.rmSync(directory, { recursive: true, force: true });
  }
});
