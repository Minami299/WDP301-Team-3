const ROLE_PERMISSIONS = {
  ADMIN: ['users.view', 'users.create', 'users.update', 'users.lock'],
  MANAGER: ['partners.view', 'partners.review', 'revenue.view', 'analytics.view', 'payouts.review', 'pricing.manage', 'promotions.manage', 'vendor.dashboard', 'vendor.qr'],
  HOTEL_OWNER: ['vendor.dashboard', 'vendor.qr', 'vendor.settlements'],
  ACTIVITY_VENDOR: ['vendor.dashboard', 'vendor.qr', 'vendor.settlements'],
};
export const hasPermission = (user, permission) => {
  const allowed = ROLE_PERMISSIONS[user?.role] || [];
  if (!allowed.includes(permission)) return false;
  return !Array.isArray(user?.permissions) || user.permissions.includes(permission);
};
