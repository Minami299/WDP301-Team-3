const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'ticket-orders-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-unit-tests';
const mongoose = require('mongoose');
const { Booking, BookingDetail, Payment, Promotion, User, LoyaltyPointTransaction } = require('../src/models');
const { bookingForCustomer, vendorBooking, requestCancellation, decideCancellation, listRedeemablePromotions, redeemPromotionWithPoints, listCustomerPointTransactions } = require('../src/services/booking.service');
const customer = '507f1f77bcf86cd799439011', vendor = '507f1f77bcf86cd799439012', other = '507f1f77bcf86cd799439013';
const bookingId = '507f1f77bcf86cd799439014', requestId = '507f1f77bcf86cd799439015';
const query = value => ({ lean: () => query(value), populate: () => query(value), sort: () => query(value), select: () => query(value), limit: () => query(value), session: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
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

test('refund request supports POINTS and BANK_TRANSFER options', async () => {
  setup({}, [detail(vendor, 'ROOM')]);
  await assert.rejects(
    requestCancellation(customer, bookingId, {
      request_id: 'cust-req-bank-fail',
      reason: 'Yêu cầu hoàn tiền',
      type: 'REFUND',
      refund_method: 'BANK_TRANSFER'
    }),
    { statusCode: 400 }
  );

  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  const bankReq = await requestCancellation(customer, bookingId, {
    request_id: 'cust-req-bank-ok',
    reason: 'Yêu cầu hoàn về ngân hàng',
    type: 'REFUND',
    refund_method: 'BANK_TRANSFER',
    refund_bank_name: 'Vietcombank',
    refund_account_number: '123456789',
    refund_account_name: 'NGUYEN VAN A'
  });
  assert.ok(bankReq);

  mock.restoreAll();
  setup(
    {
      final_amount: 300000,
      points_redeemed: 10,
      cancellation_requests: [
        {
          _id: requestId,
          request_id: 'cust-req-points-ok',
          status: 'PENDING',
          type: 'REFUND',
          refund_method: 'POINTS',
          reason: 'Hoàn bằng điểm'
        }
      ]
    },
    [detail(vendor, 'ROOM')]
  );
  let updatedPoints = 0;
  mock.method(User, 'updateOne', async (filter, update) => {
    if (update.$inc?.total_loyalty_points) {
      updatedPoints += update.$inc.total_loyalty_points;
    }
    return { modifiedCount: 1 };
  });
  mock.method(LoyaltyPointTransaction, 'create', async () => [{ _id: new mongoose.Types.ObjectId() }]);
  mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));

  const approved = await decideCancellation(vendor, bookingId, requestId, {
    status: 'APPROVED',
    reason: 'Chấp thuận hoàn điểm'
  });
  assert.ok(approved);
  assert.equal(updatedPoints, 310);
});

test('listRedeemablePromotions returns active voucher templates with points_cost', async () => {
  const promoId = new mongoose.Types.ObjectId();
  mock.method(Promotion, 'find', () => query([{
    _id: promoId,
    code: 'REDEEM-50K',
    points_cost: 50,
    discount_type: 'FIXED_AMOUNT',
    discount_value: 50000,
    usage_limit: null,
    used_count: 0
  }]));
  mock.method(User, 'findById', () => query({ _id: customer, total_loyalty_points: 120 }));

  const result = await listRedeemablePromotions(customer);
  assert.equal(result.loyalty_points, 120);
  assert.equal(result.vouchers.length, 1);
  assert.equal(result.vouchers[0].code, 'REDEEM-50K');
  assert.equal(result.vouchers[0].points_cost, 50);
});

test('redeemPromotionWithPoints deducts loyalty points and creates personal voucher', async () => {
  const promoId = new mongoose.Types.ObjectId();
  const template = {
    _id: promoId,
    code: 'REDEEM-50K',
    points_cost: 50,
    discount_type: 'FIXED_AMOUNT',
    discount_value: 50000,
    max_discount: null,
    status: 'ACTIVE',
    user_id: null,
    usage_limit: 100,
    used_count: 5
  };
  mock.method(Promotion, 'findOne', () => Promise.resolve(template));
  mock.method(User, 'updateOne', async (filter) => {
    assert.equal(filter._id, customer);
    return { modifiedCount: 1 };
  });
  mock.method(Promotion, 'updateOne', async () => ({ modifiedCount: 1 }));
  let createdVoucher = null;
  mock.method(Promotion, 'create', async (docs) => {
    createdVoucher = { ...docs[0], _id: new mongoose.Types.ObjectId(), toObject() { return this; } };
    return [createdVoucher];
  });
  let createdTransaction = null;
  mock.method(LoyaltyPointTransaction, 'create', async (docs) => {
    createdTransaction = docs[0];
    return [createdTransaction];
  });
  mock.method(User, 'findById', () => query({ _id: customer, total_loyalty_points: 70 }));
  mock.method(mongoose.connection, 'transaction', async fn => fn({}));

  const res = await redeemPromotionWithPoints(customer, promoId.toString());
  assert.ok(res.voucher);
  assert.match(res.voucher.code, /^MY-/);
  assert.equal(res.voucher.user_id, customer);
  assert.equal(res.voucher.discount_value, 50000);
  assert.equal(res.remaining_points, 70);
  assert.equal(createdTransaction.points, -50);
  assert.equal(createdTransaction.user_id, customer);
});

test('redeemPromotionWithPoints rejects when user lacks points', async () => {
  const promoId = new mongoose.Types.ObjectId();
  mock.method(Promotion, 'findOne', () => Promise.resolve({
    _id: promoId,
    code: 'REDEEM-100K',
    points_cost: 100,
    discount_type: 'FIXED_AMOUNT',
    discount_value: 100000,
    status: 'ACTIVE',
    user_id: null
  }));
  mock.method(User, 'updateOne', async () => ({ modifiedCount: 0 }));
  mock.method(mongoose.connection, 'transaction', async fn => fn({}));

  await assert.rejects(redeemPromotionWithPoints(customer, promoId.toString()), {
    statusCode: 400
  });
});

