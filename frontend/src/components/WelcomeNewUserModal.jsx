import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { bookingApi } from "../services/api/bookingApi";
import {
  IconX,
  IconCheck,
  IconArrowRight,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconGift,
} from "./Icons";

const formatMoney = (val) => {
  if (!val && val !== 0) return "";
  return Number(val).toLocaleString("vi-VN") + " ₫";
};

const formatDate = (isoString) => {
  if (!isoString) return "Không thời hạn";
  try {
    const d = new Date(isoString);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "Không thời hạn";
  }
};

export default function WelcomeNewUserModal() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Storage key is tied to user ID (or 'guest') so each newly registered account gets the welcome popup once
  const storageKey = `travelio_new_user_welcome_seen_${currentUser?._id || currentUser?.id || "guest"}`;

  const checkEligibility = useCallback(async () => {
    // Partners and Admins/Managers should never see customer welcome voucher popup
    const role = currentUser?.role;
    if (role && role !== "CUSTOMER") {
      setIsOpen(false);
      return;
    }

    // If dismissed in this session, do not show
    if (sessionStorage.getItem(storageKey) === "true") {
      setIsOpen(false);
      return;
    }

    try {
      const res = await bookingApi.promotions();
      const data = res?.data || {};

      // Only show if user is considered a new user (0 confirmed/completed bookings)
      if (data.is_new_user === false) {
        setIsOpen(false);
        return;
      }

      const newUserPromos =
        data.new_user_promotions ||
        (data.promotions || []).filter(
          (p) => (p.target_audience === "NEW_USER" || p.voucher_type === "NEW_USER") && !p.user_id
        );

      if (newUserPromos.length > 0) {
        setPromotions(newUserPromos);
        setCurrentIndex(0);

        // If customer is logged in, automatically save welcome vouchers to their wallet so it appears in /loyalty
        if (currentUser?.role === "CUSTOMER") {
          Promise.all(
            newUserPromos.map((p) =>
              bookingApi.savePromotion({ promotion_id: p._id }).catch(() => {})
            )
          ).catch(() => {});
        }

        // Small delay so entrance feels smooth after initial render
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Silently ignore if API call fails
    }
  }, [currentUser, storageKey]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const isCustomer = currentUser?.role === "CUSTOMER";

  const handleAction = async () => {
    if (isCustomer) {
      try {
        await Promise.all(
          promotions.map((p) =>
            bookingApi.savePromotion({ promotion_id: p._id }).catch(() => {})
          )
        );
      } catch {}
      handleDismiss();
      navigate("/search");
    } else {
      handleDismiss();
      navigate("/auth/register");
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  // Keyboard navigation: Escape to dismiss, Arrow keys to switch vouchers
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleDismiss();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, promotions.length]);

  if (!isOpen || promotions.length === 0) return null;

  const promo = promotions[currentIndex] || promotions[0];
  const isPercentage = promo.discount_type === "PERCENTAGE";
  const discountLabel = isPercentage
    ? `${promo.discount_value}%`
    : formatMoney(promo.discount_value);

  const scopeLabel =
    promo.applicable_service === "HOTEL"
      ? "Chỉ áp dụng Khách sạn"
      : promo.applicable_service === "ATTRACTION"
      ? "Chỉ áp dụng Vé tham quan"
      : "Toàn sàn Travelio";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className="relative w-full max-w-[560px] bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-blue-950/25 border border-slate-100 overflow-hidden select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (X) */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer z-30"
          aria-label="Đóng thông báo"
        >
          <IconX size={17} />
        </button>

        {/* Top Header Section */}
        <div className="flex items-center gap-3.5 sm:gap-4 pr-10">
          {/* 3D Blue Gift Box Icon with Yellow Sparkles */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
              {/* Yellow sparkle bursts */}
              <path d="M50 14l5-5M44 8l1-6M58 20l6-1" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="55" cy="9" r="1.5" fill="#F59E0B" />
              <circle cx="63" cy="19" r="1.2" fill="#F59E0B" />
              {/* 3D Gift box base */}
              <path d="M32 36l18-9v19l-18 9z" fill="#1D4ED8" />
              <path d="M14 27l18 9v19l-18-9z" fill="#3B82F6" />
              {/* Box vertical ribbons */}
              <path d="M20 30.5l6 3v19l-6-3z" fill="#1E40AF" />
              <path d="M38 33.5l6-3v19l-6 3z" fill="#172554" />
              {/* Lid sides */}
              <path d="M32 29l20-10v5l-20 10z" fill="#60A5FA" />
              <path d="M12 19l20 10v5l-20-10z" fill="#93C5FD" />
              {/* Lid top surface */}
              <path d="M32 11l20 8-20 10-20-10z" fill="#DBEAFE" />
              {/* Lid ribbon diagonal */}
              <path d="M28 13l8 3.2-12 6-8-3.2z" fill="#3B82F6" />
              <path d="M36 16.2l8 3.2-12 6-8-3.2z" fill="#2563EB" />
              {/* Bow knots */}
              <circle cx="32" cy="17" r="3.2" fill="#1E40AF" />
              <path d="M23 13.5c-4-4 0-7 6-3l3 4.5c-4-1.2-6-1.5-9-1.5z" fill="#3B82F6" />
              <path d="M41 13.5c4-4 0-7-6-3l-3 4.5c4-1.2 6-1.5 9-1.5z" fill="#2563EB" />
            </svg>
          </div>

          {/* Thin Vertical Divider */}
          <div className="h-10 w-[1.5px] bg-slate-200 shrink-0" />

          {/* Header Texts */}
          <div>
            <h3
              id="welcome-modal-title"
              className="text-lg sm:text-[21px] font-heading font-extrabold text-slate-900 tracking-tight leading-tight"
            >
              Ưu đãi cho chuyến đi đầu tiên
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
              Khám phá nhiều trải nghiệm tuyệt vời cùng Travelio!
            </p>
          </div>
        </div>

        {/* Center Voucher Ticket Card Section with Carousel Arrows */}
        <div className="relative my-6">
          {/* Floating Left Arrow */}
          {promotions.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-3.5 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-slate-200/90 text-slate-700 hover:text-primary-600 hover:bg-slate-50 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Mã trước đó"
              aria-label="Mã trước đó"
            >
              <IconChevronLeft size={18} />
            </button>
          )}

          {/* Floating Right Arrow */}
          {promotions.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-3.5 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-slate-200/90 text-slate-700 hover:text-primary-600 hover:bg-slate-50 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Mã tiếp theo"
              aria-label="Mã tiếp theo"
            >
              <IconChevronRight size={18} />
            </button>
          )}

          {/* Ticket Card Container */}
          <div className="relative bg-white rounded-2xl border border-blue-100 shadow-sm flex flex-col sm:flex-row items-stretch overflow-hidden">
            {/* Left Orange Coupon Stub */}
            <div className="w-full sm:w-[190px] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-500 text-white p-4 sm:p-5 flex flex-col items-center justify-center text-center relative shrink-0">
              <span className="text-white/95 text-[11px] font-black uppercase tracking-wider">
                GIẢM NGAY
              </span>

              <div className="text-white font-heading font-black text-2xl sm:text-[28px] tracking-tight leading-none my-1">
                {discountLabel}
              </div>

              <span className="text-white/95 text-xs font-semibold">
                {isPercentage && promo.max_discount
                  ? `Tối đa ${formatMoney(promo.max_discount)}`
                  : "Đơn đầu tiên"}
              </span>

              {/* Dashed Flight Path Decoration with Plane */}
              <div className="mt-3.5 flex items-center gap-1 text-white/70 w-full justify-center">
                <div className="w-16 border-t border-dashed border-white/60" />
                <svg
                  className="w-3.5 h-3.5 text-white transform -rotate-12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>

              {/* Semicircular Ticket Notches on Right Edge */}
              <div className="hidden sm:block absolute -right-2.5 top-0 w-5 h-5 rounded-full bg-white z-10" />
              <div className="hidden sm:block absolute -right-2.5 bottom-0 w-5 h-5 rounded-full bg-white z-10" />
              <div className="hidden sm:block absolute right-0 top-3 bottom-3 border-r-2 border-dashed border-white/40" />
            </div>

            {/* Right Ticket Info Section */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between relative bg-white">
              {/* Background Soft Watermark of Palm Tree & Hotel */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 select-none overflow-hidden">
                <svg className="w-32 h-24 text-sky-400" viewBox="0 0 120 80" fill="currentColor">
                  {/* Palm tree */}
                  <path d="M25 75c2-15 10-25 18-30-5 0-12 2-16 6 0-6 4-12 10-15-7 0-13 4-16 10-2-6-1-13 3-18-5 3-8 9-9 16-4-5-10-7-15-7 4 5 7 11 7 18-6-4-13-5-18-3 6 4 11 10 13 17-6-2-13-1-17 3 6 3 13 4 19 2 0 7 2 15 4 21h25z" />
                  {/* Hotel buildings */}
                  <rect x="52" y="24" width="28" height="51" rx="2" />
                  <rect x="76" y="34" width="30" height="41" rx="2" />
                  {/* Windows */}
                  <rect x="56" y="28" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="64" y="28" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="72" y="28" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="56" y="36" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="64" y="36" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="72" y="36" width="4" height="4" rx="0.5" fill="#fff" />
                  <rect x="80" y="40" width="5" height="5" rx="0.5" fill="#fff" />
                  <rect x="90" y="40" width="5" height="5" rx="0.5" fill="#fff" />
                  <rect x="99" y="40" width="5" height="5" rx="0.5" fill="#fff" />
                  <rect x="80" y="50" width="5" height="5" rx="0.5" fill="#fff" />
                  <rect x="90" y="50" width="5" height="5" rx="0.5" fill="#fff" />
                  <rect x="99" y="50" width="5" height="5" rx="0.5" fill="#fff" />
                </svg>
              </div>

              {/* Top Row: Title & Badge */}
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                    {promo.name || promo.title || "Ưu đãi khách hàng mới"}
                  </h4>
                  {isCustomer ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                      <IconCheck size={11} className="text-emerald-700 stroke-[3]" />
                      <span>Đã vào ví</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200/70 shrink-0">
                      <IconGift size={11} className="text-amber-700" />
                      <span>Dành cho bạn mới</span>
                    </span>
                  )}
                </div>

                {/* Scope Bullet Point */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-semibold mt-1">
                  <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                  <span>{scopeLabel}</span>
                </div>

                {/* Expiration Date Pill */}
                <div className="mt-3.5 inline-flex items-center gap-1.5 bg-blue-50/80 border border-blue-100/90 text-primary-900 text-xs font-semibold px-3 py-1.5 rounded-xl w-fit">
                  <IconCalendar size={14} className="text-primary-600 shrink-0" />
                  <span>Hạn sử dụng: {formatDate(promo.valid_to)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        {promotions.length > 1 && (
          <div className="flex items-center justify-center gap-2 mb-5">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? "w-3 h-3 bg-[#0066cc]"
                    : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Xem ưu đãi ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={handleAction}
          className="w-full h-12 sm:h-13 rounded-full bg-[#0066cc] hover:bg-[#0055b3] active:scale-[0.99] text-white font-heading font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>
            {isCustomer
              ? "Khám phá khách sạn & vé ngay"
              : "Đăng ký nhận ưu đãi ngay"}
          </span>
          <IconArrowRight size={18} />
        </button>

        {/* Unauthenticated / Guest Navigation Links */}
        {!isCustomer && (
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-500">
            <span>
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => {
                  handleDismiss();
                  navigate("/auth/login");
                }}
                className="text-[#0066cc] font-bold hover:underline cursor-pointer"
              >
                Đăng nhập
              </button>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                navigate("/search");
              }}
              className="text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Khám phá trước
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
