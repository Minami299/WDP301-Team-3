const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'checkin-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/checkin-test';
const express = require('express');
const { BookingDetail, QrScanLog } = require('../src/models');
const checkin = require('../src/services/checkin.service');
const routes = require('../src/routes/checkin.routes');

afterEach(() => mock.restoreAll());

const CODE = 'TVL-QR-ABCDEF0123456789ABCDEF01';
const vnDay = (offset = 0) => checkin.dayOf(new Date(Date.now() + offset * 86400000));

const detailFixture = (overrides = {}) => ({
  _id: 'detail-1',
  qr_code: CODE,
  check_in_status: 'PENDING',
  visit_date: new Date(),
  service_id: { name: 'Vé người lớn', facility_id: { _id: 'fac-1', name: 'Bà Nà Hills', vendor_id: 'vendor-1' } },
  booking_id: {
    booking_code: 'TVL-0123456789ABCDEF',
    guest_name: 'Nguyễn Văn An',
    guest_email: 'an@example.com',
    status: 'CONFIRMED'
  },
  ...overrides
});

const stubLookup = (detail) => {
  const chain = { populate: () => chain, then: (resolve, reject) => Promise.resolve(detail).then(resolve, reject) };
  mock.method(BookingDetail, 'findOne', () => chain);
};

const serve = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/checkin', routes);
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/api/checkin` };
};

test('normalizeCode takes the code out of a pasted check-in link', () => {
  assert.equal(checkin.normalizeCode(`https://travelio.vn/checkin/${CODE}?x=1`), CODE);
  assert.equal(checkin.normalizeCode(`  ${CODE} `), CODE);
  assert.equal(checkin.maskName('Nguyễn Văn An'), 'N**** V** A*');
});

test('preview is read-only and hides contact details', async () => {
  stubLookup(detailFixture());
  const update = mock.method(BookingDetail, 'updateOne', async () => ({ modifiedCount: 1 }));
  const create = mock.method(QrScanLog, 'create', async () => ({}));
  const { server, url } = await serve();
  try {
    const response = await fetch(`${url}/${CODE}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { data } = await response.json();
    assert.equal(data.result, 'READY');
    assert.equal(data.facility_name, 'Bà Nà Hills');
    assert.equal(data.guest_name, 'N**** V** A*');
    assert.equal(data.booking_code, 'TVL-...CDEF');
    assert.doesNotMatch(JSON.stringify(data), /an@example\.com|Nguyễn/);
    assert.equal(update.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('confirm checks the guest in once and logs the public scan with device data', async () => {
  stubLookup(detailFixture());
  const update = mock.method(BookingDetail, 'updateOne', async () => ({ modifiedCount: 1 }));
  const create = mock.method(QrScanLog, 'create', async () => ({}));
  const { server, url } = await serve();
  try {
    const response = await fetch(`${url}/${CODE}/confirm`, { method: 'POST', headers: { 'User-Agent': 'TestPhone/1.0' } });
    const { data } = await response.json();
    assert.equal(data.result, 'VALID');
    assert.ok(data.checked_in_at);
    assert.deepEqual(update.mock.calls[0].arguments[0], { _id: 'detail-1', check_in_status: 'PENDING' });
    const log = create.mock.calls[0].arguments[0];
    assert.equal(log.source, 'PUBLIC_LINK');
    assert.equal(log.result, 'VALID');
    assert.equal(log.vendor_id, 'vendor-1');
    assert.equal(log.scanned_by, null);
    assert.equal(log.user_agent, 'TestPhone/1.0');
    assert.ok(log.ip);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('a concurrent scan that loses the conditional update reports ALREADY_REDEEMED', async () => {
  stubLookup(detailFixture());
  mock.method(BookingDetail, 'updateOne', async () => ({ modifiedCount: 0 }));
  mock.method(QrScanLog, 'create', async () => ({}));
  const data = await checkin.confirmCheckin(CODE);
  assert.equal(data.result, 'ALREADY_REDEEMED');
});

test('used, unpaid, malformed and unknown codes are rejected without changing data', async () => {
  const update = mock.method(BookingDetail, 'updateOne', async () => ({ modifiedCount: 1 }));
  mock.method(QrScanLog, 'create', async () => ({}));

  stubLookup(detailFixture({ check_in_status: 'CHECKED_IN', checked_in_at: new Date() }));
  assert.equal((await checkin.confirmCheckin(CODE)).result, 'ALREADY_REDEEMED');

  mock.restoreAll();
  mock.method(QrScanLog, 'create', async () => ({}));
  const cancelled = detailFixture();
  cancelled.booking_id.status = 'CANCELLED';
  stubLookup(cancelled);
  const rejected = await checkin.confirmCheckin(CODE);
  assert.equal(rejected.result, 'INVALID');
  assert.equal(rejected.guest_name, null);

  mock.restoreAll();
  const find = mock.method(BookingDetail, 'findOne', () => { throw new Error('must not query'); });
  assert.equal((await checkin.previewCheckin('bad code!')).result, 'INVALID');
  assert.equal(find.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);

  mock.restoreAll();
  stubLookup(null);
  assert.equal((await checkin.previewCheckin(CODE)).result, 'INVALID');
});

test('tickets only work on their visit day and rooms inside the stay', async () => {
  const day = (offset) => new Date(Date.now() + offset * 86400000);
  stubLookup(detailFixture({ visit_date: day(1) }));
  assert.equal((await checkin.previewCheckin(CODE)).result, 'WRONG_DATE');

  stubLookup(detailFixture({ visit_date: day(-1) }));
  assert.equal((await checkin.previewCheckin(CODE)).result, 'WRONG_DATE');

  const room = { visit_date: undefined, check_in_date: day(-1), check_out_date: day(2) };
  stubLookup(detailFixture(room));
  const inside = await checkin.previewCheckin(CODE);
  assert.equal(inside.result, 'READY');
  assert.equal(inside.date_from, vnDay(-1));
  assert.equal(inside.date_to, vnDay(2));

  stubLookup(detailFixture({ ...room, check_in_date: day(3), check_out_date: day(5) }));
  assert.equal((await checkin.previewCheckin(CODE)).result, 'WRONG_DATE');
});

test('hotel lines reach their facility through the inventory service', async () => {
  const inventory = { target_date: new Date(), service_id: { name: 'Deluxe', facility_id: { _id: 'fac-2', name: 'Hotel Sông Hàn', vendor_id: 'vendor-2' } } };
  stubLookup(detailFixture({ service_id: undefined, facility_id: undefined, visit_date: undefined, inventory_id: inventory }));
  const data = await checkin.previewCheckin(CODE);
  assert.equal(data.result, 'READY');
  assert.equal(data.facility_name, 'Hotel Sông Hàn');
  assert.equal(data.service_name, 'Deluxe');
});

test('public check-in is rate limited per client', async () => {
  stubLookup(null);
  mock.method(QrScanLog, 'create', async () => ({}));
  const { server, url } = await serve();
  try {
    let last;
    for (let i = 0; i < 11; i += 1) last = await fetch(`${url}/${CODE}/confirm`, { method: 'POST' });
    assert.equal(last.status, 429);
    assert.ok(Number(last.headers.get('retry-after')) > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
