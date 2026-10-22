const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { pathToFileURL } = require('node:url');
process.env.JWT_SECRET = 'isolated-sales-statistics-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/isolated_sales_statistics_test';
const mongoose = require('mongoose');
const express = require('express');
const { User, Role, Facility, Service, ServiceInventory, Booking, BookingDetail, Payment, QrScanLog } = require('../src/models');
const vendor = require('../src/services/vendor.service');
const { generateToken } = require('../src/middlewares/authMiddleware');
const binary = process.env.SALES_TEST_MONGOD || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
const october = { from: '2026-10-01', to: '2026-10-31' };

test('Vietnamese calendar defaults and validation are independent of the machine timezone', async () => {
  const { currentSalesPeriod, salesPeriodError } = await import(pathToFileURL(path.resolve(__dirname, '../../frontend/src/utils/salesStatistics.js')));
  assert.deepEqual(currentSalesPeriod(new Date('2026-09-30T17:00:00Z')), { from: '2026-10-01', to: '2026-10-01' });
  assert.deepEqual(currentSalesPeriod(new Date('2026-10-31T16:59:59.999Z')), october);
  assert.equal(salesPeriodError({ from: '2024-02-29', to: '2024-02-29' }), '');
  for (const period of [
    { from: '2026-02-29', to: '2026-03-01' }, { from: '2026-10-32', to: '2026-11-01' },
    { from: '', to: october.to }, { from: 'not-a-date', to: october.to },
    { from: '0000-01-01', to: october.to }, { from: '2026-11-01', to: october.to },
  ]) {
    assert.ok(salesPeriodError(period));
    await assert.rejects(vendor.getDashboard({ id: new mongoose.Types.ObjectId(), role: 'ACTIVITY_VENDOR' }, period), { statusCode: 400 });
  }
});

test('isolated MongoDB: attraction sales, receipt attribution, QR statistics and access control', { skip: !fs.existsSync(binary), timeout: 90000 }, async t => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-sales-test-'));
  const mongo = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet', '--logpath', path.join(directory, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  let server;
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try { await mongoose.connect(`mongodb://127.0.0.1:${port}/sales_test`, { serverSelectionTimeoutMS: 300 }); break; }
      catch (error) { if (attempt === 49) throw error; await delay(100); }
    }
    const roles = await Role.create(['ACTIVITY_VENDOR', 'HOTEL_OWNER', 'CUSTOMER', 'ADMIN', 'MANAGER'].map(role_name => ({ role_name })));
    const person = async (name, role) => User.create({ full_name: name, email: `${name}@example.test`, password_hash: 'unused', role_id: roles.find(item => item.role_name === role)._id, status: 'ACTIVE', is_verified: true });
    const a = await person('vendor-a', 'ACTIVITY_VENDOR'), b = await person('vendor-b', 'ACTIVITY_VENDOR');
    const hotel = await person('hotel', 'HOTEL_OWNER'), customer = await person('customer', 'CUSTOMER');
    const admin = await person('admin', 'ADMIN'), manager = await person('manager', 'MANAGER');
    const facility = async (owner, type) => Facility.create({ vendor_id: owner._id, type, name: `${type}-${owner.full_name}`, address: 'Test address', city: 'Da Nang', commission_rate: 10 });
    const fa = await facility(a, 'ATTRACTION'), fb = await facility(b, 'ATTRACTION'), fh = await facility(hotel, 'HOTEL');
    const service = async (f, type, name) => Service.create({ facility_id: f._id, type, name, base_price: 999999 });
    const sa = await service(fa, 'TICKET', 'Ticket A'), legacy = await service(fa, 'TICKET', 'Legacy ticket');
    const sb = await service(fb, 'TICKET', 'Ticket B'), room = await service(fh, 'ROOM', 'Hotel room');
    const inventory = await ServiceInventory.create({ service_id: legacy._id, target_date: new Date('2026-10-05'), time_slot: 'ALL_DAY', available_qty: 100, price: 999999 });
    let sequence = 0;
    const actor = (user, role = 'ACTIVITY_VENDOR') => ({ id: String(user._id), role });
    const report = (user = a, query = october, role) => vendor.getDashboard(actor(user, role), query);
    const reset = async () => { for (const model of [QrScanLog, Payment, BookingDetail, Booking]) await model.deleteMany({}); };
    const sale = async (lines, options = {}) => {
      const gross = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
      const final = options.final ?? gross;
      const booking = await Booking.create({ booking_code: `STAT-${++sequence}`, customer_id: customer._id, guest_name: 'Demo Guest', guest_email: 'guest@example.test', guest_phone: '0912345678', total_amount: gross, final_amount: final, status: options.status || 'CONFIRMED' });
      const details = await BookingDetail.create(lines.map(line => ({ booking_id: booking._id, commission_rate: 10, ticket_name: 'Historical ticket', ...line })));
      const receipts = options.payments === undefined ? [{ amount: final }] : options.payments;
      for (const receipt of receipts) await Payment.create({ booking_id: booking._id, transaction_id: `STAT-PAY-${++sequence}`, payment_gateway: 'SEPAY', status: 'SUCCESS', payment_date: new Date('2026-10-05T05:00:00Z'), ...receipt });
      return { booking, details };
    };
    const line = (s, quantity = 1, unit_price = 100000) => ({ service_id: s._id, quantity, unit_price });
    const scan = (result, owner = a, date = '2026-10-05T06:00:00Z') => QrScanLog.create({ vendor_id: owner._id, scanned_by: owner._id, result, scanned_at: new Date(date), qr_code: `private-qr-${++sequence}` });
    const faults = { fail: false, delays: {}, paymentFail: false, paymentStatusDelays: {} }; const requests = [], paymentRequests = [];
    const app = express(); app.use(express.json());
    app.use('/api/vendor/dashboard', async (req, res, next) => {
      requests.push({ ...req.query });
      if (faults.fail) return res.status(503).json({ success: false, message: 'Simulated report outage' });
      if (faults.delays[req.query.from]) await delay(faults.delays[req.query.from]);
      next();
    });
    app.use('/api/vendor/payments', async (req, res, next) => {
      paymentRequests.push({ ...req.query });
      if (faults.paymentFail) return res.status(503).json({ success: false, message: 'Simulated payment history outage' });
      if (faults.paymentStatusDelays[req.query.status]) await delay(faults.paymentStatusDelays[req.query.status]);
      next();
    });
    app.use('/api/vendor', require('../src/routes/vendor.routes'));
    app.use('/api/auth', require('../src/routes/auth.routes'));
    app.use('/api/bookings', require('../src/routes/booking.routes'));
    const frontend = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(frontend)); app.get(['/vendor', '/vendor/payments'], (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const token = user => generateToken({ id: String(user._id), role: 'ACTIVITY_VENDOR' });
    const request = async (query = october, user = a) => {
      const response = await fetch(`${origin}/api/vendor/dashboard?${new URLSearchParams(query)}`, { headers: user ? { Authorization: `Bearer ${token(user)}` } : {} });
      return { status: response.status, ...(await response.json()) };
    };
    const paymentRequest = async (query = october, user = a) => {
      const response = await fetch(`${origin}/api/vendor/payments?${new URLSearchParams(query)}`, { headers: user ? { Authorization: `Bearer ${token(user)}` } : {} });
      return { status: response.status, ...(await response.json()) };
    };
    const golden = async () => {
      await reset();
      await sale([line(sa, 3), { inventory_id: inventory._id, quantity: 2, unit_price: 200000 }]);
      for (const result of ['VALID', 'ALREADY_REDEEMED', 'INVALID', 'NOT_YOURS']) await scan(result);
      await scan('VALID', b);
    };
    await t.test('5 tickets / 700000 VND use historical lines, both service references and isolated QR events', async () => {
      await golden();
      const result = await request({ ...october, vendor_id: String(b._id), facility_id: String(fb._id) });
      assert.equal(result.status, 200); const data = result.data;
      assert.equal(data.tickets_sold, 5); assert.equal(data.ticket_revenue, 700000);
      assert.equal(data.platform_commission, 70000); assert.equal(data.vendor_net, 630000);
      assert.deepEqual(data.qr_scans, { total: 4, valid: 1, already_redeemed: 1, invalid: 2, invalid_code: 1, not_yours: 1 });
      assert.equal(data.recent_sales.length, 2); assert.equal(data.daily[0].tickets_sold, 5);
      for (const forbidden of ['qr_code', 'private-qr', 'guest_email', 'guest_phone', 'Demo Guest']) assert.ok(!JSON.stringify(data).includes(forbidden));
      const other = await report(b); assert.equal(other.ticket_revenue, 0); assert.equal(other.qr_scans.valid, 1);
      const forged = await request({ ...october, vendor_id: 'not-an-id' }); assert.equal(forged.data.ticket_revenue, 700000);
    });
    await t.test('multi-vendor and room/ticket allocation preserves hotel, admin and manager contracts', async () => {
      await reset(); await sale([line(sa, 3), line(sb, 2, 200000), line(room, 1, 300000)], { final: 900000 });
      assert.equal((await report()).total_revenue, 270000); assert.equal((await report(b)).total_revenue, 360000);
      const h = await report(hotel, october, 'HOTEL_OWNER'); assert.equal(h.room_revenue, 270000); assert.equal(h.tickets_sold, 0); assert.equal(h.daily, undefined);
      const all = await report(admin, october, 'ADMIN'); assert.equal(all.total_revenue, 900000); assert.equal(all.rooms_sold, 1); assert.equal(all.daily, undefined);
      const managed = await report(manager, { ...october, vendor_id: String(a._id) }, 'MANAGER'); assert.equal(managed.total_revenue, 270000); assert.equal(managed.qr_scans.invalid_code, undefined);
    });
    await t.test('unpaid, failed, cancelled, refunded and underpaid orders are excluded', async () => {
      await reset();
      for (const status of ['PENDING', 'CANCELLED', 'REFUNDED']) await sale([line(sa)], { status });
      for (const status of ['PENDING', 'FAILED', 'REFUNDED']) await sale([line(sa)], { payments: [{ status, amount: 100000 }] });
      await sale([line(sa)], { payments: [] }); await sale([line(sa)], { payments: [{ amount: 50000 }] });
      assert.equal((await report()).tickets_sold, 0);
      await sale([line(sa, 2)], { status: 'COMPLETED' }); assert.equal((await report()).tickets_sold, 2);
    });
    await t.test('multiple receipts recognize each sale once on its first fully paid date across periods', async () => {
      await reset();
      await sale([line(sa, 1, 1000)], { payments: [{ amount: 1000, payment_date: new Date('2026-10-01T05:00:00Z') }, { amount: 1000, payment_date: new Date('2026-10-02T05:00:00Z') }, { amount: 1000, payment_date: new Date('2026-11-01T05:00:00Z') }] });
      await sale([line(sa, 1, 1000)], { payments: [{ amount: 400, payment_date: new Date('2026-09-29T05:00:00Z') }, { amount: 600, payment_date: new Date('2026-10-02T05:00:00Z') }] });
      const data = await report(); assert.equal(data.tickets_sold, 2); assert.equal(data.total_revenue, 2000);
      assert.equal((await report(a, { from: '2026-09-01', to: '2026-09-30' })).total_revenue, 0);
      assert.equal((await report(a, { from: '2026-11-01', to: '2026-11-30' })).tickets_sold, 0);
      assert.equal((await report(a, { from: '2026-09-01', to: '2026-11-30' })).total_revenue, 2000);
    });
    await t.test('inclusive Vietnamese day/month boundaries apply equally to receipts and scan timestamps', async () => {
      await reset();
      for (const date of ['2026-09-30T16:59:59.999Z', '2026-09-30T17:00:00Z', '2026-10-31T16:59:59.999Z', '2026-10-31T17:00:00Z']) {
        await sale([line(sa)], { payments: [{ amount: 100000, payment_date: new Date(date) }] }); await scan('VALID', a, date);
      }
      const data = await report(); assert.equal(data.total_revenue, 200000); assert.equal(data.qr_scans.valid, 2);
      const paymentData = (await paymentRequest()).data; assert.equal(paymentData.total, 2); assert.equal(paymentData.rows.reduce((sum, row) => sum + row.recorded_revenue, 0), 200000);
      assert.equal(data.period.from.toISOString(), '2026-09-30T17:00:00.000Z'); assert.equal(data.period.to.toISOString(), '2026-10-31T16:59:59.999Z');
      assert.deepEqual(data.daily.map(item => item.day), ['2026-10-01', '2026-10-31']); assert.equal(data.monthly.length, 1); assert.equal(data.monthly[0].month, '2026-10');
      assert.equal((await report(a, { from: '2026-10-31', to: '2026-10-31' })).tickets_sold, 1);
      const { currentSalesPeriod } = await import(pathToFileURL(path.resolve(__dirname, '../../frontend/src/utils/salesStatistics.js')));
      assert.equal((await report(a, {})).period.from_date, currentSalesPeriod().from);
    });
    await t.test('rounding discounted shares across vendors conserves VND totals and zero-price tickets still count', async () => {
      await reset(); await sale([line(sa, 1, 1), line(sb, 1, 1), line(sb, 1, 1)], { final: 2 });
      const ra = await report(), rb = await report(b); assert.equal(ra.total_revenue + rb.total_revenue, 2);
      assert.ok(Number.isInteger(ra.total_revenue)); assert.ok(Number.isInteger(rb.total_revenue));
      assert.equal(rb.recent_sales.reduce((sum, item) => sum + item.revenue, 0), rb.total_revenue);
      await reset(); await sale([line(sa, 3, 0)]); const free = await report(); assert.equal(free.tickets_sold, 3); assert.equal(free.total_revenue, 0);
    });
    await t.test('HTTP rejects missing/customer/locked/pending/rejected/revoked access and invalid dates', async () => {
      assert.equal((await request(october, null)).status, 401); assert.equal((await request(october, customer)).status, 403);
      for (const patch of [{ status: 'LOCKED' }, { status: 'PENDING' }, { status: 'ACTIVE', approvalStatus: 'PENDING' }, { status: 'ACTIVE', approvalStatus: 'REJECTED' }]) {
        await User.updateOne({ _id: a._id }, { $set: patch }); assert.equal((await request()).status, 403);
      }
      await User.updateOne({ _id: a._id }, { $set: { status: 'ACTIVE', approvalStatus: 'APPROVED' } });
      const role = roles.find(item => item.role_name === 'ACTIVITY_VENDOR'); await Role.updateOne({ _id: role._id }, { $set: { permissions: [] } });
      assert.equal((await request()).status, 403); await Role.updateOne({ _id: role._id }, { $unset: { permissions: 1 } });
      for (const from of ['2026-02-30', '2026-11-01', '', '2026-10-01T00:00:00Z']) assert.equal((await request({ from, to: october.to })).status, 400);
    });
    await t.test('reading the dashboard does not modify any booking/payment/scan/account data', async () => {
      const snapshot = async () => JSON.stringify(await Promise.all([Booking, BookingDetail, Payment, QrScanLog, User].map(model => model.find({}).sort({ _id: 1 }).lean())));
      const before = await snapshot(); await request(); await report(b); await paymentRequest(); assert.equal(await snapshot(), before);
    });
    await t.test('payment tracking uses actual Payment statuses and attributes revenue only to the completing receipt', async () => {
      await reset();
      await sale([line(sa, 3)], { payments: [
        { amount: 300000, status: 'FAILED', payment_date: new Date('2026-10-01T05:00:00Z') },
        { amount: 300000, status: 'PENDING', payment_date: new Date('2026-10-02T05:00:00Z') },
        { amount: 100000, payment_date: new Date('2026-10-03T05:00:00Z') },
        { amount: 200000, payment_date: new Date('2026-10-04T05:00:00Z') },
        { amount: 300000, payment_date: new Date('2026-11-01T05:00:00Z') },
      ] });
      await sale([line(sa)], { status: 'CANCELLED' });
      await sale([line(sa)], { status: 'REFUNDED', payments: [{ amount: -100000, status: 'REFUNDED' }] });
      await sale([line(sa, 2, 200000), line(sb, 2, 200000)], { final: 700000 });
      const response = await paymentRequest({ ...october, vendor_id: String(b._id), payment_id: new mongoose.Types.ObjectId().toString(), page_size: '100' });
      assert.equal(response.status, 200); const data = response.data;
      assert.equal(data.total, 7); assert.equal(data.rows.reduce((sum, row) => sum + row.recorded_revenue, 0), 650000);
      assert.deepEqual(new Set(data.rows.map(row => row.payment_status)), new Set(['PENDING', 'FAILED', 'SUCCESS', 'REFUNDED']));
      assert.equal(data.rows.filter(row => row.recorded_revenue > 0).length, 2);
      assert.equal((await report()).total_revenue, 650000);
      const early = await paymentRequest({ from: '2026-10-01', to: '2026-10-03' }); assert.ok(early.data.rows.every(row => row.recorded_revenue === 0));
      const later = await paymentRequest({ from: '2026-11-01', to: '2026-11-30' }); assert.equal(later.data.total, 1); assert.equal(later.data.rows[0].recorded_revenue, 0);
      for (const forbidden of ['Ticket B', 'guest_name', 'guest_email', 'guest_phone', 'qr_code', 'transaction_id', 'payment_gateway', 'note', '"amount"']) assert.ok(!JSON.stringify(data).includes(forbidden), forbidden);
      const pending = await paymentRequest({ ...october, status: 'PENDING' }); assert.equal(pending.data.total, 1); assert.equal(pending.data.rows[0].booking_status, 'CONFIRMED'); assert.equal(pending.data.rows[0].recorded_revenue, 0);
    });
    await t.test('payment pagination counts the complete matching set, validates queries and isolates roles/owners', async () => {
      await reset();
      for (let i = 0; i < 25; i++) await sale([line(sa)], { status: 'PENDING', payments: [{ amount: 100000, status: 'PENDING' }] });
      await sale([line(sa)], { payments: [] }); await sale([line(sb)]);
      const first = (await paymentRequest()).data, second = (await paymentRequest({ ...october, page: '2' })).data, third = (await paymentRequest({ ...october, page: '3' })).data;
      assert.equal(first.total, 25); assert.equal(first.rows.length, 10); assert.equal(first.total_pages, 3); assert.equal(second.rows.length, 10); assert.equal(third.rows.length, 5);
      assert.equal(new Set([...first.rows, ...second.rows, ...third.rows].map(row => `${row.payment_id}/${row.detail_id}`)).size, 25);
      assert.equal((await paymentRequest({ ...october, status: 'FAILED' })).data.total, 0);
      assert.equal((await paymentRequest({ ...october, vendor_id: String(b._id), booking_id: String(b._id) })).data.total, 25);
      assert.equal((await paymentRequest(october, b)).data.total, 1);
      assert.equal((await paymentRequest(october, null)).status, 401);
      for (const user of [hotel, customer, admin, manager]) assert.equal((await paymentRequest(october, user)).status, 403);
      const hotelSettlements = await fetch(origin + '/api/vendor/settlements', { headers: { Authorization: `Bearer ${token(hotel)}` } });
      assert.equal(hotelSettlements.status, 200, 'Hotel owner retains its existing settlement reader');
      for (const patch of [{ page: '0' }, { page: '1.5' }, { page_size: '101' }, { page: '99999999999999999' }, { status: 'CONFIRMED' }, { from: '2026-02-30' }]) assert.equal((await paymentRequest({ ...october, ...patch })).status, 400);
      for (const patch of [{ status: 'LOCKED' }, { status: 'ACTIVE', approvalStatus: 'PENDING' }]) {
        await User.updateOne({ _id: a._id }, { $set: patch }); assert.equal((await paymentRequest()).status, 403);
      }
      await User.updateOne({ _id: a._id }, { $set: { status: 'ACTIVE', approvalStatus: 'APPROVED' } });
      const role = roles.find(item => item.role_name === 'ACTIVITY_VENDOR'); await Role.updateOne({ _id: role._id }, { $set: { permissions: [] } });
      assert.equal((await paymentRequest()).status, 403); await Role.updateOne({ _id: role._id }, { $unset: { permissions: 1 } });
    });
    const chromeBinary = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    await t.test('browser: sales and payment menus, direct route/reload, pagination, filters, race protection and mobile layout', { skip: !fs.existsSync(chromeBinary) || !fs.existsSync(path.join(frontend, 'index.html')) }, async () => {
      await golden();
      const me = await fetch(origin + '/api/auth/me', { headers: { Authorization: `Bearer ${token(a)}` } });
      const currentUser = (await me.json()).data;
      await require('./sales-statistics-browser.cjs')({ origin, directory, chromeBinary, token: token(a), currentUser, faults, requests, paymentRequests,
        preparePayments: async () => {
          await golden();
          for (let i = 0; i < 13; i++) await sale([line(sa)], { status: 'PENDING', payments: [{ amount: 100000, status: 'FAILED' }] });
          await sale([line(sa)], { status: 'PENDING', payments: [{ amount: 100000, status: 'PENDING' }] });
          await sale([line(sa)], { status: 'REFUNDED', payments: [{ amount: 100000, status: 'REFUNDED' }] });
        },
      });
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (mongoose.connection.readyState === 1) { try { await mongoose.connection.db.admin().command({ shutdown: 1 }); } catch {} }
    await mongoose.disconnect(); mongo.kill();
    await new Promise(resolve => mongo.exitCode !== null ? resolve() : mongo.once('exit', resolve));
    const target = path.resolve(directory), temp = path.resolve(os.tmpdir()) + path.sep;
    if (target.startsWith(temp) && path.basename(target).startsWith('travelio-sales-test-')) fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
