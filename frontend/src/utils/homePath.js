const STAFF_HOME = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  HOTEL_OWNER: "/vendor",
  ACTIVITY_VENDOR: "/vendor",
};

export const homePathForRole = (role) => STAFF_HOME[role] || "/";
