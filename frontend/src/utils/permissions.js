const VENDOR_FALLBACK_ROLES = ["ADMIN", "MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR"];

export const hasPermission = (user, permission) => {
  if (Array.isArray(user?.permissions)) {
    return user.permissions.includes(permission);
  }
  if (permission?.startsWith("vendor.") && VENDOR_FALLBACK_ROLES.includes(user?.role)) {
    return true;
  }
  return false;
};
