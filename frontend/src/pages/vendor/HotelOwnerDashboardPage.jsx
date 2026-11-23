import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { orderStatus, orderStatusBadgeClass } from "../../utils/bookingUi";
import useAuth from "../../hooks/useAuth";
import useVendorDashboard from "../../hooks/useVendorDashboard";
import { SCREEN_PATHS } from "../../utils/screenNavigation";
import facilityApi from "../../services/api/facilityApi";
import { vendorApi } from "../../services/api/vendorApi";
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
  IconTicket,
  IconBarChart,
  IconDollar,
  IconBell,
  IconUser,
  IconLogOut,
  IconPercent,
  IconQR,
  IconArrowRight,
  IconCheck,
  IconTrendingUp,
  IconCalendar,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconEdit
} from "../../components/Icons";

import { X } from "lucide-react";
export function VendorSidebar({ activeScreen = 6, onNavigate, onProfile, onLogout }) {
  const navigate = useNavigate();
  const { currentUser, logout: authLogout } = useAuth();
  const isAttraction = currentUser?.role === "ACTIVITY_VENDOR";
  const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);

  useEffect(() => {
    if (!["HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(currentUser?.role)) return;
    let isMounted = true;
    const fetchUnreadReviews = async () => {
      try {
        const res = await facilityApi.getManagedReviews(1);
        if (isMounted && res?.data) {
          setUnreadReviewsCount(res.data.unreadCount || 0);
        }
      } catch {
        // silently ignore error in sidebar
      }
    };

    fetchUnreadReviews();

    const handleReviewsUpdated = (e) => {
      if (typeof e.detail?.unreadCount === "number") {
        setUnreadReviewsCount(e.detail.unreadCount);
      } else {
        fetchUnreadReviews();
      }
    };

    window.addEventListener("partner-reviews-updated", handleReviewsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("partner-reviews-updated", handleReviewsUpdated);
    };
  }, [currentUser?.role]);

  const handleProfile = () => {
    if (onProfile) onProfile();
    else navigate("/profile");
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      authLogout?.();
      navigate("/auth/login");
    }
  };

  const handleNav = (link) => {
    const target = link.path || (link.screen ? SCREEN_PATHS[link.screen] : "/vendor");
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target);
    }
  };

  const links = [
    { icon: <IconHome size={18} />, label: "Tổng quan kinh doanh", screen: 6, path: "/vendor" },
    { icon: <IconDollar size={18} />, label: "Báo cáo tài chính", screen: 15, path: "/vendor/revenue" },
    { icon: isAttraction ? <IconTicket size={18} /> : <IconHotel size={18} />, label: isAttraction ? "Cơ sở & Hạng vé" : "Hồ sơ & Phòng nghỉ", screen: 10, path: "/vendor/registration" },
    { icon: <IconBarChart size={18} />, label: isAttraction ? "Giá vé & Hạn mức theo ngày" : "Quản lý tồn kho", screen: 7, path: "/vendor/inventory" },
    ...(isAttraction
      ? [
          { icon: <IconDollar size={18} />, label: "Thanh toán", screen: 13, path: "/vendor/payments" },
          { icon: <IconTicket size={18} />, label: "Đơn đặt vé", screen: 11, path: "/vendor/orders" },
          { icon: <IconCalendar size={18} />, label: "Yêu cầu hủy đơn", screen: 12, path: "/vendor/cancellations" },
        ]
      : [
          { icon: <IconTicket size={18} />, label: "Quản lý đặt phòng", screen: 11, path: "/vendor/orders" },
          { icon: <IconQR size={18} />, label: "Quét mã QR lễ tân", screen: 8, path: "/vendor/qr" },
        ]),
    { icon: <IconDollar size={18} />, label: "Quyết toán & Rút tiền", screen: 9, path: "/vendor/settlements" },
    ...(["HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(currentUser?.role)
      ? [
          {
            icon: <IconBell size={18} />,
            label: "Đánh giá & Phản hồi",
            screen: 14,
            path: "/vendor/reviews",
            badge: unreadReviewsCount > 0 ? unreadReviewsCount : null,
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col flex-shrink-0 font-body">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
            <span className="text-white text-sm font-heading font-extrabold tracking-wider">T</span>
          </div>
          <div>
            <span className="font-heading font-extrabold text-white text-lg tracking-tight block leading-tight">
              travelio
            </span>
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mt-0.5">
              {isAttraction ? "Đối tác tham quan & Tour" : "Đối tác lưu trú"}
            </span>
          </div>
        </div>
      </div>

      {/* Partner Portal Badge */}
      <div className="px-3.5 pt-3 pb-1.5">
        <div className="bg-slate-800/60 rounded-2xl p-2.5 border border-slate-700/40 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500/20 rounded-xl flex items-center justify-center text-sky-400 font-bold text-xs flex-shrink-0">
            {isAttraction ? <IconTicket size={17} /> : <IconHotel size={17} />}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-xs font-bold truncate">Cổng Đối tác Travelio</div>
            <div className="text-slate-400 text-[10px] leading-snug truncate">
              {isAttraction ? "Quản lý tham quan & Trải nghiệm" : "Hệ thống quản lý khách sạn"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 px-3 py-2 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menu Quản trị
        </div>
        {(() => {
          const hasSeparateCancellation = links.some((l) => l.screen === 12);
          return links.map((link) => {
            const isActive =
              activeScreen === link.screen ||
              (!hasSeparateCancellation && link.screen === 11 && activeScreen === 12);
            return (
              <button
                key={link.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNav(link)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left group cursor-pointer ${
                  isActive
                    ? "bg-primary-600 text-white shadow-xs shadow-primary-600/30"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span className={`relative flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-sky-400"}`}>
                  {link.icon}
                </span>
                <span className="flex-1 truncate">{link.label}</span>
                {link.badge ? (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all shadow-xs ${
                      isActive
                        ? "bg-white text-primary-700 ring-2 ring-white/30"
                        : "bg-rose-500 text-white animate-pulse"
                    }`}
                    title={`${link.badge} thông báo mới`}
                  >
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                ) : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs flex-shrink-0" />
                ) : null}
              </button>
            );
          });
        })()}
      </nav>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-slate-800/80 space-y-0.5 flex-shrink-0">
        <button
          onClick={handleProfile}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          <IconUser size={16} />
          <span>Hồ sơ tài khoản</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition cursor-pointer"
        >
          <IconLogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

export { VendorSidebar as Sidebar };

export function PartnerUserBadge({ currentUser }) {
  const navigate = useNavigate();
  const isHotel = currentUser?.role === "HOTEL_OWNER";
  const roleLabel = isHotel
    ? "Chủ khách sạn"
    : currentUser?.role === "ACTIVITY_VENDOR"
    ? "Đối tác tham quan"
    : "Đối tác";

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .trim()
        .split(/\s+/)
        .map((p) => p[0] || "")
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "TL"
    : "TL";

  return (
    <div
      onClick={() => navigate("/profile")}
      title="Hồ sơ tài khoản & Cài đặt"
      className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs transition cursor-pointer select-none"
    >
      <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
        {initials}
      </div>
      <div className="leading-tight min-w-0">
        <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
          {currentUser?.full_name || "Đối tác"}
        </span>
        <span className="text-[10px] text-slate-500 block font-medium truncate">
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

export default function HotelOwnerDashboardPage({ embedded = false }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const isAttraction = currentUser?.role === "ACTIVITY_VENDOR";

  // State khoảng thời gian lọc dữ liệu
  const [period, setPeriod] = useState("all"); // "all", "month", "prev_month", "last30", "custom"
  const [customMonth, setCustomMonth] = useState("");
  const [chartMetric, setChartMetric] = useState("revenue"); // "revenue", "tickets"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [financialToday] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()),
  );

  const prevMonthKey = useMemo(() => {
    const [y, m] = financialToday.slice(0, 7).split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    return prevDate.toISOString().slice(0, 7);
  }, [financialToday]);

  const getMonthBounds = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return {
      from: `${ym}-01`,
      to: `${ym}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const queryParams = useMemo(() => {
    if (period === "month") {
      return { from: `${financialToday.slice(0, 7)}-01`, to: financialToday };
    }
    if (period === "prev_month") {
      return getMonthBounds(prevMonthKey);
    }
    if (period === "custom" && /^\d{4}-\d{2}$/.test(customMonth)) {
      return getMonthBounds(customMonth);
    }
    if (period === "last30") {
      const endMs = Date.parse(`${financialToday}T00:00:00Z`);
      const startStr = new Date(endMs - 30 * 86400000).toISOString().split("T")[0];
      return { from: startStr, to: financialToday };
    }
    return {};
  }, [period, customMonth, financialToday, prevMonthKey]);

  const { report, loading, error, reload: reloadReport } = useVendorDashboard(queryParams);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editFacilityName, setEditFacilityName] = useState("");
  const [savingFacilityName, setSavingFacilityName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const formatMoney = (val) =>
    Number(val || 0).toLocaleString("vi-VN") + " VND";

  const formatCompactMoney = (val) => {
    const n = Number(val || 0);
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  };

  const primaryFacility =
    Array.isArray(report?.facilities) && report.facilities.length > 0 ? report.facilities[0] : null;

  const handleOpenEditName = () => {
    setEditFacilityName(primaryFacility?.name || "");
    setNameError("");
    setNameSuccess("");
    setIsEditNameOpen(true);
  };

  const handleSaveFacilityName = async (e) => {
    e?.preventDefault();
    if (!editFacilityName.trim()) {
      setNameError("Vui lòng nhập tên cơ sở lưu trú.");
      return;
    }
    const facilityId = primaryFacility?.facility_id || primaryFacility?._id;
    if (!facilityId) {
      setNameError("Không tìm thấy thông tin cơ sở lưu trú.");
      return;
    }
    setSavingFacilityName(true);
    setNameError("");
    try {
      await vendorApi.updateFacility(facilityId, { name: editFacilityName.trim() });
      setNameSuccess("Cập nhật tên cơ sở thành công.");
      setTimeout(() => {
        setIsEditNameOpen(false);
        setNameSuccess("");
      }, 1000);
      if (reloadReport) reloadReport();
    } catch (err) {
      setNameError(err.response?.data?.message || err.message || "Không thể cập nhật tên cơ sở.");
    } finally {
      setSavingFacilityName(false);
    }
  };

  // Lọc danh sách giao dịch gần nhất
  const filteredSales = useMemo(() => {
    const salesList = Array.isArray(report?.recent_sales) ? report.recent_sales : [];
    return salesList.filter((item) => {
      if (!item) return false;
      const matchesSearch =
        !searchTerm.trim() ||
        (item.booking_code && item.booking_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.guest_name && item.guest_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.service_name && item.service_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "ALL" || (item.status || "CONFIRMED") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [report, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  // Cắt danh sách theo trang hiện tại
  const paginatedSales = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredSales.slice(startIndex, startIndex + pageSize);
  }, [filteredSales, safePage, pageSize]);

  // Tính toán các chỉ số phụ trợ cho KPI
  const totalRev = Number(report?.total_revenue || 0);
  const roomRev = Number(report?.room_revenue || totalRev);
  const netRev = Number(report?.vendor_net || 0);
  const commissionRev = Number(report?.platform_commission || 0);
  const roomsSold = Number(report?.rooms_sold || 0);
  const avgRoomRate = roomsSold > 0 ? Math.round(roomRev / roomsSold) : 0;
  const netRatePercent = totalRev > 0 ? Math.round((netRev / totalRev) * 100) : 0;
  const commissionPercent = totalRev > 0 ? Math.round((commissionRev / totalRev) * 100) : 0;

  const totalQrScans = Number(report?.qr_scans?.total || 0);
  const validQrScans = Number(report?.qr_scans?.valid || 0);
  const validQrRate = totalQrScans > 0 ? Math.round((validQrScans / totalQrScans) * 100) : 0;

  const monthlyData = useMemo(() => {
    const list = Array.isArray(report?.monthly) ? report.monthly : [];
    const sales = Array.isArray(report?.recent_sales) ? report.recent_sales : [];
    return list.map((item) => {
      let roomsSoldVal = Number(item.rooms_sold ?? 0);
      if (!roomsSoldVal && !isAttraction) {
        const fromSales = sales
          .filter((s) => s?.payment_date && String(s.payment_date).slice(0, 7) === item.month)
          .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        roomsSoldVal = fromSales || (list.length === 1 ? Number(report?.rooms_sold || 0) : 0);
      }
      return {
        ...item,
        rooms_sold: roomsSoldVal,
        tickets_sold: Number(item.tickets_sold ?? 0),
        vendor_net: Number(item.vendor_net ?? Math.max(0, Number(item.revenue || 0) - Number(item.commission || 0))),
      };
    });
  }, [report, isAttraction]);

  // Nếu chỉ có 1 tháng duy nhất, thêm điểm đầu kỳ 0 VND để AreaChart vẽ được miền thay vì chỉ 1 chấm đơn lẻ
  const revenueChartData = useMemo(() => {
    if (monthlyData.length !== 1) return monthlyData;
    const only = monthlyData[0];
    const [y, m] = String(only.month || "2026-10").split("-").map(Number);
    const prev = new Date(Date.UTC(y || 2026, (m || 10) - 2, 1)).toISOString().slice(0, 7);
    return [
      { month: prev, revenue: 0, vendor_net: 0, rooms_sold: 0, tickets_sold: 0 },
      only,
    ];
  }, [monthlyData]);

  const settlementUrl = `/vendor/revenue?${new URLSearchParams(
    queryParams.from
      ? queryParams
      : { from: `${financialToday.slice(0, 7)}-01`, to: financialToday },
  )}`;

  const quickActions = [
    {
      title: "Đơn đặt phòng & Duyệt hủy",
      desc: "Xem danh sách khách đặt, xử lý đổi ngày & hoàn tiền",
      icon: <IconTicket size={18} />,
      color: "bg-primary-50 text-primary-600 border-primary-100",
      path: "/vendor/orders",
    },
    {
      title: "Tồn kho & Lịch phòng trống",
      desc: "Cập nhật số phòng mở bán và giá theo ngày",
      icon: <IconBarChart size={18} />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      path: "/vendor/inventory",
    },
    {
      title: "Hồ sơ & Hạng phòng",
      desc: "Chỉnh sửa thông tin khách sạn, tiện nghi & loại phòng",
      icon: <IconHotel size={18} />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      path: "/vendor/registration",
    },
    {
      title: "Quét mã QR Lễ tân",
      desc: "Xác thực mã đặt phòng của khách khi nhận phòng",
      icon: <IconQR size={18} />,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      path: "/vendor/qr",
    },
    {
      title: "Tài chính & Quyết toán",
      desc: "Đối soát doanh thu thực nhận và lịch sử thanh toán",
      icon: <IconDollar size={18} />,
      color: "bg-sky-50 text-sky-600 border-sky-100",
      path: settlementUrl,
    },
  ];

  return (
    <div className="flex h-full bg-[#f8fafc] font-body overflow-hidden">
      {/* Sidebar chung của Vendor (ẩn khi nhúng trong khung admin) */}
      {!embedded && (
        <VendorSidebar
          activeScreen={6}
          onNavigate={(path) => navigate(path)}
          onProfile={() => navigate("/profile")}
          onLogout={() => {
            logout?.();
            navigate("/auth/login");
          }}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar điều hướng */}
        <header className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                {embedded ? "Doanh số toàn hệ thống" : "Bảng điều khiển kinh doanh khách sạn"}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Trực tuyến
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Xin chào, <span className="font-semibold text-slate-800">{currentUser?.full_name || "Đối tác"}</span> · Theo dõi hiệu suất phòng nghỉ, doanh thu và vận hành lễ tân
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bộ lọc khoảng thời gian */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {[
                { key: "all", label: "Tất cả" },
                { key: "month", label: `Tháng này (${financialToday.slice(5, 7)}/${financialToday.slice(0, 4)})` },
                { key: "prev_month", label: `Tháng trước (${prevMonthKey.slice(5, 7)}/${prevMonthKey.slice(0, 4)})` },
                { key: "last30", label: "30 ngày qua" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPeriod(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    period === item.key
                      ? "bg-white text-primary-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <input
                type="month"
                aria-label="Chọn tháng báo cáo"
                value={period === "custom" ? customMonth : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setCustomMonth(val);
                    setPeriod("custom");
                  } else {
                    setPeriod("all");
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  period === "custom"
                    ? "bg-white text-primary-600 border-primary-300 shadow-xs"
                    : "bg-transparent border-transparent text-slate-600 hover:bg-white/60"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={reloadReport}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>

            <PartnerUserBadge currentUser={currentUser} />
          </div>
        </header>

        {/* Nội dung chính Dashboard */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center justify-between gap-3">
              <span>Không thể tải dữ liệu báo cáo: {error}</span>
              <button
                type="button"
                onClick={reloadReport}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && period !== "all" && totalRev === 0 && (report?.recent_sales?.length || 0) === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                Kỳ lọc hiện tại (<strong>{queryParams.from}</strong> đến <strong>{queryParams.to}</strong>) chưa có giao dịch đặt phòng nào phát sinh thanh toán. Các giao dịch gần nhất trên hệ thống nằm ở kỳ trước.
              </div>
              <div className="flex items-center gap-2">
                {period !== "prev_month" && (
                  <button
                    type="button"
                    onClick={() => setPeriod("prev_month")}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 cursor-pointer"
                  >
                    Xem Tháng {prevMonthKey.slice(5, 7)}/{prevMonthKey.slice(0, 4)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPeriod("all")}
                  className="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 cursor-pointer"
                >
                  Xem tất cả thời gian
                </button>
              </div>
            </div>
          )}

          {/* 1. THẺ CƠ SỞ LƯU TRÚ CHỦ LỰC & LỐI TẮT NGHIỆP VỤ */}
          {!embedded && (
            <section className="space-y-4">
              {primaryFacility ? (
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-500/20 border border-primary-400/30 text-sky-300 flex items-center justify-center flex-shrink-0">
                        <IconHotel size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-tight">
                            {primaryFacility.name}
                          </h2>
                          <button
                            type="button"
                            onClick={handleOpenEditName}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-white/10 cursor-pointer"
                            title="Chỉnh sửa tên cơ sở lưu trú"
                          >
                            <IconEdit size={13} />
                            <span>Đổi tên</span>
                          </button>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Đang hoạt động
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                          Quản lý tập trung lịch phòng trống, xử lý đơn đặt phòng hoặc yêu cầu đổi lịch/hoàn tiền của khách và đối soát doanh thu định kỳ.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate("/vendor/orders")}
                        className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <IconTicket size={15} />
                        Quản lý đơn đặt phòng
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/vendor/inventory")}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 border border-white/15 cursor-pointer"
                      >
                        <IconBarChart size={15} />
                        Cập nhật tồn kho
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/vendor/qr")}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 border border-white/15 cursor-pointer"
                      >
                        <IconQR size={15} />
                        Quét QR lễ tân
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center flex-shrink-0">
                        <IconHotel size={24} />
                      </div>
                      <div>
                        <h2 className="font-heading font-bold text-base text-slate-900">
                          Thiết lập cơ sở lưu trú & hạng phòng
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cập nhật thông tin khách sạn, hình ảnh và danh sách các loại phòng để bắt đầu nhận đặt phòng trên Travelio.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/vendor/registration")}
                      className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
                    >
                      Thiết lập ngay →
                    </button>
                  </div>
                )
              )}

              {/* Thanh 5 lối tắt nghiệp vụ chính của Chủ khách sạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    to={action.path}
                    className="bg-white border border-slate-200/90 hover:border-primary-300 rounded-2xl p-3.5 shadow-2xs hover:shadow-sm transition-all flex items-start gap-3 group"
                  >
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${action.color}`}>
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-primary-600 transition-colors flex items-center justify-between gap-1">
                        <span className="truncate">{action.title}</span>
                        <IconArrowRight size={12} className="text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                        {action.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Modal Đổi tên cơ sở lưu trú */}
          {isEditNameOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <IconHotel size={18} className="text-primary-600" />
                    Chỉnh sửa tên cơ sở lưu trú
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditNameOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg leading-none cursor-pointer"
                  >
                    <X size="1em" className="inline-block align-[-0.125em] shrink-0" />
                  </button>
                </div>

                <form onSubmit={handleSaveFacilityName} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Tên cơ sở lưu trú / Khách sạn <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editFacilityName}
                      onChange={(e) => setEditFacilityName(e.target.value)}
                      placeholder="Nhập tên cơ sở lưu trú..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 text-slate-800 font-medium"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400">
                      Tên này hiển thị trên bảng điều khiển và đồng bộ với thông tin hiển thị cho khách hàng đặt phòng.
                    </p>
                  </div>

                  {nameError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                      {nameError}
                    </div>
                  )}

                  {nameSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                      <IconCheck size={14} className="text-emerald-600" />
                      {nameSuccess}
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditNameOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                      disabled={savingFacilityName}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingFacilityName || !editFacilityName.trim()}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingFacilityName ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. CÁC THẺ KPI CHỈ SỐ KINH DOANH CHÍNH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Thực nhận đối tác (Net Revenue) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Thực nhận đối tác
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <IconDollar size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-emerald-600 tracking-tight">
                  {loading ? "..." : formatMoney(netRev)}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <IconCheck size={12} className="text-emerald-500" />
                    Sau chiết khấu sàn
                  </span>
                  {totalRev > 0 && (
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {netRatePercent}% gộp
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 2: Tổng doanh thu đặt phòng */}
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-primary-500 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng doanh thu phòng
                </span>
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
                  <IconTrendingUp size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
                  {loading ? "..." : formatMoney(roomRev)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Tổng giá trị giao dịch đặt phòng thành công
                </p>
              </div>
            </div>

            {/* KPI 3: Đêm phòng đã bán & Giá trung bình */}
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-500 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Số lượng phòng đã bán
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <IconHotel size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
                  {loading ? "..." : `${roomsSold.toLocaleString("vi-VN")} đêm phòng`}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Trung bình:{" "}
                  <strong className="text-slate-700 font-mono">
                    {avgRoomRate > 0 ? formatMoney(avgRoomRate) : "0 VND"}
                  </strong>{" "}
                  / đêm
                </p>
              </div>
            </div>

            {/* KPI 4: Hoa hồng & Phí sàn */}
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-rose-500 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Hoa hồng & Phí sàn
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <IconPercent size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-rose-600 tracking-tight">
                  {loading ? "..." : formatMoney(commissionRev)}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                  <span>Phí nền tảng Travelio</span>
                  {totalRev > 0 && (
                    <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                      ~{commissionPercent}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. BIỂU ĐỒ DOANH THU & VẬN HÀNH CHECK-IN LỄ TÂN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ xu hướng tăng trưởng (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">
                    Xu hướng kinh doanh theo tháng
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Biểu đồ theo dõi tổng doanh thu, thực nhận và số lượng đêm phòng bán ra
                  </p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setChartMetric("revenue")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartMetric === "revenue"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Doanh thu (VND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("tickets")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartMetric === "tickets"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {isAttraction ? "Vé & dịch vụ" : "Đêm phòng đã bán"}
                  </button>
                </div>
              </div>

              {monthlyData.length === 0 && !loading ? (
                <div className="h-64 flex flex-col items-center justify-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center px-4">
                  <p className="text-xs font-semibold text-slate-600">
                    Chưa có dữ liệu phát sinh theo tháng trong kỳ đã chọn
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Các đơn đặt phòng đã thanh toán sẽ tự động tổng hợp biểu đồ tại đây.
                  </p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMetric === "revenue" ? (
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="hotelRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="hotelNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatCompactMoney}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            fontSize: "12px",
                          }}
                          formatter={(val, name) => [
                            formatMoney(val),
                            name === "vendor_net" ? "Thực nhận đối tác" : "Tổng doanh thu",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#0284c7" }}
                          fill="url(#hotelRev)"
                        />
                        <Area
                          type="monotone"
                          dataKey="vendor_net"
                          stroke="#059669"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#059669" }}
                          fill="url(#hotelNet)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                          }}
                          formatter={(val) => [
                            `${Number(val).toLocaleString("vi-VN")} ${isAttraction ? "vé" : "đêm phòng"}`,
                            isAttraction ? "Vé & dịch vụ" : "Đêm phòng đã bán",
                          ]}
                        />
                        <Bar
                          dataKey={isAttraction ? "tickets_sold" : "rooms_sold"}
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Thống kê vận hành Lễ tân & Check-in QR (1/3 width) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-heading font-bold text-base text-slate-900">
                      Vận hành Check-in QR
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Xác thực đón tiếp khách tại quầy lễ tân
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <IconQR size={18} />
                  </div>
                </div>

                {/* Thanh tỷ lệ hợp lệ */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Tỷ lệ quét mã hợp lệ</span>
                    <span className="font-mono font-bold text-slate-900">{validQrRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${validQrRate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-semibold text-slate-600">Tổng lượt quét QR</span>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {totalQrScans.toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-800">Nhận phòng thành công</span>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-700">
                      {validQrScans.toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-amber-800">Mã đã kích hoạt trước</span>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-amber-700">
                      {(report?.qr_scans?.already_redeemed || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-xs font-semibold text-rose-800">Không hợp lệ / Sai cơ sở</span>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-rose-700">
                      {(report?.qr_scans?.invalid || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/vendor/qr")}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <IconQR size={16} />
                Mở máy quét mã QR lễ tân
              </button>
            </div>
          </div>

          {/* 4. DOANH THU THEO TỪNG CƠ SỞ LƯU TRÚ */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">
                  Hiệu quả kinh doanh theo cơ sở lưu trú
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chi tiết doanh thu bán phòng, số đêm phòng đã bán và đối soát thực nhận từng cơ sở
                </p>
              </div>
              <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                {report?.facilities?.length || 0} cơ sở đang quản lý
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Cơ sở lưu trú</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Đêm phòng đã bán</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Doanh thu phòng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Hoa hồng sàn</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Thực nhận đối tác</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5 text-right">Thao tác nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report?.facilities || []).map((fac) => (
                    <tr key={fac.facility_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                            <IconHotel size={17} />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block">{fac.name}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              Mã CS: {String(fac.facility_id).slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                        <span className="bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg font-mono">
                          {Number(fac.rooms_sold || 0).toLocaleString("vi-VN")} đêm
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-sm text-slate-800 font-mono">
                        {formatMoney(fac.room_revenue)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-xs text-rose-600 font-mono">
                        -{formatMoney(fac.commission)}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-sm text-emerald-600 font-mono">
                        {formatMoney(fac.vendor_net)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate("/vendor/inventory")}
                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Tồn kho
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate("/vendor/registration")}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            Cấu hình phòng <IconArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && !error && !(report?.facilities || []).length && (
              <div className="px-6 py-10 text-center text-xs text-slate-500">
                Chưa có cơ sở lưu trú nào phát sinh giao dịch trong khoảng thời gian này.
              </div>
            )}
          </section>

          {/* 5. DANH SÁCH GIAO DỊCH ĐẶT PHÒNG GẦN NHẤT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header bảng giao dịch */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">
                  Giao dịch đặt phòng gần nhất
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách các đơn đặt phòng đã thanh toán gần đây trên hệ thống
                </p>
              </div>

              {/* Ô tìm kiếm & lọc nhanh */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã đơn, tên khách, loại phòng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-primary-500 w-56"
                  />
                </div>

                <select
                  aria-label="Lọc trạng thái đơn"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="COMPLETED">Hoàn thành</option>
                </select>

                <button
                  type="button"
                  onClick={() => navigate("/vendor/orders")}
                  className="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  Quản lý đơn đặt phòng <IconArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Mã đặt phòng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Khách hàng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Hạng phòng / Cơ sở</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Số lượng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Doanh thu</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-5 py-3.5">Ngày thanh toán</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((b) => {
                    const orderStatusValue = b.status || "CONFIRMED";
                    return (
                      <tr key={`${b.booking_id}-${b.service_name}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/50">
                            {b.booking_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center border border-slate-200 flex-shrink-0">
                              {(b.guest_name || "K")[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
                              {b.guest_name || "Khách đặt phòng"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold text-slate-800 block">
                            {b.service_name}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {b.facility_name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {b.quantity} {b.service_type === "ROOM" ? "đêm phòng" : "vé"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-extrabold text-slate-900 font-mono whitespace-nowrap">
                          {formatMoney(b.revenue)}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {b.payment_date ? new Date(b.payment_date).toLocaleDateString("vi-VN") : "Hôm nay"}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${orderStatusBadgeClass(orderStatusValue)}`}>
                            {orderStatus(orderStatusValue)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && !error && filteredSales.length === 0 && (
                <div className="px-6 py-12 text-center text-xs text-slate-500 space-y-2">
                  <p>Không tìm thấy giao dịch đặt phòng nào phù hợp với bộ lọc hiện tại.</p>
                  {(searchTerm || statusFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("ALL");
                      }}
                      className="text-primary-600 font-bold hover:underline cursor-pointer"
                    >
                      Xóa điều kiện lọc
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Phân trang */}
            {!loading && !error && filteredSales.length > 0 && (
              <div className="px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Hiển thị{" "}
                    <strong className="text-slate-700 font-semibold">
                      {(safePage - 1) * pageSize + 1}
                    </strong>{" "}
                    -{" "}
                    <strong className="text-slate-700 font-semibold">
                      {Math.min(safePage * pageSize, filteredSales.length)}
                    </strong>{" "}
                    trên tổng số{" "}
                    <strong className="text-slate-700 font-semibold">{filteredSales.length}</strong> giao dịch
                  </span>

                  <span className="text-slate-300">|</span>

                  <div className="flex items-center gap-1.5">
                    <span>Số dòng:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-primary-500 cursor-pointer"
                    >
                      <option value={5}>5 / trang</option>
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang trước"
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 5) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - safePage) <= 1) return true;
                        return false;
                      })
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) {
                          acc.push({ type: "dots", key: `dots-${p}` });
                        }
                        acc.push({ type: "page", page: p, key: `page-${p}` });
                        return acc;
                      }, [])
                      .map((item) => {
                        if (item.type === "dots") {
                          return (
                            <span key={item.key} className="px-1.5 text-xs text-slate-400">
                              ...
                            </span>
                          );
                        }
                        const p = item.page;
                        const isActive = p === safePage;
                        return (
                          <button
                            key={item.key}
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                              isActive
                                ? "bg-primary-600 text-white shadow-2xs"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer"
                    title="Trang kế tiếp"
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer trang đối tác khách sạn */}
          <footer className="mt-8 pt-6 pb-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-heading font-extrabold shadow-2xs">
                T
              </div>
              <div>
                <span className="font-heading font-bold text-slate-800">Cổng Đối tác Lưu trú Travelio</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Hệ thống quản lý khách sạn & đặt phòng</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <span>Hỗ trợ đối tác: <strong className="text-slate-700 font-semibold">partner-support@travelio.com</strong></span>
              <span className="text-slate-300">|</span>
              <span>Hotline: <strong className="text-slate-700 font-semibold">1900 6868</strong></span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
