import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { bookingApi } from "../../services/api/bookingApi";
import {
  IconClock,
  IconCheck,
  IconArrowRight,
  IconAlertTriangle,
  IconChevronDown,
  IconHotel,
  IconCalendar,
  IconUsers,
  IconX,
} from "../../components/Icons";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatVND = (price) => {
  if (price === undefined || price === null || isNaN(price)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = [
      "Chủ nhật",
      "Thứ hai",
      "Thứ ba",
      "Thứ tư",
      "Thứ năm",
      "Thứ sáu",
      "Thứ bảy",
    ];
    const dayName = days[d.getDay()];
    const dateFormatted = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${dayName}, ${dateFormatted}`;
  } catch {
    return dateStr;
  }
};

const HOLD_DURATION_SECONDS = 15 * 60; // khớp thời gian giữ chỗ 15 phút ở backend
const HOLD_TIMER_KEY = "travelio_checkout_hold_expires";
const HOLD_CONFIG_KEY = "travelio_checkout_hold_duration";
const HOTEL_BOOKING_KEY = "travelio_checkout_hotel_booking";

// 24 khung giờ nhận phòng đầy đủ chuẩn Agoda
const TIME_SLOTS_24H = [
  "Tôi chưa biết",
  "00:00 - 01:00",
  "01:00 - 02:00",
  "02:00 - 03:00",
  "03:00 - 04:00",
  "04:00 - 05:00",
  "05:00 - 06:00",
  "06:00 - 07:00",
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
  "22:00 - 23:00",
  "23:00 - 24:00",
];

// ─────────────────────────────────────────────────────────────
// MAIN CHECKOUT COMPONENT (STEP 1: CUSTOMER INFORMATION)
// ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // 1. Phục hồi dữ liệu thuần từ DB thật
  const [bookingData] = useState(() => {
    if (location.state && location.state.facilityName) {
      try {
        sessionStorage.setItem(
          HOTEL_BOOKING_KEY,
          JSON.stringify(location.state)
        );
      } catch (err) {
        console.error("Failed to cache booking state", err);
      }
      return location.state;
    }

    try {
      const cached = sessionStorage.getItem(HOTEL_BOOKING_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.error("Failed to parse cached booking", err);
    }

    return null;
  });

  const isAttraction = bookingData?.type === "ATTRACTION";

  // 2. Quản lý thời gian giữ phòng (Hold Time) - BẮT ĐẦU CHẠY NGAY KHI VÀO TRANG CHECKOUT
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    try {
      const storedConfig = sessionStorage.getItem(HOLD_CONFIG_KEY);
      const stored = sessionStorage.getItem(HOLD_TIMER_KEY);

      // Nếu cấu hình thời gian khớp và thời gian còn lại hợp lệ (không vượt quá tổng thời gian đã set)
      if (stored && storedConfig === HOLD_DURATION_SECONDS.toString()) {
        const remaining = Math.floor(
          (parseInt(stored, 10) - Date.now()) / 1000
        );
        if (remaining > 0 && remaining <= HOLD_DURATION_SECONDS) {
          return remaining;
        }
      }

      // Nếu cấu hình thay đổi (ví dụ đổi từ 15p sang 1p) -> Tự động nạp mốc mới ngay lập tức
      const newExpiry = Date.now() + HOLD_DURATION_SECONDS * 1000;
      sessionStorage.setItem(HOLD_TIMER_KEY, newExpiry.toString());
      sessionStorage.setItem(HOLD_CONFIG_KEY, HOLD_DURATION_SECONDS.toString());
      return HOLD_DURATION_SECONDS;
    } catch {
      return HOLD_DURATION_SECONDS;
    }
  });

  const [isExpired, setIsExpired] = useState(() => {
    try {
      const stored = sessionStorage.getItem(HOLD_TIMER_KEY);
      if (stored) {
        return Date.now() >= parseInt(stored, 10);
      }
      return false;
    } catch {
      return false;
    }
  });

  // 3. Thông báo tiến trình hẹn giờ sau 2 phút mới hiện
  const [showTimedAlert, setShowTimedAlert] = useState(false);

  useEffect(() => {
    const alertTimeout = setTimeout(() => {
      setShowTimedAlert(true);
    }, 120 * 1000);

    return () => clearTimeout(alertTimeout);
  }, []);

  // Timer đếm ngược liên tục mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Xử lý khi bấm "Đặt lại" để gia hạn thêm phiên giữ phòng mới (GIỮ NGUYÊN FORM ĐÃ NHẬP)
  const handleRenewHoldTime = () => {
    const newExpiry = Date.now() + HOLD_DURATION_SECONDS * 1000;
    sessionStorage.setItem(HOLD_TIMER_KEY, newExpiry.toString());
    sessionStorage.setItem(HOLD_CONFIG_KEY, HOLD_DURATION_SECONDS.toString());
    setRemainingSeconds(HOLD_DURATION_SECONDS);
    setIsExpired(false);
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // 4. Quản lý form thông tin khách hàng (tự động điền tài khoản đăng nhập)
  const [formData, setFormData] = useState(() => {
    const defaultFullName = currentUser?.full_name || "";
    let first = "";
    let last = "";
    if (defaultFullName.trim()) {
      const parts = defaultFullName.trim().split(" ");
      if (parts.length === 1) {
        first = parts[0];
      } else {
        last = parts[0];
        first = parts.slice(1).join(" ");
      }
    }
    return {
      firstName: first,
      lastName: last,
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      country: "Việt Nam",
      isPrimaryGuest: true,
      recipientName: "", // Tên người thực tế nhận phòng nếu đặt hộ
      estimatedArrival: "Tôi chưa biết",
      specialRequests: "",
    };
  });

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    recipientName: false,
  });

  const [errors, setErrors] = useState({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const requestId = useRef(crypto.randomUUID());

  // Voucher & Loyalty Points states
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  const [availablePromos, setAvailablePromos] = useState([]);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [quoteData, setQuoteData] = useState(null);

  useEffect(() => {
    bookingApi.promotions()
      .then((res) => {
        if (res.data?.promotions) setAvailablePromos(res.data.promotions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bookingData) return;
    let active = true;
    const pointsToRedeem = usePoints ? Math.max(0, Math.floor(Number(pointsInput) || 0)) : 0;
    const payload = isAttraction
      ? {
          items: (bookingData.selectedItems || []).map(({ line_key, price, ...item }) => item),
          promotion_code: appliedPromo || undefined,
          points_to_redeem: pointsToRedeem,
        }
      : {
          service_id: bookingData.serviceId,
          check_in: bookingData.checkInDate,
          check_out: bookingData.checkOutDate,
          rooms: bookingData.rooms,
          guests: bookingData.guests,
          promotion_code: appliedPromo || undefined,
          points_to_redeem: pointsToRedeem,
        };

    bookingApi
      .quote(payload)
      .then((res) => {
        if (active) {
          setQuoteData(res.data);
          setPromoError("");
        }
      })
      .catch((err) => {
        if (active) {
          if (appliedPromo) {
            setPromoError(err.message);
            setAppliedPromo("");
          }
        }
      });

    return () => {
      active = false;
    };
  }, [bookingData, appliedPromo, usePoints, pointsInput]);

  const applyPromoCode = (code) => {
    const trimmed = (code || promoInput).trim().toUpperCase();
    if (!trimmed) return;
    setPromoError("");
    setAppliedPromo(trimmed);
  };

  const removePromoCode = () => {
    setAppliedPromo("");
    setPromoInput("");
    setPromoError("");
  };

  // Tạo đơn ở backend rồi chuyển sang màn hình thanh toán VietQR.
  const proceedToPayment = async () => {
    if (paying || isExpired) return;
    setPaying(true);
    setPayError("");
    try {
      const guest = {
        guest_name: `${formData.lastName} ${formData.firstName}`.trim(),
        guest_email: formData.email.trim(),
        guest_phone: formData.phone.trim(),
        agree_conditions: true,
        request_id: requestId.current,
        expected_total: quoteData?.final_amount ?? bookingData.totalAmount,
        promotion_code: appliedPromo || undefined,
        points_to_redeem: usePoints ? Math.max(0, Math.floor(Number(pointsInput) || 0)) : 0,
      };
      const response = isAttraction
        ? await bookingApi.create({
            ...guest,
            items: (bookingData.selectedItems || []).map(({ line_key, price, ...item }) => item),
          })
        : await bookingApi.createRoom({
            ...guest,
            service_id: bookingData.serviceId,
            check_in: bookingData.checkInDate,
            check_out: bookingData.checkOutDate,
            rooms: bookingData.rooms,
            guests: bookingData.guests,
          });
      try {
        sessionStorage.removeItem(HOTEL_BOOKING_KEY);
        sessionStorage.removeItem(HOLD_TIMER_KEY);
      } catch { /* ignore storage errors */ }
      navigate(`/my-trips/${response.data._id}`, { replace: true });
    } catch (err) {
      setPayError(err.message);
      if (err.status === 409) requestId.current = crypto.randomUUID();
      setPaying(false);
    }
  };

  // 5. Validate nghiệp vụ chi tiết
  const validateField = (name, value, currentFormData = formData) => {
    let err = "";
    const trimmed = (value || "").trim();

    if (name === "firstName") {
      if (!trimmed) {
        err = "Vui lòng nhập Tên của bạn.";
      } else if (trimmed.length < 2) {
        err = "Tên phải có ít nhất 2 ký tự.";
      } else if (/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(trimmed)) {
        err = "Tên không được chứa số hoặc ký tự đặc biệt.";
      }
    }

    if (name === "lastName") {
      if (!trimmed) {
        err = "Vui lòng nhập Họ của bạn.";
      } else if (trimmed.length < 2) {
        err = "Họ phải có ít nhất 2 ký tự.";
      } else if (/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(trimmed)) {
        err = "Họ không được chứa số hoặc ký tự đặc biệt.";
      }
    }

    if (name === "email") {
      if (!trimmed) {
        err = "Vui lòng nhập email nhận mã đặt phòng.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        err = "Địa chỉ email không đúng định dạng (vd: nguyenvana@gmail.com).";
      }
    }

    if (name === "phone") {
      if (!trimmed) {
        err = "Vui lòng nhập số điện thoại di động.";
      } else {
        const cleanDigits = trimmed.replace(/\D/g, "");
        if (cleanDigits.length < 9 || cleanDigits.length > 11) {
          err = "Số điện thoại di động phải gồm 10 chữ số (vd: 0912345678).";
        } else if (
          !/^(0|\+?84)(3|5|7|8|9)[0-9]{8}$/.test(trimmed.replace(/\s+/g, ""))
        ) {
          err = "Đầu số điện thoại Việt Nam không hợp lệ (hỗ trợ 03, 05, 07, 08, 09).";
        }
      }
    }

    if (name === "recipientName" && !currentFormData.isPrimaryGuest) {
      if (!trimmed) {
        err = isAttraction
          ? "Vui lòng nhập họ tên người đại diện nhận vé / tham quan thực tế."
          : "Vui lòng nhập họ tên người sẽ đến nhận phòng thực tế.";
      } else if (trimmed.length < 2) {
        err = isAttraction
          ? "Họ tên người nhận vé phải có ít nhất 2 ký tự."
          : "Họ tên người nhận phòng phải có ít nhất 2 ký tự.";
      }
    }

    return err;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (touched[field]) {
        const errorMsg = validateField(field, value, next);
        setErrors((errs) => ({ ...errs, [field]: errorMsg }));
      }
      return next;
    });
  };

  // 6. Xử lý Submit khi chuyển sang Chi tiết thanh toán
  const handleSubmit = (e) => {
    e.preventDefault();

    if (isExpired) {
      return;
    }

    const nextTouched = {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      recipientName: !formData.isPrimaryGuest,
    };
    setTouched(nextTouched);

    const nextErrors = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
      recipientName: validateField("recipientName", formData.recipientName),
    };
    setErrors(nextErrors);

    const hasError = Object.values(nextErrors).some((msg) => Boolean(msg));
    if (hasError) {
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    setSubmittedSuccess(true);
  };

  // Nếu không có dữ liệu phòng/vé thật từ DB/trang chi tiết truyền sang
  if (!bookingData) {
    return (
      <div className="min-h-screen bg-slate-50 font-body flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <IconHotel size={26} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Chưa có thông tin đặt chỗ
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Vui lòng chọn phòng khách sạn hoặc vé vui chơi từ trang chi tiết trước khi tiến hành đặt chỗ.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition"
          >
            <span>Tìm kiếm dịch vụ</span>
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-800 pb-20">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP STEPPER (TIẾN TRÌNH 3 BƯỚC)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition"
          >
            <span className="font-heading font-black text-xl tracking-tight text-primary-600">
              travelio
            </span>
          </Link>

          {/* Stepper 3 bước */}
          <div className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-semibold">
            {/* Step 1: Active */}
            <div className="flex items-center gap-2 text-primary-600">
              <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                1
              </span>
              <span className="hidden sm:inline font-bold">
                Thông tin khách hàng
              </span>
              <span className="sm:hidden font-bold">Thông tin</span>
            </div>

            <div className="w-8 sm:w-12 h-[2px] bg-slate-200" />

            {/* Step 2: Next */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="hidden sm:inline">Chi tiết thanh toán</span>
              <span className="sm:hidden">Thanh toán</span>
            </div>

            <div className="w-8 sm:w-12 h-[2px] bg-slate-200" />

            {/* Step 3: Done */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="hidden sm:inline">Đã xác nhận đặt chỗ!</span>
              <span className="sm:hidden">Hoàn tất</span>
            </div>
          </div>

          <div className="w-16 hidden sm:block" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HOLD TIME BANNER: CĂN GIỮA & CHẠY LÙI NGAY KHI VÀO MÀN HÌNH
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`border-b py-2.5 px-4 transition-colors ${
          isExpired
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : remainingSeconds < 180
            ? "bg-amber-100 border-amber-300 text-amber-950 animate-pulse"
            : "bg-amber-50/90 border-amber-200/80 text-amber-900"
        }`}
      >
        <div className="max-w-[1240px] mx-auto flex items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-center">
          <IconClock
            size={16}
            className={isExpired ? "text-rose-600 shrink-0" : "text-amber-600 shrink-0"}
          />
          <span>
            {isExpired ? (
              <strong className="font-bold text-rose-700">
                {isAttraction ? "Thời gian giữ vé đã kết thúc!" : "Thời gian giữ phòng đã kết thúc!"}
              </strong>
            ) : (
              <span>
                {isAttraction
                  ? `Đang bảo lưu mức giá ưu đãi và tạm giữ ${bookingData?.guests || 1} vé cho quý khách:`
                  : `Đang bảo lưu mức giá ưu đãi và tạm giữ ${bookingData?.rooms || 1} phòng cho quý khách:`}
              </span>
            )}
          </span>

          {isExpired ? (
            <button
              type="button"
              onClick={handleRenewHoldTime}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1 rounded-md text-xs transition cursor-pointer ml-1"
            >
              Gia hạn thêm 15 phút
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-sm bg-white border border-amber-300 px-2.5 py-0.5 rounded-md text-amber-800 shadow-2xs">
              <span>⏱️</span>
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT: 2 CỘT (FORM + TÓM TẮT ĐẶT PHÒNG)
          ───────────────────────────────────────────────────────────── */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: FORM KHÁCH HÀNG (8 CỘT) */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <fieldset disabled={isExpired} className="space-y-6">
                {/* CARD 1: AI LÀ KHÁCH CHÍNH? */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <h2 className="font-heading font-bold text-lg text-slate-900">
                      Ai là khách chính?
                    </h2>
                    <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                      * Mục bắt buộc
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Row 1: Tên & Họ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tên */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Tên <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nhập tên"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleChange("firstName", e.target.value)
                          }
                          onBlur={() => handleBlur("firstName")}
                          className={`w-full h-11 px-3.5 text-sm rounded-xl border transition outline-none ${
                            touched.firstName && errors.firstName
                              ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                              : touched.firstName && !errors.firstName
                              ? "border-emerald-500 bg-white focus:ring-2 focus:ring-emerald-100"
                              : "border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          }`}
                        />
                        {touched.firstName && errors.firstName && (
                          <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                            <IconAlertTriangle size={12} />
                            {errors.firstName}
                          </p>
                        )}
                      </div>

                      {/* Họ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Họ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nhập họ"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleChange("lastName", e.target.value)
                          }
                          onBlur={() => handleBlur("lastName")}
                          className={`w-full h-11 px-3.5 text-sm rounded-xl border transition outline-none ${
                            touched.lastName && errors.lastName
                              ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                              : touched.lastName && !errors.lastName
                              ? "border-emerald-500 bg-white focus:ring-2 focus:ring-emerald-100"
                              : "border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          }`}
                        />
                        {touched.lastName && errors.lastName && (
                          <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                            <IconAlertTriangle size={12} />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Email & Quốc gia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          {isAttraction ? "Email nhận mã vé điện tử & xác nhận" : "Email nhận xác nhận đặt phòng"}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Nhập email"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                          className={`w-full h-11 px-3.5 text-sm rounded-xl border transition outline-none ${
                            touched.email && errors.email
                              ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                              : touched.email && !errors.email
                              ? "border-emerald-500 bg-white focus:ring-2 focus:ring-emerald-100"
                              : "border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          }`}
                        />
                        {touched.email && errors.email && (
                          <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                            <IconAlertTriangle size={12} />
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Quốc gia cư trú */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Quốc gia cư trú <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={formData.country}
                            onChange={(e) =>
                              handleChange("country", e.target.value)
                            }
                            className="w-full h-11 px-3.5 pr-8 text-sm rounded-xl border border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none appearance-none cursor-pointer text-slate-800"
                          >
                            <option value="Việt Nam">Việt Nam</option>
                            <option value="Singapore">Singapore</option>
                            <option value="Thái Lan">Thái Lan</option>
                            <option value="Malaysia">Malaysia</option>
                            <option value="Hàn Quốc">Hàn Quốc</option>
                            <option value="Nhật Bản">Nhật Bản</option>
                            <option value="Hoa Kỳ">Hoa Kỳ (USA)</option>
                            <option value="Khác">Quốc gia khác</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                            <IconChevronDown size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Số điện thoại di động */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số điện thoại di động{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="w-24 h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                          <span>VN +84</span>
                        </div>
                        <input
                          type="tel"
                          placeholder="Nhập số điện thoại"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          onBlur={() => handleBlur("phone")}
                          className={`flex-1 h-11 px-3.5 text-sm rounded-xl border transition outline-none ${
                            touched.phone && errors.phone
                              ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                              : touched.phone && !errors.phone
                              ? "border-emerald-500 bg-white focus:ring-2 focus:ring-emerald-100"
                              : "border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          }`}
                        />
                      </div>
                      {touched.phone && errors.phone && (
                        <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <IconAlertTriangle size={12} />
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    {/* Radio lựa chọn người lưu trú */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center gap-6 text-xs sm:text-sm font-medium">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="guestRole"
                            checked={formData.isPrimaryGuest}
                            onChange={() =>
                              setFormData((p) => ({ ...p, isPrimaryGuest: true }))
                            }
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                          />
                          <span>{isAttraction ? "Tôi là người tham quan chính" : "Tôi là khách lưu trú chính"}</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                          <input
                            type="radio"
                            name="guestRole"
                            checked={!formData.isPrimaryGuest}
                            onChange={() =>
                              setFormData((p) => ({ ...p, isPrimaryGuest: false }))
                            }
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                          />
                          <span>{isAttraction ? "Tôi đang mua vé cho người khác" : "Tôi đang đặt phòng cho người khác"}</span>
                        </label>
                      </div>

                      {/* Ô nhập tên người nhận phòng thực tế nếu đặt hộ */}
                      {!formData.isPrimaryGuest && (
                        <div className="pt-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            {isAttraction ? "Họ và tên người sẽ nhận vé / tham quan thực tế" : "Họ và tên người sẽ nhận phòng thực tế"}{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder={isAttraction ? "Nhập họ tên đầy đủ người tham quan" : "Nhập họ tên đầy đủ người đến nhận phòng"}
                            value={formData.recipientName}
                            onChange={(e) =>
                              handleChange("recipientName", e.target.value)
                            }
                            onBlur={() => handleBlur("recipientName")}
                            className={`w-full h-11 px-3.5 text-sm rounded-xl border transition outline-none ${
                              touched.recipientName && errors.recipientName
                                ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                : touched.recipientName && !errors.recipientName
                                ? "border-emerald-500 bg-white focus:ring-2 focus:ring-emerald-100"
                                : "border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                            }`}
                          />
                          {touched.recipientName && errors.recipientName && (
                            <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                              <IconAlertTriangle size={12} />
                              {errors.recipientName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 2: THÔNG TIN LƯU TRÚ BỔ SUNG */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
                  <h2 className="font-heading font-bold text-lg text-slate-900 mb-4">
                    {isAttraction ? "Thông tin tham quan bổ sung" : "Thông tin lưu trú bổ sung"}
                  </h2>

                  <div className="space-y-4">
                    {/* Giờ nhận phòng dự kiến */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {isAttraction ? "Bạn đã biết khoảng thời gian sẽ đến trải nghiệm chưa?" : "Bạn đã biết khi nào sẽ đến nhận phòng chưa?"}
                      </label>
                      <div className="relative">
                        <select
                          value={formData.estimatedArrival}
                          onChange={(e) =>
                            handleChange("estimatedArrival", e.target.value)
                          }
                          className="w-full h-11 px-3.5 pr-8 text-sm rounded-xl border border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none appearance-none cursor-pointer text-slate-800"
                        >
                          {TIME_SLOTS_24H.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                          <IconChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Yêu cầu đặc biệt */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Yêu cầu đặc biệt
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ghi chú thêm cho khách sạn (nếu có)"
                        value={formData.specialRequests}
                        onChange={(e) =>
                          handleChange("specialRequests", e.target.value)
                        }
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* NÚT TIẾP TỤC ĐẶT Ở GIỮA */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex justify-center">
                  <button
                    type="submit"
                    disabled={isExpired}
                    className={`w-full sm:w-[380px] h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer ${
                      isExpired
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                    }`}
                  >
                    <span>Tiếp tục đến bước thanh toán</span>
                    <IconArrowRight size={15} />
                  </button>
                </div>
              </fieldset>
            </form>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐẶT PHÒNG THUẦN DB (4 CỘT) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Ảnh cơ sở từ DB */}
              {bookingData.facilityImage && (
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={bookingData.facilityImage}
                    alt={bookingData.facilityName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-heading font-bold text-base leading-snug line-clamp-1 drop-shadow-sm">
                      {bookingData.facilityName}
                    </h3>
                    {bookingData.facilityCity && (
                      <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                        {bookingData.facilityAddress || bookingData.facilityCity}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Chi tiết đặt phòng */}
              <div className="p-5 space-y-4 text-xs sm:text-sm">
                {!bookingData.facilityImage && (
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      {bookingData.facilityName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bookingData.facilityAddress || bookingData.facilityCity}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    {isAttraction ? (
                      <span className="text-primary-600 text-sm">🎟️</span>
                    ) : (
                      <IconHotel size={15} className="text-primary-600" />
                    )}
                    <span className="font-medium">
                      {isAttraction ? "Gói trải nghiệm:" : "Gói phòng:"}
                    </span>
                  </div>
                  <strong className="text-slate-900 font-bold text-right line-clamp-1">
                    {bookingData.serviceName}
                  </strong>
                </div>

                {/* Ngày nhận & Trả phòng / Ngày tham quan */}
                {isAttraction ? (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <IconCalendar size={13} className="text-primary-500" />
                        Ngày tham quan:
                      </span>
                      <strong className="text-slate-900 font-bold">
                        {formatDateVN(bookingData.checkInDate)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-slate-500 text-xs">
                        <div className="font-semibold text-slate-700">
                          Nhận phòng (Check-in)
                        </div>
                        <div>{formatDateVN(bookingData.checkInDate)}</div>
                      </div>
                      <div className="text-right text-slate-500 text-xs">
                        <div className="font-semibold text-slate-700">
                          Trả phòng (Check-out)
                        </div>
                        <div>{formatDateVN(bookingData.checkOutDate)}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-primary-700">
                      <span className="flex items-center gap-1">
                        <IconCalendar size={13} />
                        Thời gian lưu trú
                      </span>
                      <span>{bookingData.nights} đêm</span>
                    </div>
                  </div>
                )}

                {/* Số lượng phòng & khách / vé */}
                <div className="flex items-center justify-between text-slate-600 py-1">
                  <span className="flex items-center gap-1.5">
                    <IconUsers size={14} className="text-primary-600" />
                    Số lượng đăng ký:
                  </span>
                  <span className="font-bold text-slate-800">
                    {isAttraction
                      ? `${bookingData.guests} vé`
                      : `${bookingData.rooms} phòng · ${bookingData.guests} người`}
                  </span>
                </div>

                {/* Áp dụng Voucher */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="font-semibold text-slate-800 text-xs">
                    Mã giảm giá (Voucher)
                  </div>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 text-xs">
                      <span>Đang áp dụng: <strong>{appliedPromo}</strong></span>
                      <button
                        type="button"
                        onClick={removePromoCode}
                        className="text-xs text-rose-600 hover:underline font-semibold ml-2 cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Mã voucher..."
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 uppercase outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          disabled={!promoInput.trim()}
                          onClick={() => applyPromoCode(promoInput)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-[11px] text-rose-600 mt-1">{promoError}</p>
                      )}
                      {availablePromos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] text-slate-500 mb-1">Mã ưu đãi có sẵn:</p>
                          <div className="flex flex-wrap gap-1">
                            {availablePromos.map((p) => (
                              <button
                                key={p._id || p.code}
                                type="button"
                                onClick={() => {
                                  setPromoInput(p.code);
                                  applyPromoCode(p.code);
                                }}
                                className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded px-2 py-0.5 font-mono cursor-pointer"
                              >
                                {p.code} ({p.discount_type === 'PERCENTAGE' ? `-${p.discount_value}%` : `-${formatVND(p.discount_value)}`})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quy đổi điểm thưởng thành viên */}
                {quoteData && (quoteData.points_available > 0 || quoteData.points_redeemed > 0) && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => {
                            setUsePoints(e.target.checked);
                            if (e.target.checked && !pointsInput) {
                              setPointsInput(String(quoteData.points_available));
                            }
                          }}
                        />
                        <span>Dùng điểm thưởng</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Có: <strong>{quoteData.points_available} điểm</strong>
                      </span>
                    </div>
                    {usePoints && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={quoteData.points_available}
                          step={1}
                          value={pointsInput}
                          onChange={(e) => setPointsInput(e.target.value)}
                          className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300 outline-none focus:border-blue-500"
                          placeholder="Số điểm"
                        />
                        <span className="text-[11px] text-slate-600">
                          = Giảm {formatVND(Number(pointsInput || 0) * (quoteData.point_value || 1000))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chi tiết tính giá tiền */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>
                      {isAttraction
                        ? `${formatVND(bookingData.servicePrice)} × ${bookingData.guests} vé`
                        : `${formatVND(bookingData.servicePrice)} × ${bookingData.nights} đêm × ${bookingData.rooms} phòng`}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatVND(quoteData ? quoteData.subtotal : bookingData.totalAmount)}
                    </span>
                  </div>

                  {quoteData?.promotion_discount_amount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 text-xs font-medium">
                      <span>Giảm giá voucher ({quoteData.promotion?.code || appliedPromo})</span>
                      <span>- {formatVND(quoteData.promotion_discount_amount)}</span>
                    </div>
                  )}

                  {quoteData?.points_discount_amount > 0 && (
                    <div className="flex items-center justify-between text-amber-600 text-xs font-medium">
                      <span>Trừ điểm thưởng ({quoteData.points_redeemed} điểm)</span>
                      <span>- {formatVND(quoteData.points_discount_amount)}</span>
                    </div>
                  )}
                  

                  {/* Tổng tiền */}
                  <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                    <div className="font-heading font-black text-slate-900 text-sm">
                      Tổng cộng:
                    </div>
                    <div className="font-heading font-black text-xl text-primary-600">
                      {formatVND(quoteData ? quoteData.final_amount : bookingData.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Chính sách nhận phòng / vé */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <IconCheck size={14} className="text-emerald-600" />
                    <span>{isAttraction ? "Chính sách vé điện tử" : "Chính sách nhận phòng"}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    {isAttraction
                      ? "Vé điện tử (QR Pass) sẽ được gửi ngay qua email sau khi hoàn tất thủ tục."
                      : "Xác nhận tức thì qua email sau khi hoàn tất thủ tục."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. THÔNG BÁO HẸN GIỜ (POPUP AGODA: DỮ LIỆU TỒN KHO THẬT TỪ DB)
          ───────────────────────────────────────────────────────────── */}
      {showTimedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => setShowTimedAlert(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 text-blue-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
            >
              <IconX size={18} />
            </button>

            {/* Illustration Đồng hồ & Vé giảm giá % */}
            <div className="flex justify-center mb-6">
              <svg
                width="140"
                height="100"
                viewBox="0 0 160 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                <line x1="110" y1="20" x2="120" y2="10" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <line x1="125" y1="35" x2="138" y2="30" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <line x1="72" y1="18" x2="65" y2="8" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

                <circle cx="95" cy="45" r="26" fill="#eff6ff" stroke="#2563eb" strokeWidth="3.5" />
                <rect x="91" y="13" width="8" height="6" rx="2" fill="#2563eb" />
                <path d="M95 19v6" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                <circle cx="95" cy="45" r="3.5" fill="#2563eb" />
                <path d="M95 45L88 36" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                <path d="M95 45L103 40" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

                <g transform="rotate(-18 70 75)">
                  <rect x="25" y="45" width="90" height="48" rx="8" fill="#3b82f6" />
                  <line x1="82" y1="45" x2="82" y2="93" stroke="white" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                  <circle cx="82" cy="45" r="6" fill="white" />
                  <circle cx="82" cy="93" r="6" fill="white" />
                  <text x="44" y="80" fill="white" fontSize="28" fontWeight="900" fontFamily="sans-serif">
                    %
                  </text>
                  <circle cx="98" cy="69" r="4" fill="white" opacity="0.8" />
                </g>

                <ellipse cx="80" cy="112" rx="42" ry="6" fill="#1e40af" opacity="0.08" />
              </svg>
            </div>

            {/* Nội dung thông báo lấy từ DB thật */}
            <div className="space-y-2 mb-6">
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                Quý khách sắp hoàn tất rồi!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {bookingData?.availableRooms !== null &&
                bookingData?.availableRooms !== undefined ? (
                  <>
                    Hạng phòng{" "}
                    <strong className="text-slate-900 font-bold">
                      "{bookingData?.serviceName}"
                    </strong>{" "}
                    hiện chỉ còn{" "}
                    <strong className="text-blue-700 font-bold">
                      {bookingData.availableRooms} phòng
                    </strong>{" "}
                    trong kho vào ngày quý khách chọn. Nếu quý khách rời đi bây
                    giờ thì chúng tôi không thể tiếp tục giữ phòng và mức giá này
                    cho quý khách được.
                  </>
                ) : (
                  <>
                    Hạng phòng{" "}
                    <strong className="text-slate-900 font-bold">
                      "{bookingData?.serviceName}"
                    </strong>{" "}
                    vào ngày quý khách chọn đang được nhiều khách hàng cùng quan
                    tâm. Nếu quý khách rời đi bây giờ thì chúng tôi không thể tiếp
                    tục giữ phòng và mức giá này cho quý khách được.
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowTimedAlert(false)}
                className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm hover:shadow-blue-500/20 active:scale-98 cursor-pointer"
              >
                Tiếp tục đặt chỗ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL HẾT GIỜ GIỮ PHÒNG (KHI ĐỒNG HỒ CHẠM 00:00)
          ───────────────────────────────────────────────────────────── */}
      {isExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <IconAlertTriangle size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-heading font-black text-xl text-slate-900">
                Thời gian giữ phòng đã kết thúc!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Phiên giữ chỗ 15 phút của bạn đã hết hạn. Phòng đã được hoàn trả
                lại vào quỹ phòng trống của khách sạn.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                * Toàn bộ thông tin bạn đã gõ vẫn được lưu giữ nguyên vẹn trên màn
                hình.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
              >
                Quay lại
              </button>

              <button
                type="button"
                onClick={handleRenewHoldTime}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-xs cursor-pointer"
              >
                Đặt lại (Gia hạn 15p)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL XÁC NHẬN THÀNH CÔNG THÔNG TIN KHÁCH (TRƯỜNG HỢP TRONG HẠN)
          ───────────────────────────────────────────────────────────── */}
      {submittedSuccess && !isExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <IconCheck size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl text-slate-900">
                Thông tin đặt phòng đã được ghi nhận!
              </h3>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>
                  Khách đặt:{" "}
                  <strong className="text-slate-900">
                    {formData.lastName} {formData.firstName}
                  </strong>
                </div>
                {!formData.isPrimaryGuest && formData.recipientName && (
                  <div>
                    Người nhận phòng:{" "}
                    <strong className="text-blue-700">
                      {formData.recipientName}
                    </strong>
                  </div>
                )}
                <div>
                  Email:{" "}
                  <span className="font-mono text-slate-700">
                    {formData.email}
                  </span>
                </div>
                <div>
                  Số điện thoại:{" "}
                  <span className="font-mono text-slate-700">
                    {formData.phone}
                  </span>
                </div>
                <div>
                  Tổng thanh toán:{" "}
                  <span><strong className="text-primary-600 font-bold">
                    {formatVND(quoteData ? quoteData.final_amount : bookingData.totalAmount)}
                  </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-left text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-950">
                <span>⏱️ Phòng đang được giữ (còn {formatCountdown(remainingSeconds)})</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                Đã ghi nhận thông tin người lưu trú. Vui lòng tiến hành thanh
                toán để hoàn tất việc xác nhận đơn đặt phòng.
              </p>
            </div>

            {payError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-left">{payError}</p>}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={paying}
                onClick={() => { setPayError(""); setSubmittedSuccess(false); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
              >
                Chỉnh sửa thông tin
              </button>

              <button
                type="button"
                disabled={paying}
                onClick={proceedToPayment}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
              >
                {paying ? "Đang tạo đơn..." : "Tiến hành thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
