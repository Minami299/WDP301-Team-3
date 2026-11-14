const ROLE_PERMISSIONS = {
  ADMIN: ['users.view', 'users.create', 'users.update', 'users.lock', 'partners.view', 'partners.review', 'roles.view', 'roles.manage'],
  MANAGER: ['partners.view', 'partners.review', 'revenue.view', 'analytics.view', 'payouts.review', 'promotions.manage', 'vendor.dashboard', 'vendor.qr'],
  HOTEL_OWNER: ['vendor.dashboard', 'vendor.qr', 'vendor.settlements'],
  ACTIVITY_VENDOR: ['vendor.dashboard', 'vendor.qr', 'vendor.settlements'],
};
export const hasPermission = (user, permission) => {
  const allowed = ROLE_PERMISSIONS[user?.role] || [];
  if (!allowed.includes(permission)) return false;
  if (user?.role === 'ADMIN') return true;
  return !Array.isArray(user?.permissions) || user.permissions.includes(permission);
};

