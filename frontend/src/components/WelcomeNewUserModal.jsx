import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { bookingApi } from "../services/api/bookingApi";
import { IconX, IconCheck, IconArrowRight, IconTicket } from "./Icons";

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
  const [copied, setCopied] = useState(false);

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

  const handleAction = async () => {
    if (currentUser?.role === "CUSTOMER") {
      try {
        await Promise.all(
          promotions.map((p) =>
            bookingApi.savePromotion({ promotion_id: p._id }).catch(() => {})
          )
        );
      } catch {}
    }
    handleDismiss();
    navigate("/search");
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

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
      : "Toàn sàn";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Header */}
        <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-700 px-6 pt-7 pb-6 text-center text-white overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

          {/* Dismiss button [✕] */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-colors cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <IconX size={18} />
          </button>

          {/* Gift Badge Icon */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 shadow-inner">
            <span className="text-3xl" role="img" aria-label="Gift">
              🎁
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-200 mb-2">
            <span>✨</span> Quà tặng Chào Mừng Bạn Mới
          </div>

          <h3
            id="welcome-modal-title"
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-white"
          >
            Chào mừng bạn đến với Travelio!
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-primary-100 max-w-xs mx-auto leading-relaxed">
            Dành riêng cho đơn đặt phòng hoặc vé tham quan đầu tiên của bạn.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 bg-slate-50 space-y-4">
          {/* Ticket Card */}
          <div className="relative bg-white border border-amber-200 rounded-2xl shadow-xs overflow-hidden flex flex-col sm:flex-row items-stretch">
            {/* Left Ticket Punch/Discount Section */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 flex flex-col items-center justify-center min-w-[115px] text-center relative border-b sm:border-b-0 sm:border-r border-dashed border-amber-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
                ƯU ĐÃI
              </span>
              <span className="text-2xl font-black tracking-tight my-0.5">
                {discountLabel}
              </span>
              <span className="text-[10px] text-amber-100 font-medium">
                {isPercentage && promo.max_discount
                  ? `Tối đa ${formatMoney(promo.max_discount)}`
                  : "Đơn đầu tiên"}
              </span>
            </div>

            {/* Right Ticket Info Section */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                    {promo.name || "Ưu đãi khách hàng mới"}
                  </h4>
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 whitespace-nowrap flex items-center gap-0.5">
                    <IconCheck size={11} /> Đã vào ví
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1 font-medium text-slate-600">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {scopeLabel}
                  </p>
                  {(promo.min_order_amount > 0 || promo.min_order_value > 0) && (
                    <p>• Đơn tối thiểu: {formatMoney(promo.min_order_amount ?? promo.min_order_value)}</p>
                  )}
                  <p>• Hạn sử dụng: {formatDate(promo.valid_to)}</p>
                </div>
              </div>

              {/* Code Chip & Copy Button */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 tracking-wider">
                  {promo.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(promo.code)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <IconCheck size={13} />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <IconTicket size={13} />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Multiple vouchers indicator if there are more */}
          {promotions.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {promotions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? "w-5 bg-primary-600"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Xem ưu đãi ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Helpful note */}
          <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-2.5 flex items-start gap-2 text-xs text-emerald-800 leading-relaxed">
            <span className="text-sm">🎁</span>
            <p>
              Voucher đã được <strong>tự động lưu vào Ví voucher</strong> của bạn và sẽ tự động được áp dụng tại bước <strong>Thanh toán</strong> cho đơn đầu tiên!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleAction}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 font-bold text-sm shadow-md shadow-primary-500/20 transition-all cursor-pointer"
            >
              <span>Nhận ưu đãi & Khám phá ngay</span>
              <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Để sau, tôi sẽ kiểm tra trong Ví voucher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
