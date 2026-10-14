export const orderStatus = status => ({ PENDING: 'Pending · Chưa thanh toán', CANCELLED: 'Cancelled · Đã hủy' }[status] || status);
export const cancellationStatus = status => ({ PENDING: 'Pending · Chờ xử lý', APPROVED: 'Approved · Đã chấp thuận', REJECTED: 'Rejected · Đã từ chối' }[status] || status);
export const bookingTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
