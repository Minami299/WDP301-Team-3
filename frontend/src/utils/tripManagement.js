// Service dates are calendar dates; compare them against today's date in Vietnam.
export const serviceDay = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export const vietnamToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

export const serviceType = (detail) => {
  const service = detail.service_id || detail.inventory_id?.service_id;
  const facility = service?.facility_id;
  if (
    detail.service_type === 'ROOM' ||
    service?.type === 'ROOM' ||
    detail.check_in_date ||
    detail.facility_type === 'HOTEL' ||
    facility?.type === 'HOTEL'
  )
    return 'HOTEL';
  if (
    detail.service_type === 'TICKET' ||
    service?.type === 'TICKET' ||
    detail.facility_type === 'ATTRACTION' ||
    facility?.type === 'ATTRACTION'
  )
    return 'ATTRACTION';
  return null;
};

export const serviceTypeLabel = (detail) =>
  ({ HOTEL: 'Khách sạn', ATTRACTION: 'Điểm tham quan' })[serviceType(detail)] ||
  'Dịch vụ';
export const detailDate = (detail) =>
  detail.check_in_date || detail.visit_date || detail.inventory_id?.target_date;
export const detailQuantity = (detail) =>
  `${detail.quantity ?? '—'} ${serviceType(detail) === 'HOTEL' ? 'phòng' : serviceType(detail) === 'ATTRACTION' ? 'vé' : 'suất'}`;
export const tripStatusLabel = (status) =>
  ({
    PENDING: 'Chờ thanh toán',
    CONFIRMED: 'Đã xác nhận',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
    REFUNDED: 'Đã hoàn tiền',
  })[status] ||
  status ||
  'Chưa có trạng thái';
export const tripStatusClass = (status) =>
  ({
    PENDING: 'bg-amber-50 text-amber-800',
    CONFIRMED: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
    REFUNDED: 'bg-violet-50 text-violet-800',
  })[status] || 'bg-slate-100 text-slate-600';

export function groupTrips(bookings, today = vietnamToday()) {
  const groups = {
    upcoming: [],
    completed: [],
    cancelled: [],
    pending: [],
    other: [],
  };
  for (const booking of bookings) {
    if (booking.status === 'PENDING') groups.pending.push(booking);
    else if (booking.status === 'COMPLETED') groups.completed.push(booking);
    else if (booking.status === 'CANCELLED') groups.cancelled.push(booking);
    else if (
      booking.status === 'CONFIRMED' &&
      booking.details?.some((detail) => serviceDay(detailDate(detail)) >= today)
    )
      groups.upcoming.push(booking);
    else groups.other.push(booking);
  }
  return groups;
}

export const canShowUsageQr = (booking, detail) =>
  booking.status === 'CONFIRMED' &&
  (!detail.check_in_status || detail.check_in_status === 'PENDING') &&
  typeof detail.qr_code === 'string' &&
  detail.qr_code.trim().length > 0;
