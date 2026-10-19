import { test } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {
  groupTrips,
  canShowUsageQr,
  serviceType,
  detailDate,
  detailQuantity,
  vietnamToday,
} from '../src/utils/tripManagement.js';

const trip = (id, status, date) => ({
  _id: id,
  status,
  details: date ? [{ visit_date: date }] : [],
});

test('only confirmed trips with an upcoming service date enter Upcoming; completed is explicit', () => {
  const bookings = [
    trip('future', 'CONFIRMED', '2026-10-20'),
    trip('today', 'CONFIRMED', '2026-10-19'),
    trip('past', 'CONFIRMED', '2026-10-18'),
    trip('complete', 'COMPLETED', '2026-10-20'),
    trip('cancel', 'CANCELLED', '2026-10-20'),
    trip('pending', 'PENDING', '2026-10-20'),
    trip('refund', 'REFUNDED', '2026-10-20'),
    trip('undated', 'CONFIRMED'),
  ];
  const grouped = groupTrips(bookings, '2026-10-19');
  assert.deepEqual(
    grouped.upcoming.map((b) => b._id),
    ['future', 'today'],
  );
  assert.deepEqual(
    grouped.completed.map((b) => b._id),
    ['complete'],
  );
  assert.deepEqual(
    grouped.cancelled.map((b) => b._id),
    ['cancel'],
  );
  assert.deepEqual(
    grouped.pending.map((b) => b._id),
    ['pending'],
  );
  assert.deepEqual(
    grouped.other.map((b) => b._id),
    ['past', 'refund', 'undated'],
  );
  assert.equal(Object.values(grouped).flat().length, bookings.length);
});

test('hotel check-in and legacy inventory dates use the same trip classification', () => {
  const hotel = {
    _id: 'room',
    status: 'CONFIRMED',
    details: [
      {
        service_type: 'ROOM',
        check_in_date: '2026-10-20',
        check_out_date: '2026-10-22',
        quantity: 2,
      },
    ],
  };
  const legacy = {
    _id: 'legacy',
    status: 'CONFIRMED',
    details: [
      {
        inventory_id: {
          target_date: '2026-10-21',
          service_id: { type: 'TICKET' },
        },
        quantity: 3,
      },
    ],
  };
  assert.equal(serviceType(hotel.details[0]), 'HOTEL');
  assert.equal(detailQuantity(hotel.details[0]), '2 phòng');
  assert.equal(detailQuantity(legacy.details[0]), '3 vé');
  assert.equal(detailDate(legacy.details[0]), '2026-10-21');
  assert.deepEqual(groupTrips([hotel, legacy], '2026-10-19').upcoming, [
    hotel,
    legacy,
  ]);
});

test('calendar boundary uses Vietnam time, including browser time zones outside Vietnam', () => {
  assert.equal(vietnamToday(new Date('2026-10-18T17:00:00Z')), '2026-10-19');
  assert.equal(vietnamToday(new Date('2026-10-18T16:59:59Z')), '2026-10-18');
});

test('usage QR stays hidden for unpaid/cancelled/completed/refunded or redeemed services', () => {
  const detail = {
    qr_code: 'TVL-QR-EXISTING-BACKEND-TOKEN',
    check_in_status: 'PENDING',
  };
  assert.equal(canShowUsageQr({ status: 'CONFIRMED' }, detail), true);
  for (const status of ['PENDING', 'CANCELLED', 'COMPLETED', 'REFUNDED'])
    assert.equal(canShowUsageQr({ status }, detail), false);
  for (const status of ['CHECKED_IN', 'NO_SHOW'])
    assert.equal(
      canShowUsageQr(
        { status: 'CONFIRMED' },
        { ...detail, check_in_status: status },
      ),
      false,
    );
  for (const value of ['', ' ', undefined])
    assert.equal(
      canShowUsageQr({ status: 'CONFIRMED' }, { qr_code: value }),
      false,
    );
});

test('QR encoding uses the existing backend token and produces a PNG image', async () => {
  const token = 'TVL-QR-0123456789ABCDEF01234567';
  const png = await QRCode.toDataURL(token, { width: 256, margin: 4 });
  assert.match(png, /^data:image\/png;base64,/);
  assert.equal(
    QRCode.create(token)
      .segments.map((segment) =>
        typeof segment.data === 'string'
          ? segment.data
          : new TextDecoder().decode(segment.data),
      )
      .join(''),
    token,
  );
});
