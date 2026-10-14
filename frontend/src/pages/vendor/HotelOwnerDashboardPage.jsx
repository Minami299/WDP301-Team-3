import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useVendorDashboard from "../../hooks/useVendorDashboard";
import { SCREEN_PATHS } from "../../utils/screenNavigation";
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
} from "../../components/Icons";

export function VendorSidebar({ activeScreen = 6, onNavigate, onProfile, onLogout }) {
  const links = [
    { icon: <IconHome size={17} />, label: "Overview", screen: 6, path: "/vendor" },
    { icon: <IconHotel size={17} />, label: "Hồ sơ & Phòng", screen: 10, path: "/vendor/registration" },
    { icon: <IconHotel size={17} />, label: "Inventory", screen: 7, path: "/vendor/inventory" },
    { icon: <IconQR size={17} />, label: "QR Terminal", screen: 8, path: "/vendor/qr" },
    { icon: <IconDollar size={17} />, label: "Settlements", screen: 9, path: "/vendor/settlements" },
    { icon: <IconBarChart size={17} />, label: "Analytics", screen: 0 },
    { icon: <IconSettings size={17} />, label: "Settings", screen: 0 }
  ];

  return (
    <aside className="w-56 bg-sidebar h-full flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-heading font-800 text-white text-base">travelio</span>
        </div>
        <div className="text-[10px] text-text-primary-400 font-semibold uppercase tracking-widest ml-9">
          Partner Portal
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="bg-sidebar-800 rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold text-xs">
            TL
          </div>
          <div>
            <div className="text-white text-xs font-semibold">Partner Portal</div>
            <div className="text-text-primary-400 text-[10px]">Sales & finance</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => {
              if (link.path) onNavigate?.(link.path);
              else if (link.screen) onNavigate?.(SCREEN_PATHS[link.screen] || "/vendor");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeScreen === link.screen
                ? "bg-primary-500 text-white"
                : "text-text-primary-400 hover:bg-sidebar-800 hover:text-white"
            }`}
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-0.5 border-t border-border pt-3">
        <button
          onClick={onProfile}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-400 hover:bg-sidebar-800 hover:text-white"
        >
          <IconUser size={17} />
          Account
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary-400 hover:bg-sidebar-800 hover:text-danger-400"
        >
          <IconLogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export { VendorSidebar as Sidebar };

export default function HotelOwnerDashboardPage() {
  const navigate = useNavigate();
  const [chartType, setChartType] = useState("revenue");
  const { currentUser, logout } = useAuth();
  const { report, loading, error } = useVendorDashboard();

  const recentSales = report?.recent_sales || [];
  const formatMoney = (value) => `VND ${Math.round(value || 0).toLocaleString("vi-VN")}`;

  const kpiCards = [
    {
      label: "Tổng doanh thu",
      value: formatMoney(report?.total_revenue),
      icon: <IconDollar size={20} />,
      bg: "bg-blue-50 text-blue-600",
      sub: "Doanh thu tích lũy từ đặt phòng & vé"
    },
    {
      label: "Doanh thu phòng nghỉ",
      value: formatMoney(report?.room_revenue),
      icon: <IconHotel size={20} />,
      bg: "bg-emerald-50 text-emerald-600",
      sub: `${(report?.rooms_sold || 0).toLocaleString("vi-VN")} lượt phòng đã bán`
    },
    {
      label: "Số vé / hoạt động đã bán",
      value: (report?.tickets_sold || 0).toLocaleString("vi-VN"),
      icon: <IconQR size={20} />,
      bg: "bg-amber-50 text-amber-600",
      sub: "Vé tham quan & tour du lịch"
    },
    {
      label: "Hoa hồng nền tảng",
      value: formatMoney(report?.platform_commission),
      icon: <IconPercent size={20} />,
      bg: "bg-rose-50 text-rose-600",
      sub: "Phí dịch vụ hệ thống Travelio"
    }
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] font-body overflow-hidden">
      <VendorSidebar
        activeScreen={6}
        onNavigate={(path) => navigate(path)}
        onProfile={() => navigate("/profile")}
        onLogout={() => {
          logout?.();
          navigate("/auth/login");
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between flex-shrink-0 shadow-xs">
          <div>
            <h1 className="font-heading font-extrabold text-text-primary text-xl tracking-tight">
              Tổng quan hoạt động kinh doanh
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xin chào, <span className="font-semibold text-text-primary">{currentUser?.full_name || "Đối tác"}</span> · Cập nhật theo thời gian thực
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/vendor/registration")}
              className="px-3.5 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <IconHotel size={15} />
              Xem cơ sở & phòng
            </button>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : "TL"}
              </div>
              <div className="leading-tight">
                <span className="text-xs font-bold text-text-primary block truncate max-w-[120px]">
                  {currentUser?.full_name || "Đối tác"}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Đối tác khách sạn</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {kpi.label}
                  </span>
                  <div className={`p-2.5 rounded-xl ${kpi.bg} shadow-xs`}>
                    {kpi.icon}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-heading font-extrabold text-2xl text-text-primary tracking-tight">
                    {loading ? "…" : kpi.value}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">{kpi.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Doanh thu theo cơ sở lưu trú */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-text-primary text-base">
                  Hiệu quả kinh doanh theo cơ sở lưu trú
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Phân tích chi tiết doanh thu, số phòng bán và hoa hồng</p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {report?.facilities?.length || 0} cơ sở hoạt động
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    {[
                      "Tên cơ sở lưu trú",
                      "Doanh thu phòng",
                      "Số phòng đã bán",
                      "Doanh thu vé / dịch vụ",
                      "Vé đã bán",
                      "Hoa hồng sàn",
                      "Thực nhận đối tác"
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-left text-[11px] font-bold uppercase tracking-wider px-6 py-3.5"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report?.facilities || []).map((facility) => (
                    <tr key={facility.facility_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-text-primary flex items-center gap-2">
                        <IconHotel size={16} className="text-primary-600" />
                        {facility.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{formatMoney(facility.room_revenue)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{facility.rooms_sold} phòng</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatMoney(facility.revenue - facility.room_revenue)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{facility.tickets_sold} vé</td>
                      <td className="px-6 py-4 text-sm font-medium text-rose-500">-{formatMoney(facility.commission)}</td>
                      <td className="px-6 py-4 text-sm font-extrabold text-emerald-600">{formatMoney(facility.vendor_net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && !error && !(report?.facilities || []).length && (
              <div className="px-6 py-10 text-center text-xs text-slate-400">
                Chưa có dữ liệu giao dịch phát sinh cho các cơ sở lưu trú trong giai đoạn này.
              </div>
            )}
          </section>

          {/* Biểu đồ & Thống kê nhanh */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ xu hướng */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-heading font-bold text-text-primary text-base">
                    Xu hướng tăng trưởng
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Biểu đồ doanh thu và lượt đặt theo từng tháng</p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setChartType("revenue")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartType === "revenue"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Doanh thu
                  </button>
                  <button
                    onClick={() => setChartType("tickets")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartType === "tickets"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Lượt vé bán
                  </button>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "revenue" ? (
                    <AreaChart data={report?.monthly || []}>
                      <defs>
                        <linearGradient id="vrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(val) => [formatMoney(val), "Doanh thu"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fill="url(#vrev)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={report?.monthly || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="tickets_sold" fill="#0284c7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Thống kê quét QR & Check-in */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                    Tổng lượt quét QR
                  </span>
                  <div className="font-heading font-extrabold text-2xl text-text-primary mt-1">
                    {(report?.qr_scans_total || 0).toLocaleString("vi-VN")}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Lượt quét tại quầy lễ tân</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <IconQR size={22} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nhận phòng hợp lệ
                  </span>
                  <div className="font-heading font-extrabold text-2xl text-emerald-600 mt-1">
                    {(report?.valid_check_ins || 0).toLocaleString("vi-VN")}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Khách hàng đã nhận phòng thành công</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <IconHotel size={22} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                    Mã đã sử dụng trước đó
                  </span>
                  <div className="font-heading font-extrabold text-2xl text-amber-500 mt-1">
                    {(report?.already_used_attempts || 0).toLocaleString("vi-VN")}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Lượt quét mã đã kích hoạt</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                  <IconCheck size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Lịch sử giao dịch bán hàng gần nhất */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-text-primary text-base">
                  Giao dịch đặt phòng gần nhất
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Danh sách các đơn đặt phòng và dịch vụ mới hoàn tất thanh toán</p>
              </div>
              <button
                onClick={() => navigate("/vendor/settlements")}
                className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
              >
                Xem quyết toán doanh thu <IconArrowRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    {[
                      "Mã đặt phòng",
                      "Khách hàng",
                      "Cơ sở / Dịch vụ",
                      "Loại hình",
                      "Số lượng",
                      "Số tiền thanh toán",
                      "Trạng thái"
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-bold uppercase tracking-wider px-6 py-3.5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((b) => (
                    <tr key={`${b.booking_id}-${b.service_name}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                          {b.booking_code}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                            {(b.guest_name || "Khách").split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm font-semibold text-text-primary">{b.guest_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-slate-700 font-medium block">
                          {b.facility_name}
                        </span>
                        <span className="text-xs text-slate-400 block">
                          {b.service_name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {b.service_type === "ROOM" ? "Phòng nghỉ" : b.service_type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600 font-medium">{b.quantity}</td>
                      <td className="px-6 py-3.5 text-sm font-extrabold text-text-primary">{formatMoney(b.revenue)}</td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {error && <p className="px-6 py-4 text-xs text-rose-500 font-medium">{error}</p>}
              {!loading && !error && recentSales.length === 0 && (
                <div className="px-6 py-10 text-center text-xs text-slate-400">
                  Chưa có giao dịch thanh toán nào được ghi nhận.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
