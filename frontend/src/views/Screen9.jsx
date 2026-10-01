import { useState } from "react";
import { Sidebar } from "./Screen6";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { IconDownload, IconCheck, IconClock } from "../components/Icons";
const SETTLEMENTS = [
  {
    id: "STL-2026-0042",
    period: "01\u201315 Oct 2026",
    grossEarnings: 98420,
    commission: 9842,
    commissionRate: 10,
    adjustments: -840,
    netPayable: 87738,
    status: "processed",
    paidOn: "18 Oct 2026",
    method: "Bank Transfer \xB7\xB7\xB7\xB78821"
  },
  {
    id: "STL-2026-0038",
    period: "16\u201330 Sep 2026",
    grossEarnings: 112680,
    commission: 11268,
    commissionRate: 10,
    adjustments: -1240,
    netPayable: 100172,
    status: "processed",
    paidOn: "03 Oct 2026",
    method: "Bank Transfer \xB7\xB7\xB7\xB78821"
  },
  {
    id: "STL-2026-0035",
    period: "01\u201315 Sep 2026",
    grossEarnings: 89200,
    commission: 8920,
    commissionRate: 10,
    adjustments: 0,
    netPayable: 80280,
    status: "processed",
    paidOn: "18 Sep 2026",
    method: "Bank Transfer \xB7\xB7\xB7\xB78821"
  },
  {
    id: "STL-2026-0041",
    period: "16\u201331 Oct 2026",
    grossEarnings: 138420,
    commission: 13842,
    commissionRate: 10,
    adjustments: -620,
    netPayable: 123958,
    status: "pending",
    paidOn: "Due 03 Nov 2026",
    method: "Bank Transfer \xB7\xB7\xB7\xB78821"
  }
];
const PAYOUT_SCHEDULE = [
  { date: "03 Nov 2026", amount: 123958, period: "16\u201331 Oct", status: "scheduled" },
  { date: "18 Nov 2026", amount: null, period: "01\u201315 Nov", status: "upcoming" },
  { date: "03 Dec 2026", amount: null, period: "16\u201330 Nov", status: "upcoming" }
];
const MONTHLY_DATA = [
  { month: "Jun", gross: 67e3, net: 60300 },
  { month: "Jul", gross: 89e3, net: 80100 },
  { month: "Aug", gross: 95e3, net: 85500 },
  { month: "Sep", gross: 112680, net: 100172 + 80280 },
  { month: "Oct (P)", gross: 138420, net: 123958 }
];
export default function Screen9({ onNavigate }) {
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [exportFormat, setExportFormat] = useState(null);
  const pending = SETTLEMENTS.find((s) => s.status === "pending");
  const processed = SETTLEMENTS.filter((s) => s.status === "processed");
  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={9} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {
    /* Topbar */
  }
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">Financial Settlements & Payouts</h1>
            <p className="text-xs text-text-primary-400">Marina Bay Sands · Billing Currency: SGD</p>
          </div>
          <div className="flex gap-2">
            {["csv", "pdf"].map((fmt) => <button
    key={fmt}
    onClick={() => setExportFormat(fmt)}
    className="flex items-center gap-1.5 border border-border hover:border-primary-400 text-text-primary-600 hover:text-primary-500 text-xs font-semibold px-3 py-2 rounded-lg"
  >
                <IconDownload size={13} /> Export {fmt.toUpperCase()}
              </button>)}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {
    /* Summary KPIs */
  }
          <div className="grid grid-cols-4 gap-4">
            {[
    { label: "Total Gross (YTD)", value: "SGD 688,420", sub: "Jan\u2013Oct 2026", color: "ocean" },
    { label: "Platform Commission (YTD)", value: "SGD 68,842", sub: "10% rate", color: "dark" },
    { label: "Total Net Payouts (YTD)", value: "SGD 604,338", sub: "After all deductions", color: "emerald" },
    { label: "Next Payout", value: "SGD 123,958", sub: "Due 03 Nov 2026", color: "amber" }
  ].map((card, i) => <div key={i} className={`bg-white rounded-[12px] border border-border p-5`}>
                <div className={`font-heading font-800 text-2xl mb-1 ${card.color === "ocean" ? "text-primary-500" : card.color === "emerald" ? "text-success-600" : card.color === "amber" ? "text-warning-600" : "text-text-primary"}`}>{card.value}</div>
                <div className="text-sm font-semibold text-text-primary mb-0.5">{card.label}</div>
                <div className="text-xs text-text-primary-400">{card.sub}</div>
              </div>)}
          </div>

          <div className="grid grid-cols-3 gap-5">
            {
    /* Earnings chart */
  }
            <div className="col-span-2 bg-white rounded-[12px] border border-border p-5">
              <h3 className="font-heading font-700 text-text-primary text-base mb-1">Gross vs Net Earnings</h3>
              <p className="text-xs text-text-primary-400 mb-4">Monthly comparison · Jun–Oct 2026</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY_DATA} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}k`} />
                  <Tooltip
    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12, color: "#fff" }}
    formatter={(v, name) => [`SGD ${Number(v).toLocaleString()}`, name === "gross" ? "Gross" : "Net"]}
  />
                  <Bar dataKey="gross" fill="#bae6fd" radius={[4, 4, 0, 0]} name="gross" />
                  <Bar dataKey="net" fill="#0284c7" radius={[4, 4, 0, 0]} name="net" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-text-primary-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary-200" /> Gross Earnings</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary-500" /> Net Payable</div>
              </div>
            </div>

            {
    /* Payout Schedule */
  }
            <div className="bg-white rounded-[12px] border border-border p-5">
              <h3 className="font-heading font-700 text-text-primary text-base mb-4">Payout Schedule</h3>
              <div className="space-y-3">
                {PAYOUT_SCHEDULE.map((p, i) => <div key={i} className={`p-3 rounded-xl border ${p.status === "scheduled" ? "bg-primary-50 border-primary-200" : "bg-sidebar-50 border-border"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-text-primary">{p.date}</div>
                        <div className="text-xs text-text-primary-400">{p.period}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "scheduled" ? "bg-primary-500 text-white" : "bg-sidebar-200 text-text-primary-500"}`}>
                        {p.status === "scheduled" ? "Scheduled" : "Upcoming"}
                      </span>
                    </div>
                    {p.amount && <div className="mt-1 font-heading font-700 text-primary-500 text-base">
                        SGD {p.amount.toLocaleString()}
                      </div>}
                  </div>)}
              </div>
              <div className="mt-4 bg-sidebar-50 rounded-xl p-3 text-xs text-text-primary-500">
                ℹ️ Payouts are automated every 15 days. Net amount = Gross − Commission − Adjustments
              </div>
            </div>
          </div>

          {
    /* Settlement table */
  }
          <div className="bg-white rounded-[12px] border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-heading font-700 text-text-primary text-base">Settlement History</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-sidebar-50">
                  {["Settlement ID", "Period", "Gross Earnings", "Commission (10%)", "Adjustments", "Net Payable", "Status", "Paid On", "Method", ""].map((h) => <th key={h} className="text-left text-[11px] font-semibold text-text-primary-400 uppercase tracking-wide px-4 py-3">
                      {h}
                    </th>)}
                </tr>
              </thead>
              <tbody>
                {SETTLEMENTS.map((s) => <tr
    key={s.id}
    className="border-b border-border hover:bg-sidebar-50 cursor-pointer transition-colors"
    onClick={() => setSelectedSettlement(s.id === selectedSettlement ? null : s.id)}
  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-text-primary-500">{s.id}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary-700 whitespace-nowrap">{s.period}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                      SGD {s.grossEarnings.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-danger-500 font-medium">−SGD {s.commission.toLocaleString()}</div>
                      <div className="text-[10px] text-text-primary-400">{s.commissionRate}% rate</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary-600">
                      {s.adjustments < 0 ? `\u2212SGD ${Math.abs(s.adjustments)}` : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-heading font-700 text-primary-500">SGD {s.netPayable.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${s.status === "processed" ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"}`}>
                        {s.status === "processed" ? <IconCheck size={10} /> : <IconClock size={10} />}
                        {s.status === "processed" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-primary-500 whitespace-nowrap">{s.paidOn}</td>
                    <td className="px-4 py-3 text-xs text-text-primary-500">{s.method}</td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-0.5">
                        <IconDownload size={12} /> PDF
                      </button>
                    </td>
                  </tr>)}
              </tbody>
              <tfoot>
                <tr className="bg-sidebar-50 border-t-2 border-border">
                  <td className="px-4 py-3 font-heading font-700 text-text-primary text-sm" colSpan={2}>Totals</td>
                  <td className="px-4 py-3 font-heading font-700 text-text-primary text-sm">
                    SGD {SETTLEMENTS.reduce((a, s) => a + s.grossEarnings, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-danger-500 text-sm">
                    −SGD {SETTLEMENTS.reduce((a, s) => a + s.commission, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary-600">
                    −SGD {Math.abs(SETTLEMENTS.reduce((a, s) => a + s.adjustments, 0)).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-heading font-800 text-primary-500 text-base">
                    SGD {SETTLEMENTS.reduce((a, s) => a + s.netPayable, 0).toLocaleString()}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </main>
      </div>

      {exportFormat && <div className="fixed inset-0 bg-sidebar/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <IconDownload size={22} className="text-primary-500" />
            </div>
            <h3 className="font-heading font-700 text-text-primary text-lg mb-1">Export Report</h3>
            <p className="text-sm text-text-primary-500 mb-4">
              Download all settlement records as {exportFormat.toUpperCase()}?<br />
              Period: Jan–Oct 2026
            </p>
            <div className="flex gap-3">
              <button
    onClick={() => setExportFormat(null)}
    className="flex-1 border border-border py-2.5 rounded-xl text-sm font-semibold text-text-primary-600 hover:bg-sidebar-50"
  >
                Cancel
              </button>
              <button
    onClick={() => setExportFormat(null)}
    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
  >
                <IconDownload size={14} /> Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
