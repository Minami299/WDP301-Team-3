import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconUser,
  IconStar,
  IconChevronDown,
  IconPackage,
  IconLock,
  IconHotel,
  IconTicket,
} from "../Icons";

const ROLE_LABELS = {
  CUSTOMER: "Khách hàng",
  HOTEL_OWNER: "Chủ khách sạn",
  ACTIVITY_VENDOR: "Đối tác tham quan",
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
};

const getInitial = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].charAt(0).toUpperCase();
};

export default function UserProfileDropdown({
  currentUser,
  role,
  dark = false,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const isCustomer = role === "CUSTOMER";
  const isPartner = role === "HOTEL_OWNER" || role === "ACTIVITY_VENDOR";

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleNavigate = (path, state) => {
    setIsOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  if (!currentUser) return null;

  return (
    <div className="relative select-none" ref={dropdownRef}>
      {/* TRIGGER BUTTON: Compact, neat circular avatar + subtle chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 p-1 pr-2 rounded-full border transition-all cursor-pointer ${
          isOpen
            ? dark
              ? "bg-slate-800 border-slate-700 ring-2 ring-primary-500/30"
              : "bg-slate-100 border-slate-300 ring-2 ring-primary-500/20 shadow-xs"
            : dark
            ? "border-slate-800 bg-slate-900 hover:bg-slate-800"
            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        }`}
        aria-expanded={isOpen}
        title={currentUser.full_name || "Tài khoản"}
      >
        {/* Compact Avatar Circle */}
        <div className="relative shrink-0">
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {getInitial(currentUser.full_name)}
            </div>
          )}
        </div>

        {/* Small subtle chevron */}
        <IconChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-primary-600" : ""
          }`}
        />
      </button>

      {/* DROPDOWN MENU PANEL */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl border py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 ${
            dark
              ? "bg-slate-900 border-slate-800 text-slate-200"
              : "bg-white border-slate-100 text-slate-700"
          }`}
        >
          {/* Header Profile Info inside Dropdown */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                {getInitial(currentUser.full_name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 truncate">
                {currentUser.full_name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {currentUser.email}
              </div>
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                  {ROLE_LABELS[role] || "Khách hàng"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links - ONLY REAL PROJECT FEATURES */}
          <div className="py-1">
            {/* 1. Tài khoản của tôi */}
            <button
              type="button"
              onClick={() => handleNavigate("/profile", { section: "personal" })}
              className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition font-medium text-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <IconUser size={16} className="text-slate-400" />
                <span>Tài khoản của tôi</span>
              </span>
            </button>

            {/* 2. Chuyến đi của tôi (Khách hàng) */}
            {isCustomer && (
              <button
                type="button"
                onClick={() => handleNavigate("/my-trips")}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition font-medium text-slate-800 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <IconPackage size={16} className="text-slate-400" />
                  <span>Chuyến đi của tôi</span>
                </span>
              </button>
            )}

            {/* 3. Điểm thưởng & Đổi Voucher */}
            {isCustomer && (
              <button
                type="button"
                onClick={() => handleNavigate("/loyalty")}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition font-medium text-slate-800 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <IconStar size={16} className="text-amber-500" />
                  <span>Điểm thưởng &amp; Đổi Voucher</span>
                </span>
                <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                  {(currentUser.total_loyalty_points || 0).toLocaleString("vi-VN")} điểm
                </span>
              </button>
            )}

            {/* 4. Đổi mật khẩu & Bảo mật */}
            <button
              type="button"
              onClick={() => handleNavigate("/profile", { section: "password" })}
              className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition font-medium text-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <IconLock size={16} className="text-slate-400" />
                <span>Đổi mật khẩu & Bảo mật</span>
              </span>
            </button>
          </div>

          {/* Role-Specific Portal Links (Partners / Manager / Admin) */}
          {(isPartner || role === "MANAGER" || role === "ADMIN") && (
            <div className="py-1 border-t border-slate-100">
              {isPartner && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/vendor")}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-primary-600 hover:bg-primary-50 font-semibold transition cursor-pointer"
                  >
                    <IconHotel size={16} />
                    <span>Kênh quản lý đối tác (Extranet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/vendor/orders")}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
                  >
                    <IconTicket size={16} className="text-slate-400" />
                    <span>Quản lý đơn đặt chỗ</span>
                  </button>
                </>
              )}

              {role === "MANAGER" && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/manager")}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-primary-600 hover:bg-primary-50 font-semibold transition cursor-pointer"
                >
                  <IconHotel size={16} />
                  <span>Cổng quản lý kinh doanh</span>
                </button>
              )}

              {role === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin")}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-primary-600 hover:bg-primary-50 font-semibold transition cursor-pointer"
                >
                  <IconHotel size={16} />
                  <span>Cổng quản trị hệ thống</span>
                </button>
              )}
            </div>
          )}

          {/* Nút THOÁT (Agoda-style full-width pill button) */}
          <div className="pt-2 px-3 pb-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full rounded-full border border-primary-500 py-2.5 text-center text-xs font-bold text-primary-600 hover:bg-primary-50 active:bg-primary-100 transition duration-150 cursor-pointer uppercase tracking-wider shadow-2xs"
            >
              Đăng Xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
