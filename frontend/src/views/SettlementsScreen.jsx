import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconCheck, IconClock, IconDownload } from "../components/Icons";
import { Sidebar } from "./VendorDashboardScreen";
import useAuth from "../hooks/useAuth";
import useVendorDashboard from "../hooks/useVendorDashboard";
import useVendorSettlements from "../hooks/useVendorSettlements";
import { vendorApi } from "../services/api/vendorApi";

export default function Screen9({ onNavigate }) {
  const { currentUser } = useAuth();
  const isManager = ["ADMIN", "MANAGER"].includes(currentUser?.role);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const params = { from: from || undefined, to: to || undefined, vendor_id: vendorId || undefined };
  const { settlements, loading, error, refresh } = useVendorSettlements(params);
  const { report } = useVendorDashboard(params);
  const history = settlements?.history || [];
  const formatMoney = (value) => `VND ${Math.round(value || 0).toLocaleString("vi-VN")}`;
  const chartData = history.reduce((months, payout) => {
    const month = new Date(payout.period_end).toISOString().slice(0, 7);
    const row = months[month] || { month, requested: 0, paid: 0 };
    row.requested += payout.amount;
    if (payout.status === "PAID") row.paid += payout.amount;
    months[month] = row;
    return months;
  }, {});

  const submitRequest = async () => {
    if (!from || !to || (isManager && !vendorId.trim())) {
      setActionError("Choose a date range and enter a vendor ID for management requests.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    setNotice("");
    try {
      await vendorApi.createSettlement({
        period_start: from,
        period_end: to,
        ...(isManager ? { vendor_id: vendorId } : {})
      });
      setNotice("Reconciliation request submitted.");
      refresh();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const decideRequest = async (id, status) => {
    setActionError("");
    setNotice("");
    try {
      await vendorApi.decideSettlement(id, status);
      setNotice(`Request ${status.toLowerCase()}.`);
      refresh();
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  const downloadCsv = () => {
    const rows = [
      ["Payout ID", "Period start", "Period end", "Amount", "Status"],
      ...history.map((payout) => [payout._id, payout.period_start, payout.period_end, payout.amount, payout.status])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "travelio-settlements.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = [
    { label: "Paid revenue", value: report?.total_revenue, detail: "Successful customer payments" },
    { label: "Platform commission", value: report?.platform_commission, detail: "Commission on paid sales" },
    { label: "Vendor net", value: report?.vendor_net, detail: "After platform commission" },
    { label: "Available to reconcile", value: settlements?.available_amount, detail: "Completed, unclaimed sales" }
  ];

  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
    <Sidebar activeScreen={9} onNavigate={onNavigate} />
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-heading font-700 text-text-primary text-lg">Financial Settlements & Payouts</h1>
          <p className="text-xs text-text-primary-400">Revenue, commission and reconciliation requests</p>
        </div>
        <button onClick={downloadCsv} className="flex items-center gap-1.5 border border-border hover:border-primary-400 text-text-primary-600 hover:text-primary-500 text-xs font-semibold px-3 py-2 rounded-lg">
          <IconDownload size={13} /> Export CSV
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3 bg-white border border-border rounded-xl p-4">
          <label className="text-xs font-semibold text-text-primary-600">From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="block mt-1 border border-border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-text-primary-600">To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="block mt-1 border border-border rounded-lg px-3 py-2 text-sm" />
          </label>
          {isManager && <label className="text-xs font-semibold text-text-primary-600">Vendor ID
            <input value={vendorId} onChange={(event) => setVendorId(event.target.value)} placeholder="MongoDB user ID" className="block mt-1 border border-border rounded-lg px-3 py-2 text-sm" />
          </label>}
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summary.map((item) => <div key={item.label} className="bg-white rounded-xl border border-border p-5">
            <div className="font-heading font-800 text-xl text-primary-600 mb-1">{loading ? "…" : formatMoney(item.value)}</div>
            <div className="text-sm font-semibold text-text-primary">{item.label}</div>
            <div className="text-xs text-text-primary-400 mt-1">{item.detail}</div>
          </div>)}
        </div>

        <div className="grid xl:grid-cols-3 gap-5">
          <section className="xl:col-span-2 bg-white rounded-xl border border-border p-5">
            <h2 className="font-heading font-700 text-text-primary text-base mb-1">Requested vs paid payouts</h2>
            <p className="text-xs text-text-primary-400 mb-4">Grouped by payout period</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.values(chartData).sort((a, b) => a.month.localeCompare(b.month))} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatMoney(Number(value)), "Amount"]} />
                <Bar dataKey="requested" fill="#bae6fd" radius={[4, 4, 0, 0]} name="Requested" />
                <Bar dataKey="paid" fill="#0284c7" radius={[4, 4, 0, 0]} name="Paid" />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="font-heading font-700 text-text-primary text-base mb-4">Request withdrawal</h2>
            <p className="text-sm text-text-primary-600 mb-4">Eligible balance: <strong>{formatMoney(settlements?.available_amount)}</strong></p>
            <button onClick={submitRequest} disabled={submitting || !settlements?.available_amount} className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg">
              {submitting ? "Submitting…" : "Submit reconciliation request"}
            </button>
            {actionError && <p className="mt-3 text-sm text-danger-600">{actionError}</p>}
            {notice && <p className="mt-3 text-sm text-success-700">{notice}</p>}
            {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
            <p className="mt-4 text-xs text-text-primary-400">Approved requests must be paid through your bank and then marked paid by management.</p>
          </section>
        </div>

        <section className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-700 text-text-primary text-base">Settlement history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-sidebar-50">
                {["Request", "Period", "Net payable", "Created", "Status", ...(isManager ? ["Actions"] : [])].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-text-primary-400 uppercase tracking-wide px-4 py-3">{heading}</th>)}
              </tr></thead>
              <tbody>{history.map((payout) => <tr key={payout._id} className="border-b border-border hover:bg-sidebar-50">
                <td className="px-4 py-3 font-mono text-xs text-text-primary-500">{payout._id}</td>
                <td className="px-4 py-3 text-sm text-text-primary-700 whitespace-nowrap">{new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-semibold text-primary-600">{formatMoney(payout.amount)}</td>
                <td className="px-4 py-3 text-xs text-text-primary-500">{new Date(payout.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${payout.status === "PAID" ? "bg-success-100 text-success-700" : payout.status === "REJECTED" ? "bg-danger-100 text-danger-600" : "bg-warning-100 text-warning-700"}`}>
                  {payout.status === "PAID" ? <IconCheck size={10} /> : <IconClock size={10} />}{payout.status}
                </span></td>
                {isManager && <td className="px-4 py-3"><div className="flex gap-2">
                  {payout.status === "PENDING" && <>
                    <button onClick={() => decideRequest(payout._id, "APPROVED")} className="text-xs font-semibold text-success-700 hover:underline">Approve</button>
                    <button onClick={() => decideRequest(payout._id, "REJECTED")} className="text-xs font-semibold text-danger-600 hover:underline">Reject</button>
                  </>}
                  {payout.status === "APPROVED" && <button onClick={() => decideRequest(payout._id, "PAID")} className="text-xs font-semibold text-primary-600 hover:underline">Mark paid</button>}
                </div></td>}
              </tr>)}</tbody>
            </table>
          </div>
          {loading && <p className="px-4 py-6 text-sm text-text-primary-500">Loading settlements…</p>}
          {!loading && !error && history.length === 0 && <p className="px-4 py-8 text-center text-sm text-text-primary-500">No settlement requests.</p>}
        </section>
      </main>
    </div>
  </div>;
}
