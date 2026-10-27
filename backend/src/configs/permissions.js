const PERMISSIONS = [
  { key: "users.view", label: "View users", group: "Users" },
  { key: "users.create", label: "Create accounts", group: "Users" },
  { key: "users.update", label: "Edit accounts", group: "Users" },
  { key: "users.lock", label: "Lock and unlock accounts", group: "Users" },
  { key: "payouts.review", label: "Review and pay partner payout requests", group: "Finance" },
  { key: "roles.view", label: "View roles", group: "Roles" },
  { key: "roles.manage", label: "Change role permissions", group: "Roles" },
  { key: "vendor.dashboard", label: "View sales dashboard", group: "Partner tools" },
  { key: "vendor.qr", label: "Use QR terminal", group: "Partner tools" },
  { key: "vendor.settlements", label: "View and request settlements", group: "Partner tools" },
];

const ALL_KEYS = PERMISSIONS.map((permission) => permission.key);

const PARTNER_TOOLS = ["vendor.dashboard", "vendor.qr", "vendor.settlements"];

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ALL_KEYS,
  MANAGER: ["users.view", "users.create", "users.update", "users.lock", "payouts.review", ...PARTNER_TOOLS],
  HOTEL_OWNER: PARTNER_TOOLS,
  ACTIVITY_VENDOR: PARTNER_TOOLS,
  CUSTOMER: [],
};

// A role without a stored list falls back to the defaults above.
const permissionsOf = (role) =>
  role?.permissions ?? DEFAULT_ROLE_PERMISSIONS[role?.role_name] ?? [];

module.exports = {
  PERMISSIONS,
  ALL_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  permissionsOf,
};
