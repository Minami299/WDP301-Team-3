import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { SCREENS } from "../../utils/screenNavigation";
import PartnerRegistrationModal from "../PartnerRegistrationModal";

const ROLE_LABELS = {
  CUSTOMER: "Khách hàng",
  HOTEL_OWNER: "Chủ khách sạn",
  ACTIVITY_VENDOR: "Đối tác tham quan",
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
};

const CUSTOMER_LINKS = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/search", label: "Tìm kiếm" },
  { to: "/my-trips", label: "Chuyến đi của tôi" },
];

const PARTNER_ONLY_FOR = { 8: "HOTEL_OWNER", 13: "ACTIVITY_VENDOR" };

// Each role sees only its own flow: travelers the booking links, partners the extranet, staff the admin portal.
const linksFor = (role) => {
  if (role === "HOTEL_OWNER" || role === "ACTIVITY_VENDOR") {
    return SCREENS.filter((screen) => screen.group === "partner" && (!PARTNER_ONLY_FOR[screen.id] || PARTNER_ONLY_FOR[screen.id] === role))
      .map((screen) => ({ to: screen.path, label: screen.label, end: screen.path === "/vendor" }));
  }
  if (role === "ADMIN" || role === "MANAGER") return [{ to: "/admin", label: "Trang quản trị" }];
  return CUSTOMER_LINKS;
};

const navClass = (dark) => ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
    dark
      ? isActive ? "bg-primary-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
      : isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const role = currentUser?.role;
  const isPartner = role === "HOTEL_OWNER" || role === "ACTIVITY_VENDOR";
  const canBecomePartner = !currentUser || role === "CUSTOMER";
  const dark = isPartner;
  const links = linksFor(role);
  const isDashboardView = location.pathname.startsWith("/vendor");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const header = (
    <header className={`relative z-30 flex-shrink-0 border-b font-body ${dark ? "border-slate-800 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-800"}`}>
      <div className="mx-auto flex max-w-[1720px] items-center gap-3 px-3 py-2 sm:px-5">
        <NavLink to={isPartner ? "/vendor" : role === "ADMIN" || role === "MANAGER" ? "/admin" : "/"} className="flex flex-shrink-0 items-baseline gap-2">
          <span className={`font-heading text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-primary-600"}`}>travelio</span>
          {isPartner && <span className="hidden text-xs font-semibold text-slate-400 sm:inline">{ROLE_LABELS[role]}</span>}
        </NavLink>

        <nav aria-label="Điều hướng chính" className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass(dark)}>{link.label}</NavLink>
          ))}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-2">
          {canBecomePartner && (
            <button type="button" onClick={() => setShowPartnerModal(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Trở thành đối tác
            </button>
          )}
          {currentUser ? (
            <div className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 text-sm ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
              <div className="hidden min-w-0 text-right sm:block">
                <div className="max-w-[140px] truncate font-semibold leading-tight">{currentUser.full_name}</div>
                <div className={`text-xs leading-tight ${dark ? "text-slate-400" : "text-slate-500"}`}>{ROLE_LABELS[role] || ROLE_LABELS.CUSTOMER}</div>
              </div>
              <button type="button" onClick={() => navigate("/profile")} className={`text-sm ${dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>Hồ sơ</button>
              <button type="button" onClick={handleLogout} className={`text-sm ${dark ? "text-slate-300 hover:text-rose-400" : "text-slate-600 hover:text-rose-600"}`}>Đăng xuất</button>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => navigate("/auth/login")} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Đăng nhập</button>
              <button type="button" onClick={() => navigate("/auth/register")} className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">Đăng ký</button>
            </>
          )}
        </div>
      </div>
    </header>
  );

  if (isDashboardView) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-sidebar font-body">
        {header}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-default font-body">
      {header}
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <PartnerRegistrationModal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} />
    </div>
  );
}
