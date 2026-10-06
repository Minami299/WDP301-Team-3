import { useState } from "react";
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
  IconTrendingUp,
  IconPercent,
  IconQR,
  IconArrowRight
} from "../components/Icons";
const REVENUE_DATA = [
  { month: "Apr", revenue: 42e3, bookings: 128 },
  { month: "May", revenue: 51e3, bookings: 156 },
  { month: "Jun", revenue: 67e3, bookings: 204 },
  { month: "Jul", revenue: 89e3, bookings: 271 },
  { month: "Aug", revenue: 95e3, bookings: 289 },
  { month: "Sep", revenue: 112e3, bookings: 341 },
  { month: "Oct", revenue: 138e3, bookings: 419 }
];
const RECENT_BOOKINGS = [
  { ref: "TVL-2026-MBS847", guest: "Wei Chen", type: "Bundle", room: "Premier Room", checkIn: "15 Oct 2026", nights: 3, amount: 2111, status: "confirmed" },
  { ref: "TVL-2026-MBS841", guest: "Aiko Tanaka", type: "Hotel", room: "Club Suite", checkIn: "15 Oct 2026", nights: 2, amount: 1560, status: "confirmed" },
  { ref: "TVL-2026-MBS836", guest: "James Park", type: "Bundle", room: "Deluxe Room", checkIn: "16 Oct 2026", nights: 4, amount: 1792, status: "pending" },
  { ref: "TVL-2026-MBS829", guest: "Sophie Laurent", type: "Hotel", room: "Premier Room", checkIn: "16 Oct 2026", nights: 5, amount: 3040, status: "confirmed" },
  { ref: "TVL-2026-MBS821", guest: "Rahul Sharma", type: "Bundle", room: "Deluxe Room", checkIn: "17 Oct 2026", nights: 2, amount: 896, status: "confirmed" },
  { ref: "TVL-2026-MBS818", guest: "Emma Wilson", type: "Hotel", room: "Club Suite", checkIn: "17 Oct 2026", nights: 3, amount: 2340, status: "cancelled" }
];
const KPI_CARDS = [
  {
    label: "Total Revenue (Oct)",
    value: "SGD 138,420",
    change: "+22.8%",
    positive: true,
    icon: <IconDollar size={18} />,
    color: "ocean"
  },
  {
    label: "Room Occupancy",
    value: "87.4%",
    change: "+5.2%",
    positive: true,
    icon: <IconPercent size={18} />,
    color: "emerald"
  },
  {
    label: "QR Tickets Redeemed Today",
    value: "1,247",
    change: "+18.3%",
    positive: true,
    icon: <IconQR size={18} />,
    color: "coral"
  },
  {
    label: "Pending Settlement",
    value: "SGD 24,810",
    change: "Due 31 Oct",
    positive: null,
    icon: <IconDollar size={18} />,
    color: "amber"
  }
];
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
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold text-xs">MBS</div>
          <div>
            <div className="text-white text-xs font-semibold">Marina Bay Sands</div>
            <div className="text-text-primary-400 text-[10px]">Hotel · Singapore</div>
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
  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={6} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {
    /* Topbar */
  }
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">Dashboard Overview</h1>
            <p className="text-xs text-text-primary-400">Marina Bay Sands · October 2026</p>
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
              <span className="text-sm font-medium text-text-primary">Kevin T.</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {
    /* KPI Cards */
  }
          <div className="grid grid-cols-4 gap-4">
            {KPI_CARDS.map((kpi, i) => <div key={i} className={`bg-white rounded-[12px] border border-border p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.color === "ocean" ? "bg-primary-100 text-primary-500" : kpi.color === "emerald" ? "bg-success-100 text-success-500" : kpi.color === "coral" ? "bg-secondary-100 text-secondary-500" : "bg-warning-100 text-warning-500"}`}>
                    {kpi.icon}
                  </div>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${kpi.positive === true ? "text-success-600" : kpi.positive === false ? "text-danger-500" : "text-text-primary-400"}`}>
                    {kpi.positive === true && <IconTrendingUp size={12} />}
                    {kpi.change}
                  </span>
                </div>
                <div className="font-heading font-800 text-2xl text-text-primary mb-0.5">{kpi.value}</div>
                <div className="text-xs text-text-primary-500 font-medium">{kpi.label}</div>
              </div>)}
          </div>

          <div className="grid grid-cols-3 gap-5">
            {
    /* Revenue Chart */
  }
            <div className="col-span-2 bg-white rounded-[12px] border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-700 text-text-primary text-base">Revenue Trend</h3>
                  <p className="text-xs text-text-primary-400">Apr–Oct 2026</p>
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
                    Bookings
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                {chartType === "revenue" ? <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}k`} />
                    <Tooltip
    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12, color: "#fff" }}
    formatter={(v) => [`SGD ${Number(v).toLocaleString()}`, "Revenue"]}
  />
                    <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: "#0284c7", r: 3 }} />
                  </AreaChart> : <BarChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
    contentStyle={{ background: "#0f172a", border: "none", borderRadius: 8, fontSize: 12, color: "#fff" }}
    formatter={(v) => [Number(v), "Bookings"]}
  />
                    <Bar dataKey="bookings" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>}
              </ResponsiveContainer>
            </div>

            {
    /* Quick stats */
  }
            <div className="space-y-3">
              {[
    { label: "Check-ins Today", value: "24", icon: "\u{1F3E8}" },
    { label: "Check-outs Today", value: "18", icon: "\u{1F6AA}" },
    { label: "Pending Arrivals", value: "6", icon: "\u23F3" },
    { label: "No-show Rate", value: "1.2%", icon: "\u26A0\uFE0F" }
  ].map((s) => <div key={s.label} className="bg-white rounded-[12px] border border-border p-4 flex items-center gap-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <div className="font-heading font-700 text-text-primary text-xl">{s.value}</div>
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
              <h3 className="font-heading font-700 text-text-primary text-base">Recent Bookings</h3>
              <button
    onClick={() => onNavigate?.(7)}
    className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1"
  >
                View all <IconArrowRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Ref", "Guest", "Type", "Room", "Check-in", "Nights", "Amount", "Status"].map((h) => <th key={h} className="text-left text-[11px] font-semibold text-text-primary-400 uppercase tracking-wide px-5 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_BOOKINGS.map((b) => <tr key={b.ref} className="border-b border-border hover:bg-sidebar-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-text-primary-500">{b.ref}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                            {b.guest.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{b.guest}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.type === "Bundle" ? "bg-secondary-100 text-secondary-700" : "bg-primary-100 text-primary-700"}`}>
                          {b.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-primary-600">{b.room}</td>
                      <td className="px-5 py-3 text-sm text-text-primary-600">{b.checkIn}</td>
                      <td className="px-5 py-3 text-sm text-text-primary-600">{b.nights}n</td>
                      <td className="px-5 py-3 text-sm font-semibold text-text-primary">SGD {b.amount.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${b.status === "confirmed" ? "bg-success-100 text-success-700" : b.status === "pending" ? "bg-warning-100 text-warning-700" : "bg-danger-100 text-danger-600"}`}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>;
}
