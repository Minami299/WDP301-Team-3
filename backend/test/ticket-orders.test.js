const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'ticket-orders-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-unit-tests';
const mongoose = require('mongoose');
const { Booking, BookingDetail, Payment } = require('../src/models');
const { bookingForCustomer, vendorBooking, requestCancellation, decideCancellation } = require('../src/services/booking.service');
const customer = '507f1f77bcf86cd799439011', vendor = '507f1f77bcf86cd799439012', other = '507f1f77bcf86cd799439013';
const bookingId = '507f1f77bcf86cd799439014', requestId = '507f1f77bcf86cd799439015';
const query = value => ({ lean: () => query(value), populate: () => query(value), session: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
const detail = (owner = vendor, type = 'TICKET') => ({ _id: new mongoose.Types.ObjectId(), service_id: { type, facility_id: { vendor_id: owner, type: type === 'TICKET' ? 'ATTRACTION' : 'HOTEL' } }, quantity: 2, unit_price: 150000 });
const setup = (overrides = {}, details = [detail()], payments = []) => {
  const booking = { _id: bookingId, customer_id: customer, status: 'PENDING', total_amount: 380000, final_amount: 380000, ...overrides };
  mock.method(Booking, 'findOne', fields => query(String(fields.customer_id) === customer ? booking : null));
  mock.method(Booking, 'findById', () => query(booking));
  mock.method(BookingDetail, 'find', () => query(details));
  mock.method(Payment, 'find', () => query(payments));
  mock.method(mongoose.connection, 'transaction', async fn => fn({}));
  return booking;
};
afterEach(() => mock.restoreAll());

test('customer cannot read or cancel another customer order', async () => {
  setup();
  await assert.rejects(bookingForCustomer(other, bookingId), { statusCode: 404 });
  await assert.rejects(requestCancellation(other, bookingId, { request_id: 'customer-request-1234', reason: 'Không thể tham gia' }), { statusCode: 404 });
});
test('vendor cannot read another vendor order; legacy mixed lines and totals are scoped', async () => {
  setup(); await assert.rejects(vendorBooking(other, bookingId), { statusCode: 404 });
  mock.restoreAll(); setup({}, [detail(vendor), detail(other)]);
  const own = await vendorBooking(vendor, bookingId);
  assert.equal(own.details.length, 1); assert.equal(own.final_amount, 300000); assert.equal(own.can_process_cancellation, false); assert.equal(own.payments, undefined);
});
test('cancellation does not handle hotel, paid, issued tickets or redeemed points', async () => {
  for (const [overrides, details, payments] of [[{}, [detail(vendor, 'ROOM')], []], [{}, [detail()], [{ status: 'SUCCESS' }]], [{}, [{ ...detail(), qr_code: 'LEGACY-ISSUED' }], []], [{ points_redeemed: 10 }, [detail()], []]]) {
    mock.restoreAll(); setup(overrides, details, payments);
    assert.equal((await bookingForCustomer(customer, bookingId)).can_request_cancellation, false);
    await assert.rejects(requestCancellation(customer, bookingId, { request_id: 'customer-request-1234', reason: 'Hủy' }), { statusCode: 409 });
  }
});
test('pending cancellation prevents a second request; retries preserve original history', async () => {
  setup({ cancellation_requests: [{ _id: requestId, request_id: 'customer-request-1234', status: 'PENDING', reason: 'Lý do gốc' }] });
  const update = mock.method(Booking, 'updateOne', async () => { throw Error('Retry must not write'); });
  const retry = await requestCancellation(customer, bookingId, { request_id: 'customer-request-1234', reason: 'Thay đổi' });
  assert.equal(retry.cancellation_requests[0].reason, 'Lý do gốc'); assert.equal(update.mock.callCount(), 0);
  await assert.rejects(requestCancellation(customer, bookingId, { request_id: 'another-request-1234', reason: 'Hủy' }), { statusCode: 409 });
});
test('decision retries do not write/restock; opposite decision is rejected', async () => {
  setup({ status: 'CANCELLED', cancellation_requests: [{ _id: requestId, request_id: 'customer-request-1234', status: 'APPROVED' }] });
  const update = mock.method(Booking, 'updateOne', async () => { throw Error('Must not write'); });
  assert.equal((await decideCancellation(vendor, bookingId, requestId, { status: 'APPROVED' })).status, 'CANCELLED');
  assert.equal(update.mock.callCount(), 0);
  await assert.rejects(decideCancellation(vendor, bookingId, requestId, { status: 'REJECTED' }), { statusCode: 409 });
});
test('invalid reason/status/id rejected before database mutations', async () => {
  await assert.rejects(requestCancellation(customer, bookingId, { request_id: 'bad', reason: 'Hủy' }), { statusCode: 400 });
  await assert.rejects(requestCancellation(customer, bookingId, { request_id: 'customer-request-1234', reason: ' ' }), { statusCode: 400 });
  await assert.rejects(requestCancellation(customer, bookingId, { request_id: 'customer-request-1234', reason: 'x'.repeat(1001) }), { statusCode: 400 });
  await assert.rejects(decideCancellation(vendor, bookingId, requestId, { status: 'REFUNDED' }), { statusCode: 400 });
  await assert.rejects(decideCancellation(vendor, bookingId, requestId, { status: 'APPROVED', reason: {} }), { statusCode: 400 });
});
