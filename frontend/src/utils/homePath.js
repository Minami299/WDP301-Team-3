const STAFF_HOME = {
  ADMIN: "/admin",
  MANAGER: "/admin",
  HOTEL_OWNER: "/vendor",
  ACTIVITY_VENDOR: "/vendor",
};

export const homePathForRole = (role) => STAFF_HOME[role] || "/";
