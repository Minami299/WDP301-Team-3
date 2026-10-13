import {
  IconBarChart,
  IconDollar,
  IconHome,
  IconQR,
  IconShield,
  IconUsers,
} from "../components/Icons";

// Each entry shows in the sidebar only when the signed-in user holds `permission`.
export const PORTAL_ITEMS = [
  { path: "", label: "Home", permission: "users.view", icon: IconHome },
  { path: "users", label: "Users", permission: "users.view", icon: IconUsers },
  { path: "roles", label: "Roles and access", permission: "roles.view", icon: IconShield },
  { path: "sales", label: "Sales", permission: "vendor.dashboard", icon: IconBarChart },
  { path: "qr", label: "QR terminal", permission: "vendor.qr", icon: IconQR },
  { path: "settlements", label: "Settlements", permission: "vendor.settlements", icon: IconDollar },
];

export const allowedPortalItems = (user) =>
  PORTAL_ITEMS.filter((item) => user?.permissions?.includes(item.permission));
