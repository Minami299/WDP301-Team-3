import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { getScreenByPath, SCREENS } from "../../utils/screenNavigation";
import {
  IconHome,
  IconSearch,
  IconHotel,
  IconCreditCard,
  IconTicket,
  IconBarChart,
  IconPackage,
  IconQR,
  IconDollar,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
} from "../Icons";
import PartnerRegistrationModal from "../PartnerRegistrationModal";

const SCREEN_ICONS = {
  1: IconHome,
  2: IconSearch,
  3: IconHotel,
  4: IconCreditCard,
  5: IconTicket,
  6: IconBarChart,
  7: IconPackage,
  8: IconQR,
  9: IconDollar,
};

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const current = getScreenByPath(location.pathname);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const isAlreadyPartner =
    currentUser &&
    ["HOTEL_OWNER", "ACTIVITY_VENDOR", "ADMIN", "MANAGER"].includes(
      currentUser.role,
    );

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);


  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const checkScrollability = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  // Convert mouse wheel vertically to horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkScrollability();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    checkScrollability();
    window.addEventListener("resize", checkScrollability);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", checkScrollability);
    };
  }, []);

  // Auto-scroll active item into view on location change
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
      setTimeout(checkScrollability, 200);
    }
  }, [location.pathname]);

  const scrollByAmount = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScrollability, 250);
    }
  };

  // Mouse Drag handlers
  const handleMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollStart(el.scrollLeft);
    setDragDistance(0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.4;
    setDragDistance(Math.abs(walk));
    scrollRef.current.scrollLeft = scrollStart - walk;
    checkScrollability();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleClickCapture = (e) => {
    // If the user was dragging, don't trigger the click on the link
    if (dragDistance > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const isDashboardView =
    current?.group === "partner" || location.pathname.startsWith("/vendor");

  // Render the redesigned top navigation bar
  const renderNavigationBar = () => {
    return (
      <header className="bg-slate-950 text-slate-200 border-b border-slate-800/90 shadow-md flex-shrink-0 z-30 font-body relative select-none">
        <div className="max-w-[1720px] mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5">
          {/* Brand Logo - Click to go to Homepage */}
          <NavLink
            to="/"
            className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-90 transition cursor-pointer"
            title="Về Trang chủ (Homepage)"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-sky-400 to-blue-600 rounded-md flex items-center justify-center shadow-xs">
              <IconMapPin size={13} className="text-white" />
            </div>
            <span className="text-white font-heading font-extrabold text-sm tracking-tight">
              travelio
            </span>
          </NavLink>

          {/* Left Arrow Scroll Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-220)}
              title="Kéo sang trái"
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700/80 shadow-md flex-shrink-0 transition hover:scale-110 cursor-pointer"
            >
              <IconChevronLeft size={13} />
            </button>
          )}

          {/* Center Navigation Links - Scrollable / Draggable Area */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClickCapture={handleClickCapture}
            onScroll={checkScrollability}
            className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 justify-start ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Bạn có thể lăn con lăn chuột, kéo chuột hoặc bấm mũi tên để trượt ngang"
          >
            {/* Traveler Screens */}
            <div className="flex items-center gap-1 bg-slate-900/95 p-1 rounded-xl border border-slate-800/90 flex-shrink-0 shadow-inner">
              {SCREENS.filter((screen) => screen.group === "traveler").map((screen) => {
                const IconComponent = SCREEN_ICONS[screen.id] || IconHome;
                const isActive = current?.id === screen.id;
                return (
                  <NavLink
                    key={screen.id}
                    to={screen.path}
                    data-active={isActive ? "true" : "false"}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/30 scale-[1.02]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {screen.short}
                    </span>
                    <IconComponent
                      size={13}
                      className={isActive ? "text-white" : "text-slate-400"}
                    />
                    <span>{screen.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Partner Screens */}
            <div className="flex items-center gap-1 bg-slate-900/95 p-1 rounded-xl border border-slate-800/90 flex-shrink-0 shadow-inner">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1.5 flex-shrink-0">
                Đối tác
              </span>
              {SCREENS.filter((screen) => screen.group === "partner" && (currentUser?.role !== 'ACTIVITY_VENDOR' || ![8, 9].includes(screen.id))).map((screen) => {
                const IconComponent = SCREEN_ICONS[screen.id] || IconBarChart;
                const isActive = current?.id === screen.id;
                return (
                  <NavLink
                    key={screen.id}
                    to={screen.path}
                    data-active={isActive ? "true" : "false"}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/30 scale-[1.02]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {screen.short}
                    </span>
                    <IconComponent
                      size={13}
                      className={isActive ? "text-white" : "text-slate-400"}
                    />
                    <span>{screen.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right Arrow Scroll Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(220)}
              title="Kéo sang phải"
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700/80 shadow-md flex-shrink-0 transition hover:scale-110 cursor-pointer"
            >
              <IconChevronRight size={13} />
            </button>
          )}

          {/* Right Section: User & Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Nút Trở thành đối tác / Kênh đối tác */}
            {isAlreadyPartner ? (
              <button
                type="button"
                onClick={() => navigate("/vendor")}
                className="flex items-center gap-1.5 text-sky-400 hover:text-white bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <IconHotel size={13} className="text-sky-400" />
                <span className="hidden sm:inline">Kênh đối tác</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowPartnerModal(true);
                }}
                className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs hover:scale-105"
              >
                <IconHotel size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Trở thành đối tác</span>
                <span className="sm:hidden">Đối tác</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/90 border border-slate-800 px-1.5 sm:px-2.5 py-1 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                  {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-200 truncate max-w-[100px]">
                  {currentUser.full_name}
                </span>
                <span className="hidden sm:inline text-[9px] bg-slate-800 text-sky-300 font-bold px-1.5 py-0.5 rounded uppercase border border-slate-700/60">
                  {currentUser.role || "CUSTOMER"}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate("/auth/login")}
                  className="text-xs text-slate-300 hover:text-white font-medium px-2.5 py-1 rounded-lg hover:bg-slate-800/70 transition cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Đăng ký
                </button>
              </div>
            )}

          </div>
        </div>
      </header>
    );
  };

  // If viewing dashboard/partner screens with fixed sidebar layout
  if (isDashboardView) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-sidebar font-body">
        {renderNavigationBar()}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  // Customer pages: natural document flow, stays at the top of the page when scrolling
  return (
    <div className="min-h-screen flex flex-col bg-bg-default font-body">
      {renderNavigationBar()}
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
      <PartnerRegistrationModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
      />
    </div>
  );
}
