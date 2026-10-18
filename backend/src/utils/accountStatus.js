const PARTNER_ROLES = ['HOTEL_OWNER', 'ACTIVITY_VENDOR'];
const approvalStatusOf = user => {
  if (user?.approvalStatus) return user.approvalStatus;
  if (user?.status === 'PENDING') return 'PENDING';
  // Do not rewrite existing users or turn inactive/locked legacy accounts on.
  return PARTNER_ROLES.includes(user?.role_id?.role_name || user?.role) && user.status === 'ACTIVE' ? 'APPROVED' : null;
};
const assertActiveAccount = user => {
  const approval = approvalStatusOf(user);
  if (approval === 'REJECTED') {
    throw Object.assign(new Error(`Hồ sơ đối tác đã bị từ chối.${user.rejectionReason ? ` Lý do: ${user.rejectionReason}` : ' Vui lòng liên hệ Travelio để biết thêm thông tin.'}`), { statusCode: 403, code: 'REGISTRATION_REJECTED' });
  }
  if (approval === 'PENDING' || user?.status === 'PENDING') {
    throw Object.assign(new Error('Tài khoản đang chờ Admin hoặc Manager xét duyệt. Vui lòng đăng nhập lại sau khi được chấp thuận.'), { statusCode: 403, code: 'PENDING_APPROVAL' });
  }
  if (user?.status === 'LOCKED') {
    throw Object.assign(new Error(`Tài khoản đã bị khóa.${user.lockReason ? ` Lý do: ${user.lockReason}` : ''}`), { statusCode: 403, code: 'ACCOUNT_LOCKED' });
  }
  if (!user || user.status !== 'ACTIVE') throw Object.assign(new Error('Account is locked or inactive'), { statusCode: 403 });
  if ((user.role_id?.role_name || user.role) === 'CUSTOMER' && user.is_verified === false) {
    throw Object.assign(new Error('Please verify your email before logging in.'), { statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
  }
};
module.exports = { assertActiveAccount, approvalStatusOf, PARTNER_ROLES };
