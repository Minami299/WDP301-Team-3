const KEY = 'travelio_pending_registration';
export const PENDING_APPROVAL_PATH = '/partner/registration-pending';
export const PARTNER_ROLES = ['HOTEL_OWNER', 'ACTIVITY_VENDOR'];

export function registrationSummary(value) {
  if (!value || value.status !== 'PENDING' || !PARTNER_ROLES.includes(value.role) || typeof value.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || typeof value.facility_name !== 'string' || !value.facility_name.trim() || value.facility_name.length > 200 || value.email.length > 320) return null;
  if (value.approvalStatus !== 'PENDING' || typeof value.full_name !== 'string' || !value.full_name.trim() || value.full_name.length > 120) return null;
  // Explicitly whitelist public confirmation fields; never retain the form/token.
  return { status: 'PENDING', approvalStatus: 'PENDING', full_name: value.full_name, role: value.role, email: value.email, facility_name: value.facility_name };
}
export const pendingRegistration = {
  save(value) {
    const summary = registrationSummary(value);
    if (!summary) throw new Error('Máy chủ chưa xác nhận trạng thái chờ xét duyệt. Vui lòng thử lại.');
    sessionStorage.setItem(KEY, JSON.stringify(summary));
    return summary;
  },
  read() {
    try { return registrationSummary(JSON.parse(sessionStorage.getItem(KEY))); }
    catch { return null; }
  },
  clear() { sessionStorage.removeItem(KEY); }
};
