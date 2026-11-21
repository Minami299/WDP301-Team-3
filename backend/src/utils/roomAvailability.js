const isActiveBooking = (detail, now) => {
  const booking = detail.booking_id;
  return booking?.status === 'CONFIRMED' ||
    (booking?.status === 'PENDING' && booking?.expires_at && new Date(booking.expires_at) > now);
};

const isOverlappingNight = (start, end, nightStart, nightEnd) =>
  new Date(start) < nightEnd && new Date(end) > nightStart;

/** Return the minimum inventory available on any night in [checkIn, checkOut). */
const availabilityForRange = ({ totalRooms, checkIn, checkOut, bookings = [], holds = [], now = new Date(), excludeHoldToken }) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { available_rooms: 0, taken_rooms: 0, booked_rooms: 0, held_rooms: 0 };
  }

  let minAvailable = Math.max(0, Number(totalRooms) || 0);
  let bottleneckTaken = 0;
  let bottleneckBooked = 0;
  let bottleneckHeld = 0;
  for (let night = new Date(start); night < end; night.setUTCDate(night.getUTCDate() + 1)) {
    const nightStart = new Date(night);
    const nightEnd = new Date(night);
    nightEnd.setUTCDate(nightEnd.getUTCDate() + 1);
    const booked = bookings.filter(d => isActiveBooking(d, now) && isOverlappingNight(d.check_in_date, d.check_out_date, nightStart, nightEnd))
      .reduce((sum, d) => sum + (Number(d.quantity) || 1), 0);
    const held = holds.filter(h => h.expires_at && new Date(h.expires_at) > now && h.hold_token !== excludeHoldToken &&
      isOverlappingNight(h.check_in_date, h.check_out_date, nightStart, nightEnd))
      .reduce((sum, h) => sum + (Number(h.rooms) || 1), 0);
    const available = Math.max(0, (Number(totalRooms) || 0) - booked - held);
    if (available < minAvailable) {
      minAvailable = available;
      bottleneckTaken = booked + held;
      bottleneckBooked = booked;
      bottleneckHeld = held;
    }
  }
  return { available_rooms: minAvailable, taken_rooms: bottleneckTaken, booked_rooms: bottleneckBooked, held_rooms: bottleneckHeld };
};

module.exports = { availabilityForRange };
