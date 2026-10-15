export const ROLE_LABELS = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  HOTEL_OWNER: "Hotel owner",
  ACTIVITY_VENDOR: "Activity vendor",
  CUSTOMER: "Customer",
};

export const STATUS_LABELS = {
  PENDING: 'Pending Approval',
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LOCKED: "Locked",
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  ACTIVE: "bg-success-100 text-emerald-800",
  INACTIVE: "bg-warning-100 text-amber-800",
  LOCKED: "bg-danger-100 text-red-800",
  APPROVED: 'bg-success-100 text-emerald-800',
  REJECTED: 'bg-danger-100 text-red-800',
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-4 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
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
