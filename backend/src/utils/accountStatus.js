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
  if (!user || user.status !== 'ACTIVE') throw Object.assign(new Error('Account is locked or inactive'), { statusCode: 403 });
};
module.exports = { assertActiveAccount, approvalStatusOf, PARTNER_ROLES };
