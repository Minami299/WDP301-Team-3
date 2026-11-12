import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import PartnerRegistrationModal from "../PartnerRegistrationModal";
import UserProfileDropdown from "./UserProfileDropdown";

const ROLE_LABELS = {
  CUSTOMER: "Khách hàng",
  HOTEL_OWNER: "Chủ khách sạn",
  ACTIVITY_VENDOR: "Đối tác tham quan",
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
};

const customerLinks = (currentUser) => [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/search", label: "Tìm kiếm" },
  { to: "/my-trips", label: "Chuyến đi của tôi" },
  {
    to: "/loyalty",
    label: "Điểm thưởng & Đổi Voucher",
    badge: currentUser?.total_loyalty_points
      ? `${currentUser.total_loyalty_points.toLocaleString("vi-VN")} điểm`
      : null,
  },
];

// Each role sees only its own flow: travelers the booking links, partners use sidebar.
const linksFor = (role, currentUser) => {
  if (role === "HOTEL_OWNER" || role === "ACTIVITY_VENDOR") {
    return [];
  }
  if (role === "ADMIN") return [];
  if (role === "MANAGER") return [];
  return customerLinks(currentUser);
};

const navClass =
  (dark) =>
  ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
      dark
        ? isActive
          ? "bg-primary-500 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
        : isActive
          ? "bg-primary-50 text-primary-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const role = currentUser?.role;
  const isPartner = role === "HOTEL_OWNER" || role === "ACTIVITY_VENDOR";
  const canBecomePartner = !currentUser;
  const dark = isPartner;
  const links = linksFor(role, currentUser);
  const isDashboardView = location.pathname.startsWith("/vendor");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const header = (
    <header
      className={`relative z-30 flex-shrink-0 border-b font-body ${dark ? "border-slate-800 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-800"}`}
    >
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <NavLink
          to={
            isPartner
              ? "/vendor"
              : role === "MANAGER"
                ? "/manager"
                : role === "ADMIN"
                  ? "/admin"
                  : "/"
          }
          className="flex flex-shrink-0 items-baseline gap-2"
        >
          <span
            className={`font-heading text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-primary-600"}`}
          >
            travelio
          </span>
        </NavLink>

        {links.length > 0 && (
          <nav
            aria-label="Điều hướng chính"
            className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={navClass(dark)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                      {link.badge}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex flex-shrink-0 items-center gap-2">
          {canBecomePartner && (
            <button
              type="button"
              onClick={() => setShowPartnerModal(true)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                dark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Trở thành đối tác
            </button>
          )}

          {currentUser ? (
            <UserProfileDropdown
              currentUser={currentUser}
              role={role}
              dark={dark}
              onLogout={handleLogout}
            />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  dark
                    ? "border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth/register")}
                className="rounded-lg bg-primary-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-700 transition-colors cursor-pointer"
              >
                Đăng ký
              </button>
            </div>
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
      <PartnerRegistrationModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
      />
    </div>
  );
}
