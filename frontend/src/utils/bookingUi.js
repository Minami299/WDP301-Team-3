const ORDER_STATUS_LABELS = {
  PENDING: 'Chưa thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  COMPLETED: 'Hoàn tất'
};

export const orderStatus = status => ORDER_STATUS_LABELS[status] || status;

export const orderStatusBadgeClass = status => ({
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border border-slate-200',
  REFUNDED: 'bg-violet-50 text-violet-800 border border-violet-200',
  COMPLETED: 'bg-sky-50 text-sky-800 border border-sky-200'
}[status] || 'bg-slate-100 text-slate-700 border border-slate-200');

export const cancellationStatus = status => ({
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã chấp thuận',
  REJECTED: 'Đã từ chối'
}[status] || status);

export const cancellationStatusBadgeClass = status => ({
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border border-rose-200'
}[status] || 'bg-slate-100 text-slate-700 border border-slate-200');

export const requestTypeLabel = (type, isRoom = true) => {
  if (type === 'CHANGE_DATE') return isRoom ? 'Đổi ngày lưu trú' : 'Đổi ngày tham quan';
  if (type === 'REFUND') return 'Yêu cầu hoàn tiền';
  return isRoom ? 'Hủy phòng & hoàn tiền' : 'Hủy vé & hoàn tiền';
};

export const bookingTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
export const formatDate = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
export const formatDateVN = formatDate;

export const formatVND = price => {
  if (price === undefined || price === null || isNaN(price)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

export const VIETNAMESE_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'SHB',
  'MSB',
  'SeABank',
  'OCB',
  'Eximbank',
  'LPBank',
  'Bac A Bank',
  'Nam A Bank',
  'PVcomBank',
  'Timo',
  'Cake by VPBank'
];

export const CANCELLATION_REASONS = [
  'Thay đổi kế hoạch cá nhân / công việc',
  'Đặt nhầm ngày hoặc nhầm loại phòng/vé',
  'Tìm được giá tốt hơn hoặc chỗ nghỉ khác',
  'Lý do sức khỏe / điều kiện thời tiết bất lợi',
  'Có sự cố đột xuất không thể sắp xếp chuyến đi',
  'Khác (vui lòng nêu rõ bên dưới)'
];
