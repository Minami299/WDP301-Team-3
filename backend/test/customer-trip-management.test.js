const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'customer-trip-management-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-trip-tests';
const {
  Booking,
  BookingDetail,
  Payment,
  FacilityImage,
  User,
} = require('../src/models');
const {
  bookingForCustomer,
  listBookings,
} = require('../src/services/booking.service');

const customer = '507f1f77bcf86cd799439011';
const stranger = '507f1f77bcf86cd799439012';
const bookingId = '507f1f77bcf86cd799439013';
const facilityId = '507f1f77bcf86cd799439014';
const token = 'TVL-QR-BACKEND-EXISTING-TOKEN';
const query = (data) => ({
  select: () => query(data),
  populate: () => query(data),
  lean: () => query(data),
  sort: () => query(data),
  limit: () => query(data),
  then: (resolve, reject) => Promise.resolve(data).then(resolve, reject),
});
afterEach(() => mock.restoreAll());

function setup(status = 'CONFIRMED', checkIn = 'PENDING') {
  const booking = {
    _id: bookingId,
    customer_id: customer,
    status,
    cancellation_requests: [],
  };
  mock.method(Booking, 'findOne', (filter) =>
    query(filter.customer_id === customer ? booking : null),
  );
  mock.method(BookingDetail, 'find', () =>
    query([
      {
        _id: 'detail',
        quantity: 2,
        qr_code: token,
        check_in_status: checkIn,
        service_id: {
          name: 'Deluxe',
          type: 'ROOM',
          facility_id: {
            _id: facilityId,
            name: 'Hotel',
            type: 'HOTEL',
            vendor_id: stranger,
          },
        },
        check_in_date: new Date('2026-11-20'),
        check_out_date: new Date('2026-11-22'),
      },
    ]),
  );
  mock.method(Payment, 'find', () =>
    query([{ transaction_id: 'SEPAY-123', status: 'SUCCESS', amount: 100000 }]),
  );
  mock.method(FacilityImage, 'find', (filter) => {
    assert.deepEqual(filter, { facility_id: { $in: [facilityId] } });
    return query([
      {
        facility_id: facilityId,
        image_url: 'https://example.test/real-primary.jpg',
        is_primary: true,
      },
      {
        facility_id: facilityId,
        image_url: 'https://example.test/secondary.jpg',
      },
    ]);
  });
  return booking;
}

test('customer detail includes actual facility image/type, room dates and payments', async () => {
  setup();
  const result = await bookingForCustomer(customer, bookingId);
  assert.equal(
    result.details[0].facility_image,
    'https://example.test/real-primary.jpg',
  );
  assert.equal(result.details[0].facility_name, 'Hotel');
  assert.equal(result.details[0].service_name, 'Deluxe');
  assert.equal(result.details[0].service_type, 'ROOM');
  assert.equal(
    result.details[0].check_out_date.toISOString().slice(0, 10),
    '2026-11-22',
  );
  assert.equal(result.details[0].qr_code, token);
  assert.equal(result.payments[0].transaction_id, 'SEPAY-123');
});

test('customer detail API withholds existing usage tokens for all ineligible statuses', async () => {
  for (const status of ['PENDING', 'CANCELLED', 'COMPLETED', 'REFUNDED']) {
    mock.restoreAll();
    setup(status);
    const result = await bookingForCustomer(customer, bookingId);
    assert.equal(Object.hasOwn(result.details[0], 'qr_code'), false);
  }
  for (const checkIn of ['CHECKED_IN', 'NO_SHOW']) {
    mock.restoreAll();
    setup('CONFIRMED', checkIn);
    assert.equal(
      Object.hasOwn(
        (await bookingForCustomer(customer, bookingId)).details[0],
        'qr_code',
      ),
      false,
    );
  }
});

test('foreign and invalid booking IDs do not disclose customer data', async () => {
  setup();
  await assert.rejects(bookingForCustomer(stranger, bookingId), {
    statusCode: 404,
  });
  await assert.rejects(bookingForCustomer(customer, 'invalid-id'), {
    statusCode: 400,
  });
  assert.equal(BookingDetail.find.mock.callCount(), 0);
});

test('list keeps the customer filter and returns enriched details from the same API', async () => {
  const booking = setup();
  mock.method(Booking, 'find', (filter) => {
    assert.deepEqual(filter, { customer_id: customer });
    return query([booking]);
  });
  const result = await listBookings(customer);
  assert.equal(result.length, 1);
  assert.equal(
    result[0].details[0].facility_image,
    'https://example.test/real-primary.jpg',
  );
});

test('HTTP trip endpoints require an active Customer JWT and enforce booking ownership', async () => {
  const express = require('express');
  const { generateToken } = require('../src/middlewares/authMiddleware');
  const routes = require('../src/routes/booking.routes');
  const ownBooking = setup();
  let role = 'CUSTOMER';
  let status = 'ACTIVE';
  mock.method(User, 'findById', () =>
    query({ status, role_id: { role_name: role } }),
  );
  mock.method(Booking, 'find', (filter) => {
    assert.equal(filter.customer_id, customer);
    return query([ownBooking]);
  });
  const app = express();
  app.use('/api/bookings', routes);
  app.use((error, req, res, next) =>
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message }),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/bookings`;
  const headers = {
    Authorization: `Bearer ${generateToken({ id: customer, role: 'CUSTOMER' })}`,
  };
  try {
    for (const endpoint of [url, `${url}/${bookingId}`])
      assert.equal((await fetch(endpoint)).status, 401);
    const list = await fetch(url, { headers });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).data[0]._id, bookingId);
    const detail = await fetch(`${url}/${bookingId}`, { headers });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.details[0].qr_code, token);
    const foreign = await fetch(`${url}/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${generateToken({ id: stranger, role: 'CUSTOMER' })}`,
      },
    });
    assert.equal(foreign.status, 404);
    assert.equal((await foreign.json()).data, undefined);
    role = 'HOTEL_OWNER';
    assert.equal((await fetch(url, { headers })).status, 403);
    assert.equal((await fetch(`${url}/${bookingId}`, { headers })).status, 403);
    role = 'CUSTOMER';
    status = 'LOCKED';
    assert.equal((await fetch(url, { headers })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
