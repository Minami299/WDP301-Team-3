const PERMISSIONS = [
  { key: "users.view", label: "View users", group: "Users" },
  { key: "users.create", label: "Create accounts", group: "Users" },
  { key: "users.update", label: "Edit accounts", group: "Users" },
  { key: "users.lock", label: "Lock and unlock accounts", group: "Users" },
  { key: "roles.view", label: "View roles", group: "Roles" },
  { key: "roles.manage", label: "Change role permissions", group: "Roles" },
];

const ALL_KEYS = PERMISSIONS.map((permission) => permission.key);

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ALL_KEYS,
  MANAGER: ["users.view", "users.create", "users.update", "users.lock"],
  HOTEL_OWNER: [],
  ACTIVITY_VENDOR: [],
  CUSTOMER: [],
};

module.exports = { PERMISSIONS, ALL_KEYS, DEFAULT_ROLE_PERMISSIONS };
