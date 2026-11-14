import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  IconSettings,
  IconBell,
  IconUser,
  IconLogOut,
  IconPercent,
  IconQR,
  IconArrowRight,
  IconCheck,
  IconShield,
  IconTrendingUp,
  IconCalendar,
  IconFilter,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconEdit
} from "../../components/Icons";

export function VendorSidebar({ activeScreen = 6, onNavigate, onProfile, onLogout }) {
  const navigate = useNavigate();
  const { currentUser, logout: authLogout } = useAuth();
  const isAttraction = currentUser?.role === "ACTIVITY_VENDOR";
  const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);

  useEffect(() => {
    if (!['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role)) return;
    let isMounted = true;
    const fetchUnreadReviews = async () => {
      try {
        const res = await facilityApi.getManagedReviews(1);
        if (isMounted && res?.data) {
          setUnreadReviewsCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // silently ignore error in sidebar
      }
    };

    fetchUnreadReviews();

    const handleReviewsUpdated = (e) => {
      if (typeof e.detail?.unreadCount === 'number') {
        setUnreadReviewsCount(e.detail.unreadCount);
      } else {
        fetchUnreadReviews();
      }
    };

    window.addEventListener('partner-reviews-updated', handleReviewsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('partner-reviews-updated', handleReviewsUpdated);
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
    ...(isAttraction ? [{ icon: <IconDollar size={18} />, label: 'Báo cáo tài chính', screen: 15, path: '/vendor/revenue' }] : []),
    { icon: isAttraction ? <IconTicket size={18} /> : <IconHotel size={18} />, label: isAttraction ? "Cơ sở & Hạng vé" : "Hồ sơ & Phòng nghỉ", screen: 10, path: "/vendor/registration" },
    { icon: <IconBarChart size={18} />, label: isAttraction ? "Giá vé & Hạn mức theo ngày" : "Quản lý tồn kho", screen: 7, path: "/vendor/inventory" },
    ...(isAttraction ? [
      { icon: <IconDollar size={18} />, label: "Thanh toán", screen: 13, path: "/vendor/payments" },
      { icon: <IconTicket size={18} />, label: "Ticket Orders · Đơn đặt vé", screen: 11, path: "/vendor/orders" },
      { icon: <IconCalendar size={18} />, label: "Yêu cầu hủy đơn", screen: 12, path: "/vendor/cancellations" }
    ] : [
      { icon: <IconTicket size={18} />, label: "Quản lý đặt phòng", screen: 11, path: "/vendor/orders" },
      { icon: <IconQR size={18} />, label: "Quét mã QR lễ tân", screen: 8, path: "/vendor/qr" }
    ]),
    { icon: <IconDollar size={18} />, label: isAttraction ? "Quyết toán & Doanh thu" : "Tài chính & Quyết toán", screen: 9, path: "/vendor/settlements" },
    ...(['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role) ? [{
      icon: <IconBell size={18} />,
      label: "Đánh giá & Phản hồi",
      screen: 14,
      path: "/vendor/reviews",
      badge: unreadReviewsCount > 0 ? unreadReviewsCount : null,
    }] : [])
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col flex-shrink-0 font-body">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
            <span className="text-white text-sm font-heading font-extrabold tracking-wider">T</span>
          </div>
          <div>
            <span className="font-heading font-extrabold text-white text-lg tracking-tight block">
              travelio
            </span>
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">
              {isAttraction ? "Đối tác tham quan & Tour" : "Đối tác lưu trú"}
            </span>
          </div>
        </div>
      </div>

      {/* Partner Portal Badge */}
      <div className="px-3.5 pt-4 pb-2">
        <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/40 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500/20 rounded-xl flex items-center justify-center text-sky-400 font-bold text-xs flex-shrink-0">
            {isAttraction ? <IconTicket size={18} /> : <IconHotel size={18} />}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-xs font-bold truncate">Partner Extranet</div>
            <div className="text-slate-400 text-[10px] leading-4 whitespace-normal break-words">{isAttraction ? "Quản lý tham quan & Trải nghiệm" : "Hệ thống quản lý khách sạn"}</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menu Quản trị
        </div>
        {links.map((link) => {
          const isActive =
            activeScreen === link.screen ||
            (link.screen === 11 && activeScreen === 12) ||
            (link.screen === 9 && activeScreen === 15);
          return (
            <button
              key={link.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleNav(link)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                isActive
                  ? "bg-primary-600 text-white shadow-xs shadow-primary-600/30"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <span className={`relative ${isActive ? "text-white" : "text-slate-400 group-hover:text-sky-400"}`}>
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
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              ) : isActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile Section */}
      <div className="p-3.5 border-t border-slate-800/80 space-y-1 flex-shrink-0">
        <button
          onClick={handleProfile}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <IconUser size={16} />
          <span>Hồ sơ tài khoản</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
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
    ? "Hotel Owner"
    : currentUser?.role === "ACTIVITY_VENDOR"
    ? "Attraction Vendor"
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
        <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
          {currentUser?.full_name || "Đối tác"}
        </span>
        <span className="text-[10px] text-slate-400 block font-medium truncate">
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

export { PartnerUserBadge as UserBadge };

export default function HotelOwnerDashboardPage({ embedded = false }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const isAttraction = currentUser?.role === "ACTIVITY_VENDOR";

  // State khoảng thời gian lọc dữ liệu
  const [period, setPeriod] = useState("all"); // "month", "last30", "all"
  const [chartMetric, setChartMetric] = useState("revenue"); // "revenue", "tickets"
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [financialToday] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));

  const queryParams = useMemo(() => {
    const now = new Date();
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    if (period === "last30") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      return { from: start.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    return {};
  }, [period]);

  const { report, loading, error, reload: reloadReport } = useVendorDashboard(queryParams);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editFacilityName, setEditFacilityName] = useState("");
  const [savingFacilityName, setSavingFacilityName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const formatMoney = (val) =>
    Number(val || 0).toLocaleString("vi-VN") + " VND";

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
      const matchesType =
        serviceTypeFilter === "ALL" || item.service_type === serviceTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [report?.recent_sales, searchTerm, serviceTypeFilter]);

  // Reset về trang 1 khi lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, serviceTypeFilter, period]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));

  // Cắt danh sách theo trang hiện tại
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSales.slice(startIndex, startIndex + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  return (
    <div className="flex h-full bg-[#f8fafc] font-body overflow-hidden">
      {/* Sidebar chung của Vendor (ẩn khi nhúng trong khung admin) */}
      {!embedded && <VendorSidebar
        activeScreen={6}
        onNavigate={(path) => navigate(path)}
        onProfile={() => navigate("/profile")}
        onLogout={() => {
          logout?.();
          navigate("/auth/login");
        }}
      />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar điều hướng */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between flex-shrink-0 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-slate-900 text-xl tracking-tight">
                {embedded ? "Doanh số toàn hệ thống" : "Bảng điều khiển kinh doanh khách sạn"}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Xin chào, <span className="font-semibold text-slate-800">{currentUser?.full_name || "Đối tác"}</span> · Báo cáo doanh số và hoạt động đặt phòng theo thời gian thực
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ lọc khoảng thời gian */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setPeriod("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  period === "all"
                    ? "bg-white text-primary-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  period === "month"
                    ? "bg-white text-primary-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setPeriod("last30")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  period === "last30"
                    ? "bg-white text-primary-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                30 ngày qua
              </button>
            </div>

            {/* Phím tắt sang Quản lý phòng (chỉ dành cho đối tác) */}
            {!embedded && <button
              onClick={() => navigate("/vendor/registration")}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <IconHotel size={15} />
              Quản lý phòng
            </button>}

            {/* User Avatar Badge */}
            <PartnerUserBadge currentUser={currentUser} />
          </div>
        </header>

        {/* Nội dung chính Dashboard */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {currentUser?.role === 'HOTEL_OWNER' && (
            <Link
              className="inline-block text-sm font-semibold text-primary-600 hover:text-primary-700 transition"
              to={`/vendor/settlements?tab=revenue&${new URLSearchParams(queryParams.from ? queryParams : { from: `${financialToday.slice(0, 7)}-01`, to: financialToday })}`}
            >
              Báo cáo tài chính & Đối soát →
            </Link>
          )}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1. THẺ GIỚI THIỆU KHÁCH SẠN CHỦ LỰC (HERO CARD) */}
          {primaryFacility && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/20 border border-primary-400/30 text-primary-300 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <IconHotel size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-heading font-extrabold text-xl text-white tracking-tight">
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
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Đang hoạt động
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Cơ sở lưu trú đã kết nối hoạt động với nền tảng Travelio. Quản lý trạng thái phòng nghỉ, cập nhật biểu phí và thiết lập tiện ích đón tiếp khách lưu trú.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => navigate("/vendor/registration")}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                  >
                    <IconHotel size={16} />
                    Hồ sơ & Quản lý loại phòng
                  </button>
                  <button
                    onClick={() => navigate("/vendor/qr")}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 backdrop-blur-xs border border-white/10"
                  >
                    <IconQR size={16} />
                    Máy quét QR lễ tân
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Đổi tên cơ sở lưu trú */}
          {isEditNameOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
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
                    ✕
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
                      Tên này hiển thị trên Dashboard và đồng bộ với thông tin hiển thị cho khách hàng đặt phòng.
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
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Thực nhận đối tác
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <IconDollar size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-emerald-600 tracking-tight">
                  {loading ? "..." : formatMoney(report?.vendor_net)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                  <IconCheck size={12} className="text-emerald-500" />
                  Doanh thu thực tế sau khi trừ chiết khấu sàn
                </p>
              </div>
            </div>

            {/* KPI 2: Doanh thu bán phòng */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Doanh thu phòng nghỉ
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <IconHotel size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
                  {loading ? "..." : formatMoney(report?.room_revenue)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Đã bán {(report?.rooms_sold || 0).toLocaleString("vi-VN")} lượt/đêm phòng
                </p>
              </div>
            </div>

            {/* KPI 3: Tổng doanh thu gộp */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tổng doanh thu gộp
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <IconTrendingUp size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
                  {loading ? "..." : formatMoney(report?.total_revenue)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Tổng giá trị giao dịch khách thanh toán
                </p>
              </div>
            </div>

            {/* KPI 4: Hoa hồng & Phí sàn */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Hoa hồng & Phí sàn
                </span>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <IconPercent size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading font-extrabold text-2xl text-rose-600 tracking-tight">
                  {loading ? "..." : formatMoney(report?.platform_commission)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Phí dịch vụ & hạ tầng kết nối Travelio
                </p>
              </div>
            </div>
          </div>

          {/* 3. BIỂU ĐỒ DOANH THU & VẬN HÀNH CHECK-IN LỄ TÂN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ xu hướng tăng trưởng (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">
                    Xu hướng kinh doanh theo tháng
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Biểu đồ đối soát doanh thu và tăng trưởng dòng tiền</p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setChartMetric("revenue")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartMetric === "revenue"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Doanh thu (VND)
                  </button>
                  <button
                    onClick={() => setChartMetric("tickets")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartMetric === "tickets"
                        ? "bg-white text-primary-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {isAttraction ? "Vé & dịch vụ" : "Đêm phòng đã bán"}
                  </button>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === "revenue" ? (
                    <AreaChart data={Array.isArray(report?.monthly) ? report.monthly : []}>
                      <defs>
                        <linearGradient id="hotelRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: "12px"
                        }}
                        formatter={(val) => [formatMoney(val), "Doanh thu"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        fill="url(#hotelRev)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={Array.isArray(report?.monthly) ? report.monthly : []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px"
                        }}
                        formatter={(val) => [
                          `${Number(val).toLocaleString("vi-VN")} ${isAttraction ? "vé" : "đêm phòng"}`,
                          isAttraction ? "Vé & dịch vụ" : "Đêm phòng đã bán"
                        ]}
                      />
                      <Bar dataKey="tickets_sold" fill="#0284c7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Thống kê vận hành Lễ tân & Check-in QR (1/3 width) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wide">
                      Vận hành Check-in QR
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Xác thực đón tiếp khách tại quầy lễ tân</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <IconQR size={17} />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {/* Tổng lượt quét */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-semibold text-slate-600">Tổng lượt quét QR</span>
                    </div>
                    <span className="font-heading font-extrabold text-base text-slate-900">
                      {(report?.qr_scans?.total || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {/* Hợp lệ */}
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-800">Nhận phòng thành công</span>
                    </div>
                    <span className="font-heading font-extrabold text-base text-emerald-600">
                      {(report?.qr_scans?.valid || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {/* Đã sử dụng trước đó */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-amber-800">Mã đã kích hoạt trước</span>
                    </div>
                    <span className="font-heading font-extrabold text-base text-amber-600">
                      {(report?.qr_scans?.already_redeemed || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {/* Không hợp lệ */}
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-semibold text-rose-800">Không hợp lệ / Sai cơ sở</span>
                    </div>
                    <span className="font-heading font-extrabold text-base text-rose-600">
                      {(report?.qr_scans?.invalid || 0).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate("/vendor/qr")}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <IconQR size={16} />
                Mở máy quét mã QR lễ tân
              </button>
            </div>
          </div>

          {/* 4. DOANH THU THEO TỪNG CƠ SỞ LƯU TRÚ */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">
                  Hiệu quả kinh doanh cơ sở lưu trú
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chi tiết doanh thu bán phòng, số lượt đặt và đối soát thực nhận
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-lg">
                {report?.facilities?.length || 0} cơ sở đang quản lý
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Cơ sở lưu trú</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Doanh thu phòng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Phòng đã bán</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Hoa hồng sàn</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Thực nhận đối tác</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report?.facilities || []).map((fac) => (
                    <tr key={fac.facility_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <IconHotel size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block">{fac.name}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">ID: {fac.facility_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-slate-800">
                        {formatMoney(fac.room_revenue)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          {fac.rooms_sold} lượt
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-xs text-rose-600">
                        -{formatMoney(fac.commission)}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-sm text-emerald-600">
                        {formatMoney(fac.vendor_net)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate("/vendor/registration")}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          Xem cấu hình phòng <IconArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && !error && !(report?.facilities || []).length && (
              <div className="px-6 py-12 text-center text-xs text-slate-400 space-y-2">
                <p>Chưa có cơ sở lưu trú nào phát sinh giao dịch trong khoảng thời gian này.</p>
              </div>
            )}
          </section>

          {/* 5. DANH SÁCH GIAO DỊCH ĐẶT PHÒNG GẦN NHẤT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header bảng giao dịch */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">
                  Giao dịch đặt phòng gần nhất
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Danh sách khách hàng đã hoàn tất thanh toán đặt phòng qua Travelio
                </p>
              </div>

              {/* Ô tìm kiếm & lọc nhanh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã, tên khách..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-primary-500 w-44"
                  />
                </div>

                <button
                  onClick={() => navigate("/vendor/settlements")}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  Xem đối soát doanh thu <IconArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Mã đặt phòng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Khách hàng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Phòng / Dịch vụ</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Số lượng</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Doanh thu</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Thời gian</th>
                    <th className="text-[11px] font-bold uppercase tracking-wider px-6 py-3.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((b) => (
                    <tr key={`${b.booking_id}-${b.service_name}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/50">
                          {b.booking_code}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center border border-slate-200 shadow-2xs">
                            {(b.guest_name || "K")[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{b.guest_name || "Khách ẩn danh"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {b.service_name}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {b.facility_name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-slate-600">
                        {b.quantity} {b.service_type === "ROOM" ? "phòng" : "vé"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-extrabold text-slate-900">
                        {formatMoney(b.revenue)}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {b.payment_date ? new Date(b.payment_date).toLocaleDateString("vi-VN") : "Hôm nay"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {b.status || "CONFIRMED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && !error && filteredSales.length === 0 && (
                <div className="px-6 py-12 text-center text-xs text-slate-400">
                  Không tìm thấy giao dịch đặt phòng nào phù hợp với bộ lọc hiện tại.
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
                      {(currentPage - 1) * pageSize + 1}
                    </strong>{" "}
                    -{" "}
                    <strong className="text-slate-700 font-semibold">
                      {Math.min(currentPage * pageSize, filteredSales.length)}
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
                    title="Trang trước"
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 5) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - currentPage) <= 1) return true;
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
                        const isActive = p === currentPage;
                        return (
                          <button
                            key={item.key}
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
                    title="Trang kế tiếp"
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer trang đối tác khách sạn */}
          <footer className="mt-10 pt-6 pb-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-heading font-extrabold shadow-2xs">
                T
              </div>
              <div>
                <span className="font-heading font-bold text-slate-800">Travelio Partner Extranet</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Hệ thống quản lý đối tác lưu trú</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <span>Hỗ trợ kỹ thuật: <strong className="text-slate-700 font-semibold">partner-support@travelio.com</strong></span>
              <span className="text-slate-300">|</span>
              <span>Hotline: <strong className="text-slate-700 font-semibold">1900 6868</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">© 2026 Travelio Platform. All rights reserved.</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
