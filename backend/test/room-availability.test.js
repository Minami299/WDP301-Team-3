const test = require('node:test');
const assert = require('node:assert/strict');
const { availabilityForRange } = require('../src/utils/roomAvailability');

test('uses the tightest night instead of summing bookings across different nights', () => {
  const now = new Date('2026-11-01T00:00:00.000Z');
  const bookings = [
    { check_in_date: new Date('2026-11-10'), check_out_date: new Date('2026-11-11'), quantity: 2, booking_id: { status: 'CONFIRMED' } },
    { check_in_date: new Date('2026-11-11'), check_out_date: new Date('2026-11-12'), quantity: 2, booking_id: { status: 'CONFIRMED' } },
  ];
  const result = availabilityForRange({ totalRooms: 5, checkIn: '2026-11-10', checkOut: '2026-11-12', bookings, now });
  assert.equal(result.available_rooms, 3);
  assert.equal(result.booked_rooms, 2);
});

test('counts active holds and pending bookings but ignores expired reservations', () => {
  const now = new Date('2026-11-01T00:00:00.000Z');
  const bookings = [
    { check_in_date: '2026-11-10', check_out_date: '2026-11-11', quantity: 2, booking_id: { status: 'PENDING', expires_at: '2026-11-02T00:00:00.000Z' } },
    { check_in_date: '2026-11-10', check_out_date: '2026-11-11', quantity: 4, booking_id: { status: 'PENDING', expires_at: '2026-10-31T00:00:00.000Z' } },
  ];
  const holds = [
    { check_in_date: '2026-11-10', check_out_date: '2026-11-11', rooms: 1, expires_at: '2026-11-02T00:00:00.000Z', hold_token: 'mine' },
    { check_in_date: '2026-11-10', check_out_date: '2026-11-11', rooms: 1, expires_at: '2026-10-31T00:00:00.000Z', hold_token: 'expired' },
  ];
  const result = availabilityForRange({ totalRooms: 5, checkIn: '2026-11-10', checkOut: '2026-11-11', bookings, holds, now, excludeHoldToken: 'mine' });
  assert.equal(result.available_rooms, 3);
  assert.equal(result.booked_rooms, 2);
  assert.equal(result.held_rooms, 0);
});
