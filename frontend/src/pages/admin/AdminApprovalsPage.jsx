import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../services/api/adminApi";
import { RegistrationReview, inputClass } from "./adminDialogs";
import { PageHeader, ROLE_LABELS, StatusBadge, formatDate } from "./adminUi";
import PartnerApplicationApprovals from './PartnerApplicationApprovals';

const TABS = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
];
const PARTNER_ROLES = ["HOTEL_OWNER", "ACTIVITY_VENDOR"];

export default function AdminApprovalsPage() {
  const [legacy, setLegacy] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "PENDING";
  const role = params.get("role") || "";
  const page = Number(params.get("page")) || 1;
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "", ...changes }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listUsers({ approvalStatus: tab, role: role || undefined, page, limit: 15 })
      .then((res) => {
        const items = res.data.items.filter((u) => PARTNER_ROLES.includes(u.role));
        setResult({ ...res.data, items });
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tab, role, page]);

  useEffect(() => { if (legacy) load(); }, [load, legacy]);

  if (!legacy) return <PartnerApplicationApprovals onLegacy={() => setLegacy(true)} />;

  return (
    <>
      <PageHeader title="Partner approvals — legacy"><button className="rounded-lg border px-4 py-2 text-sm" onClick={() => setLegacy(false)}>Hồ sơ mới</button></PageHeader>
      <div className="px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex rounded-8 border border-border bg-white overflow-hidden">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => update({ tab: t.value })}
                className={`px-4 py-2 text-sm font-semibold ${tab === t.value ? "bg-primary-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select aria-label="Filter by partner type" className={`${inputClass} w-48`} value={role} onChange={(e) => update({ role: e.target.value })}>
            <option value="">Hotel owner & vendor</option>
            {PARTNER_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {notice && <p role="status" className="text-sm text-emerald-800 bg-success-100 rounded-8 px-4 py-3">{notice}</p>}
        {error && <p role="alert" className="text-sm text-red-700 bg-danger-100 rounded-8 px-4 py-3">Could not load registrations: {error}</p>}

        <div className="bg-white border border-border rounded-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="px-4 py-3 font-semibold">Applicant</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result?.items.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-xs text-text-secondary">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[user.role] || user.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.approvalStatus} />
                    {user.rejectionReason && <div className="mt-1 max-w-xs text-xs text-text-secondary break-words">Lý do: {user.rejectionReason}</div>}
                  </td>
                  <td className="px-4 py-3">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(user)} className="px-3 py-1 rounded-8 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                      {tab === "PENDING" ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && !result && <p className="px-4 py-6 text-sm text-text-secondary">Loading registrations...</p>}
          {result && result.items.length === 0 && <p className="px-4 py-8 text-sm text-text-secondary">Không có hồ sơ nào trong mục này.</p>}
        </div>

        {result && (
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>{result.total} hồ sơ</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="px-3 py-1 rounded-8 border border-border disabled:opacity-40">Previous</button>
              <span>Page {result.page} of {result.pages}</span>
              <button disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })} className="px-3 py-1 rounded-8 border border-border disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <RegistrationReview
          user={selected}
          canReview
          onClose={() => setSelected(null)}
          onSaved={(message) => { setSelected(null); setNotice(message || ""); load(); }}
        />
      )}
    </>
  );
}
