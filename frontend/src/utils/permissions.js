export const hasPermission = (user, permission) =>
  Boolean(user?.permissions?.includes(permission));
