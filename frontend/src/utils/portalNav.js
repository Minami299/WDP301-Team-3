import {
  IconBarChart,
  IconDollar,
  IconHome,
  IconPercent,
  IconQR,
  IconShield,
  IconTicket,
  IconUsers,
} from "../components/Icons";

// Each entry shows in the staff sidebar only when the user holds `permission`.
export const PORTAL_ITEMS = [
  {
    to: "/admin",
    end: true,
    label: "Home",
    permission: "users.view",
    icon: IconHome,
  },
  {
    to: "/admin/analytics",
    label: "Business performance",
    permission: "analytics.view",
    roles: ["ADMIN", "MANAGER"],
    icon: IconBarChart,
  },
  {
    to: "/admin/revenue",
    label: "Revenue & Commission",
    permission: "revenue.view",
    icon: IconDollar,
  },
  {
    to: "/admin/pricing",
    label: "Pricing & Policies",
    permission: "pricing.manage",
    icon: IconPercent,
  },
  {
    to: "/admin/promotions",
    label: "Promotions",
    permission: "promotions.manage",
    icon: IconTicket,
  },
  {
    to: "/admin/approvals",
    label: "Partner approvals",
    permission: "users.lock",
    icon: IconShield,
  },
  {
    to: "/admin/users",
    label: "Users",
    permission: "users.view",
    icon: IconUsers,
  },
  {
    to: "/admin/roles",
    label: "Roles and access",
    permission: "roles.view",
    icon: IconShield,
  },
  {
    to: "/admin/sales",
    label: "Sales",
    permission: "vendor.dashboard",
    icon: IconBarChart,
  },
  {
    to: "/admin/qr",
    label: "QR terminal",
    permission: "vendor.qr",
    icon: IconQR,
  },
  {
    to: "/admin/settlements",
    label: "Settlements",
    permission: "payouts.review",
    icon: IconDollar,
  },
];

export const allowedPortalItems = (user) =>
  PORTAL_ITEMS.filter(
    (item) =>
      user?.permissions?.includes(item.permission) &&
      (!item.roles || item.roles.includes(user?.role)),
  );
