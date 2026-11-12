export const checkinPath = (code) => `/checkin/${encodeURIComponent(code)}`;

export const checkinUrl = (code, origin = typeof window === 'undefined' ? '' : window.location.origin) =>
  `${origin}${checkinPath(code)}`;

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });

export const formatDay = (day) => (day ? DATE_FORMAT.format(new Date(`${day}T12:00:00+07:00`)) : '');

export const formatUsedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return `${TIME_FORMAT.format(date)} ngày ${DATE_FORMAT.format(date)}`;
};

export const formatStay = (from, to) => (from && to && from !== to ? `${formatDay(from)} đến ${formatDay(to)}` : formatDay(from));
