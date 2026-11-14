const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'qr-no-show-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/qr-no-show-test';
const mongoose = require('mongoose');
const { BookingDetail, Facility, Service, ServiceInventory } = require('../src/models');
const vendorService = require('../src/services/vendor.service');
const { ROLES } = require('../src/middlewares/authMiddleware');

afterEach(() => mock.restoreAll());

const id = () => new mongoose.Types.ObjectId();
const chain = (value) => { const c = { select: () => c, populate: () => c, lean: () => Promise.resolve(value) }; return c; };
const vnDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);

const setup = (detailsFor) => {
  const vendor = id(); const facility = { _id: id(), name: 'Hotel A', check_in_policy: {} };
  const room = { _id: id(), name: 'Deluxe', type: 'ROOM', facility_id: facility._id };
  mock.method(Facility, 'find', (filter) => { assert.equal(String(filter.vendor_id), String(vendor)); return chain([facility]); });
  mock.method(Service, 'find', () => chain([room]));
  mock.method(ServiceInventory, 'find', () => chain([]));
  let query;
  mock.method(BookingDetail, 'find', (q) => { query = q; return chain(detailsFor({ facility, room })); });
  return { user: { id: String(vendor), role: ROLES.HOTEL_OWNER }, getQuery: () => query };
};

const detail = ({ facility, room }, day, extra = {}) => ({
  _id: id(), qr_code: 'TVL-QR-AAAAAAAAAAAAAAAAAAAAAAAA', service_id: room._id, facility_id: facility._id,
  check_in_date: new Date(`${day}T00:00:00+07:00`), check_out_date: new Date(`${day}T00:00:00+07:00`),
  booking_id: { booking_code: 'TVL-1', guest_name: 'Nguyễn Văn An', guest_phone: '0901234567', status: 'CONFIRMED' }, ...extra
});

test('lists name and phone only after check-in time + 2 hours, scoped to the vendor', async () => {
  const past = vnDay(new Date(Date.now() - 2 * 86400000));
  const { user, getQuery } = setup((ctx) => [detail(ctx, past)]);
  const out = await vendorService.getQrNoShows(user, { date: past });
  assert.equal(out.total, 1);
  assert.equal(out.data[0].guest_name, 'Nguyễn Văn An');
  assert.equal(out.data[0].guest_phone, '0901234567');
  assert.equal(getQuery().check_in_status, 'PENDING');
});

test('hides guests whose check-in time has not passed by 2 hours', async () => {
  const today = vnDay();
  const { user } = setup((ctx) => [detail(ctx, today, { time_slot: new Date(Date.now() + 3600000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) })]);
  const out = await vendorService.getQrNoShows(user, { date: today });
  assert.equal(out.total, 0);
});

test('rejects managers and customers; rejects malformed dates', async () => {
  await assert.rejects(() => vendorService.getQrNoShows({ id: String(id()), role: ROLES.MANAGER }, {}), { statusCode: 403 });
  await assert.rejects(() => vendorService.getQrNoShows({ id: String(id()), role: ROLES.HOTEL_OWNER }, { date: 'bad' }), (e) => e.statusCode === 400 || e.statusCode === undefined);
});
