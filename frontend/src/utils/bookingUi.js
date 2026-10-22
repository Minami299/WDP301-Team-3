export const orderStatus = status => ({ PENDING: 'Pending · Chưa thanh toán', CONFIRMED: 'Confirmed · Đã xác nhận', CANCELLED: 'Cancelled · Đã hủy', REFUNDED: 'Refunded · Đã hoàn tiền', COMPLETED: 'Completed · Hoàn tất' }[status] || status);
export const cancellationStatus = status => ({ PENDING: 'Pending · Chờ xử lý', APPROVED: 'Approved · Đã chấp thuận', REJECTED: 'Rejected · Đã từ chối' }[status] || status);
export const requestTypeLabel = type => (type === 'CHANGE_DATE' ? 'Đổi ngày' : type === 'REFUND' ? 'Yêu cầu hoàn tiền' : 'Hủy dịch vụ / phòng');
export const bookingTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
export const formatDate = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
