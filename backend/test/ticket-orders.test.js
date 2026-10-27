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
test('cancellation does not handle paid, issued tickets or redeemed points', async () => {
  for (const [overrides, details, payments] of [[{}, [detail()], [{ status: 'SUCCESS' }]], [{}, [{ ...detail(), qr_code: 'LEGACY-ISSUED' }], []], [{ points_redeemed: 10 }, [detail()], []]]) {
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

test('hotel room booking supports cancellation request and hotel owner approval', async () => {
  setup({}, [detail(vendor, 'ROOM')]);
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  const customerBooking = await bookingForCustomer(customer, bookingId);
  assert.equal(customerBooking.can_request_cancellation, true);
  await requestCancellation(customer, bookingId, {
    request_id: 'customer-request-hotel-cancel',
    reason: 'Thay đổi kế hoạch du lịch',
    type: 'CANCEL'
  });

  mock.restoreAll();
  setup(
    {
      cancellation_requests: [
        {
          _id: requestId,
          request_id: 'customer-request-hotel-cancel',
          status: 'PENDING',
          type: 'CANCEL',
          reason: 'Thay đổi kế hoạch du lịch'
        }
      ]
    },
    [detail(vendor, 'ROOM')]
  );
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  const decided = await decideCancellation(vendor, bookingId, requestId, {
    status: 'APPROVED',
    reason: 'Đồng ý hủy phòng'
  });
  assert.equal(decided.can_process_cancellation, true);
});

test('hotel room booking supports date change request and hotel owner decision', async () => {
  setup({}, [detail(vendor, 'ROOM')]);
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  await requestCancellation(customer, bookingId, {
    request_id: 'customer-request-hotel-date',
    reason: 'Muốn dời lịch sang tháng sau',
    type: 'CHANGE_DATE',
    new_date: '2026-11-20'
  });

  mock.restoreAll();
  setup(
    {
      cancellation_requests: [
        {
          _id: requestId,
          request_id: 'customer-request-hotel-date',
          status: 'PENDING',
          type: 'CHANGE_DATE',
          new_date: new Date('2026-11-20'),
          reason: 'Muốn dời lịch sang tháng sau'
        }
      ]
    },
    [detail(vendor, 'ROOM')]
  );
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  mock.method(BookingDetail, 'updateMany', async () => ({ modifiedCount: 1 }));

  const approved = await decideCancellation(vendor, bookingId, requestId, {
    status: 'APPROVED',
    reason: 'Đã xếp phòng ngày mới'
  });
  assert.ok(approved);

  mock.restoreAll();
  setup(
    {
      cancellation_requests: [
        {
          _id: requestId,
          request_id: 'customer-request-hotel-date',
          status: 'PENDING',
          type: 'CHANGE_DATE',
          new_date: new Date('2026-11-20'),
          reason: 'Muốn dời lịch'
        }
      ]
    },
    [detail(vendor, 'ROOM')]
  );
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  const rejected = await decideCancellation(vendor, bookingId, requestId, {
    status: 'REJECTED',
    reason: 'Hết phòng trống vào ngày này'
  });
  assert.ok(rejected);
});

test('hotel room booking supports refund request and vendor approval sets status to REFUNDED', async () => {
  setup({}, [detail(vendor, 'ROOM')]);
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  await requestCancellation(customer, bookingId, {
    request_id: 'customer-request-hotel-refund',
    reason: 'Khách yêu cầu hoàn tiền theo quy định chính sách',
    type: 'REFUND'
  });

  mock.restoreAll();
  setup(
    {
      cancellation_requests: [
        {
          _id: requestId,
          request_id: 'customer-request-hotel-refund',
          status: 'PENDING',
          type: 'REFUND',
          reason: 'Khách yêu cầu hoàn tiền theo quy định chính sách'
        }
      ]
    },
    [detail(vendor, 'ROOM')]
  );
  let updatedBookingStatus = null;
  mock.method(Booking, 'updateOne', async (filter, update) => {
    if (update.$set && update.$set.status) {
      updatedBookingStatus = update.$set.status;
    }
    return { modifiedCount: 1 };
  });
  const decided = await decideCancellation(vendor, bookingId, requestId, {
    status: 'APPROVED',
    reason: 'Chấp thuận hoàn tiền theo chính sách'
  });
  assert.ok(decided);
  assert.equal(updatedBookingStatus, 'REFUNDED');
});

