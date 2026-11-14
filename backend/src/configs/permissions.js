const PERMISSIONS = [
  { key: "users.view", label: "View users", group: "Users" },
  { key: "users.create", label: "Create accounts", group: "Users" },
  { key: "users.update", label: "Edit accounts", group: "Users" },
  { key: "users.lock", label: "Lock and unlock accounts", group: "Users" },
  { key: "partners.view", label: "View partner business profiles", group: "Partners" },
  { key: "partners.review", label: "Review partner applications", group: "Partners" },
  { key: "payouts.review", label: "Review and pay partner payout requests", group: "Finance" },
  { key: "roles.view", label: "View roles", group: "Roles" },
  { key: "roles.manage", label: "Change role permissions", group: "Roles" },
  { key: "revenue.view", label: "View platform revenue and commission", group: "Platform Business Operations" },
  { key: "analytics.view", label: "View business performance analytics", group: "Platform Business Operations" },
  { key: "vendor.dashboard", label: "View sales dashboard", group: "Partner tools" },
  { key: "vendor.qr", label: "Use QR terminal", group: "Partner tools" },
  { key: "vendor.settlements", label: "View and request settlements", group: "Partner tools" },
  { key: "pricing.manage", label: "Configure pricing and policies", group: "Settings" },
  { key: "promotions.manage", label: "Manage discount vouchers", group: "Promotions" },
];

const ALL_KEYS = PERMISSIONS.map((permission) => permission.key);

const PARTNER_TOOLS = ["vendor.dashboard", "vendor.qr", "vendor.settlements"];

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ["users.view", "users.create", "users.update", "users.lock", "roles.view", "roles.manage"],
  MANAGER: ["partners.view", "partners.review", "revenue.view", "analytics.view", "payouts.review", "pricing.manage", "promotions.manage", "vendor.dashboard", "vendor.qr"],
  HOTEL_OWNER: PARTNER_TOOLS,
  ACTIVITY_VENDOR: PARTNER_TOOLS,
  CUSTOMER: [],
};

// A role without a stored list falls back to the defaults above.
const permissionsOf = (role) => {
  const allowed = DEFAULT_ROLE_PERMISSIONS[role?.role_name] ?? [];
  if (role?.role_name === 'ADMIN') return allowed;
  // Responsibility ceilings apply even to legacy database grants. Explicit
  // revocations remain effective; migrate stored staff lists to the new defaults.
  return [...new Set(role?.permissions ?? allowed)].filter(key => allowed.includes(key));
};

module.exports = {
  PERMISSIONS,
  ALL_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  permissionsOf,
};

