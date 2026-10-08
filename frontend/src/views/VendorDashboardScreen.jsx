import { useState } from "react";
import useAuth from "../hooks/useAuth";
import useVendorDashboard from "../hooks/useVendorDashboard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  IconHome,
  IconHotel,
  IconBarChart,
  IconDollar,
  IconSettings,
  IconBell,
  IconUser,
  IconLogOut,
  IconPercent,
  IconQR,
  IconArrowRight,
  IconCheck,
  IconShield
} from "../components/Icons";
function Sidebar({ activeScreen, onNavigate }) {
  const links = [
    { icon: <IconHome size={17} />, label: "Overview", screen: 6 },
    { icon: <IconHotel size={17} />, label: "Inventory", screen: 7 },
    { icon: <IconQR size={17} />, label: "QR Terminal", screen: 8 },
    { icon: <IconDollar size={17} />, label: "Settlements", screen: 9 },
    { icon: <IconBarChart size={17} />, label: "Analytics", screen: 0 },
    { icon: <IconSettings size={17} />, label: "Settings", screen: 0 }
  ];
  return <aside className="w-56 bg-sidebar h-full flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-heading font-800 text-white text-base">travelio</span>
        </div>
        <div className="text-[10px] text-text-primary-400 font-semibold uppercase tracking-widest ml-9">Partner Portal</div>
      </div>

      <div className="px-3 pt-4 pb-2">
          <div className="bg-sidebar-800 rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold text-xs">TL</div>
          <div>
            <div className="text-white text-xs font-semibold">Partner Portal</div>
            <div className="text-text-primary-400 text-[10px]">Sales & finance</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {links.map((link) => <button
    key={link.label}
    onClick={() => link.screen && onNavigate?.(link.screen)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${activeScreen === link.screen ? "bg-primary-500 text-white" : "text-text-primary-400 hover:bg-sidebar-800 hover:text-white"}`}
  >
            {link.icon}
            {link.label}
          </button>)}
      </nav>

      <div className="px-3 pb-4 space-y-0.5 border-t border-border pt-3">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-400 hover:bg-sidebar-800 hover:text-white">
          <IconUser size={17} />
          Account
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-400 hover:bg-sidebar-800 hover:text-danger-400">
          <IconLogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>;
}
export { Sidebar };
export default function Screen6({ onNavigate }) {
  const [chartType, setChartType] = useState("revenue");
  const { currentUser } = useAuth();
  const { report, loading, error } = useVendorDashboard();
  const revenueData = report?.monthly || [];
  const recentSales = report?.recent_sales || [];
  const formatMoney = (value) => `VND ${Math.round(value || 0).toLocaleString("vi-VN")}`;
  const kpiCards = [
    { label: "Total Revenue", value: formatMoney(report?.total_revenue), icon: <IconDollar size={18} />, color: "ocean" },
    { label: "Room Revenue", value: formatMoney(report?.room_revenue), icon: <IconHotel size={18} />, color: "emerald" },
    { label: "Tickets Sold", value: (report?.tickets_sold || 0).toLocaleString("vi-VN"), icon: <IconQR size={18} />, color: "coral" },
    { label: "Platform Commission", value: formatMoney(report?.platform_commission), icon: <IconPercent size={18} />, color: "amber" }
  ];
  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={6} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {
    /* Topbar */
  }
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">Dashboard Overview</h1>
            <p className="text-xs text-text-primary-400">{currentUser?.full_name || "Partner"} · Paid bookings and QR activity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="p-2 hover:bg-sidebar-100 rounded-lg text-text-primary-500">
                <IconBell size={18} />
              </button>
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-secondary-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</div>
            </div>
            <div className="flex items-center gap-2 bg-sidebar-50 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-[10px] font-bold">KT</div>
              <span className="text-sm font-medium text-text-primary">{currentUser?.full_name || "Partner"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {
    /* KPI Cards */
  }
          <div className="grid grid-cols-4 gap-4">
            {kpiCards.map((kpi, i) => <div key={i} className={`bg-white rounded-[12px] border border-border p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.color === "ocean" ? "bg-primary-100 text-primary-500" : kpi.color === "emerald" ? "bg-success-100 text-success-500" : kpi.color === "coral" ? "bg-secondary-100 text-secondary-500" : "bg-warning-100 text-warning-500"}`}>
                    {kpi.icon}
                  </div>
                </div>
                <div className="font-heading font-800 text-2xl text-text-primary mb-0.5">{loading ? "…" : kpi.value}</div>
                <div className="text-xs text-text-primary-500 font-medium">{kpi.label}</div>
              </div>)}
          </div>

          <section className="bg-white rounded-[12px] border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-heading font-700 text-text-primary text-base">Revenue by facility</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-sidebar-50">
                  {["Facility", "Room revenue", "Rooms sold", "Ticket revenue", "Tickets sold", "Platform commission", "Vendor net"].map((heading) => <th key={heading} className="text-left text-[11px] font-semibold text-text-primary-400 uppercase tracking-wide px-4 py-3">{heading}</th>)}
                </tr></thead>
                <tbody>{(report?.facilities || []).map((facility) => <tr key={facility.facility_id} className="border-b border-border">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{facility.name}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(facility.room_revenue)}</td>
                  <td className="px-4 py-3 text-sm">{facility.rooms_sold}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(facility.revenue - facility.room_revenue)}</td>
                  <td className="px-4 py-3 text-sm">{facility.tickets_sold}</td>
                  <td className="px-4 py-3 text-sm text-danger-600">{formatMoney(facility.commission)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-primary-600">{formatMoney(facility.vendor_net)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            {!loading && !error && !(report?.facilities || []).length && <p className="px-5 py-6 text-sm text-text-primary-500">No paid revenue for this period.</p>}
          </section>

          <div className="grid grid-cols-3 gap-5">
            {
    /* Revenue Chart */
  }
            <div className="col-span-2 bg-white rounded-[12px] border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-700 text-text-primary text-base">Revenue Trend</h3>
                  <p className="text-xs text-text-primary-400">Successful payments by month</p>
                </div>
                <div className="flex gap-1 bg-sidebar-100 rounded-lg p-1">
                  <button
    onClick={() => setChartType("revenue")}
    className={`px-3 py-1 rounded-md text-xs font-semibold ${chartType === "revenue" ? "bg-white text-text-primary shadow-sm" : "text-text-primary-500"}`}
  >
                    Revenue
                  </button>
                  <button
    onClick={() => setChartType("bookings")}
    className={`px-3 py-1 rounded-md text-xs font-semibold ${chartType === "bookings" ? "bg-white text-text-primary shadow-sm" : "text-text-primary-500"}`}
  >
                    Tickets sold
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                {chartType === "revenue" ? <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}m`} />
                    <Tooltip
    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12, color: "#fff" }}
    formatter={(v) => [formatMoney(Number(v)), "Revenue"]}
  />
                    <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: "#0284c7", r: 3 }} />
                  </AreaChart> : <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12, color: "#fff" }}
    formatter={(v) => [Number(v), "Tickets sold"]}
  />
                    <Bar dataKey="tickets_sold" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>}
              </ResponsiveContainer>
            </div>

            {
    /* Quick stats */
  }
            <div className="space-y-3">
              {[
    { label: "QR scans", value: report?.qr_scans?.total || 0, icon: <IconQR size={18} /> },
    { label: "Valid check-ins", value: report?.qr_scans?.valid || 0, icon: <IconHotel size={18} /> },
    { label: "Already used", value: report?.qr_scans?.already_redeemed || 0, icon: <IconCheck size={18} /> },
    { label: "Rejected scans", value: report?.qr_scans?.invalid || 0, icon: <IconShield size={18} /> }
  ].map((s) => <div key={s.label} className="bg-white rounded-[12px] border border-border p-4 flex items-center gap-4">
                  <span className="text-primary-500">{s.icon}</span>
                  <div>
                    <div className="font-heading font-700 text-text-primary text-xl">{loading ? "…" : s.value.toLocaleString("vi-VN")}</div>
                    <div className="text-xs text-text-primary-500">{s.label}</div>
                  </div>
                </div>)}
            </div>
          </div>

          {
    /* Recent Bookings */
  }
          <div className="bg-white rounded-[12px] border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-700 text-text-primary text-base">Recent Sales</h3>
              <button
    onClick={() => onNavigate?.(9)}
    className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1"
  >
                View settlements <IconArrowRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Booking", "Guest", "Property / Service", "Type", "Qty", "Revenue", "Status"].map((h) => <th key={h} className="text-left text-[11px] font-semibold text-text-primary-400 uppercase tracking-wide px-5 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((b) => <tr key={`${b.booking_id}-${b.service_name}`} className="border-b border-border hover:bg-sidebar-50 transition-colors">
                      <td className="px-5 py-3">
                    <span className="font-mono text-xs text-text-primary-500">{b.booking_code}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                            {(b.guest_name || "Guest").split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{b.guest_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-text-primary-600">{b.facility_name} · {b.service_name}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">{b.service_type}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-primary-600">{b.quantity}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-text-primary">{formatMoney(b.revenue)}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-100 text-success-700">
                          {b.status}
                        </span>
                      </td>
                    </tr>)}
                </tbody>
              </table>
              {error && <p className="px-5 py-4 text-sm text-danger-600">{error}</p>}
              {!loading && !error && recentSales.length === 0 && <p className="px-5 py-8 text-sm text-center text-text-primary-500">No paid sales in this period.</p>}
            </div>
          </div>
        </main>
      </div>
    </div>;
}
