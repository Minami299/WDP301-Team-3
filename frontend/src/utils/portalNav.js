import {
  IconBarChart,
  IconDollar,
  IconHome,
  IconQR,
  IconShield,
  IconUsers,
} from "../components/Icons";

// Each entry shows in the staff sidebar only when the user holds `permission`.
export const PORTAL_ITEMS = [
  { to: "/admin", end: true, label: "Home", permission: "users.view", icon: IconHome },
  { to: "/admin/users", label: "Users", permission: "users.view", icon: IconUsers },
  { to: "/admin/roles", label: "Roles and access", permission: "roles.view", icon: IconShield },
  { to: "/vendor", end: true, label: "Sales", permission: "vendor.dashboard", icon: IconBarChart },
  { to: "/vendor/qr", label: "QR terminal", permission: "vendor.qr", icon: IconQR },
  { to: "/vendor/settlements", label: "Settlements", permission: "vendor.settlements", icon: IconDollar },
];

export const allowedPortalItems = (user) =>
  PORTAL_ITEMS.filter((item) => user?.permissions?.includes(item.permission));
