export const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý kinh doanh",
  HOTEL_OWNER: "Chủ khách sạn",
  ACTIVITY_VENDOR: "Đối tác tham quan",
  CUSTOMER: "Khách hàng",
};

export const ROLE_BADGE_COLORS = {
  ACTIVITY_VENDOR: "bg-primary-50 text-primary-700 border-primary-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HOTEL_OWNER: "bg-indigo-50 text-indigo-700 border-indigo-200",
  MANAGER: "bg-amber-50 text-amber-800 border-amber-200",
  ADMIN: "bg-slate-100 text-slate-800 border-slate-300",
};

export function RoleBadge({ role }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        ROLE_BADGE_COLORS[role] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function getInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const STATUS_LABELS = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Hoạt động",
  INACTIVE: "Chưa kích hoạt",
  LOCKED: "Đã khóa",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-800 border border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 border border-slate-200",
  LOCKED: "bg-rose-50 text-rose-800 border border-rose-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-800 border border-rose-200",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border border-slate-200"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "";

export function PageHeader({ title, children }) {
  return (
    <header className="flex items-center justify-between gap-4 px-8 py-6 border-b border-border bg-white">
      <h1 className="font-heading font-700 text-xl text-text-primary">{title}</h1>
      {children}
    </header>
  );
}
