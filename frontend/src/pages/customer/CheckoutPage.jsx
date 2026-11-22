import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { bookingApi } from "../../services/api/bookingApi";
import { facilityApi } from "../../services/api/facilityApi";
import { ticketCart } from "../../services/storage/ticketCart";
import { attractionTicketOptions } from "../../utils/attractionTicketOptions";
import { ageLabel } from "../../utils/ticketTypes";
import { formatVND, formatDateVN } from "../../utils/bookingUi";
import ClockTimePicker from "../../components/common/ClockTimePicker";
import {
  IconClock,
  IconCheck,
  IconArrowRight,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconHotel,
  IconCalendar,
  IconUsers,
  IconTicket,
  IconX,
  IconPlus,
  IconMinus,
} from "../../components/Icons";

import { Gift, PartyPopper, X } from "lucide-react";
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const HOLD_DURATION_SECONDS = 15 * 60; // khớp thời gian giữ chỗ 15 phút ở backend
const HOLD_TIMER_KEY = "travelio_checkout_hold_expires";
const HOLD_CONFIG_KEY = "travelio_checkout_hold_duration";
const HOTEL_BOOKING_KEY = "travelio_checkout_hotel_booking";


// ─────────────────────────────────────────────────────────────
// MAIN CHECKOUT COMPONENT (STEP 1: CUSTOMER INFORMATION)
// ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // 1. Phục hồi dữ liệu thuần từ DB thật
  const [bookingData, setBookingData] = useState(() => {
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
  const holdTimerKey = `${HOLD_TIMER_KEY}_${isAttraction ? "attraction" : "hotel"}`;
  const holdConfigKey = `${HOLD_CONFIG_KEY}_${isAttraction ? "attraction" : "hotel"}`;

  // The hotel and ticket checkouts share the same route. Refresh the cached
  // booking when navigation changes the route state so their timers cannot
  // accidentally keep the previous product's countdown.
  useEffect(() => {
    if (!location.state?.facilityName) return;
    setBookingData(location.state);
    try {
      sessionStorage.setItem(HOTEL_BOOKING_KEY, JSON.stringify(location.state));
    } catch (err) {
      console.error("Failed to cache booking state", err);
    }
  }, [location.state]);

  // 2. Quản lý thời gian giữ phòng (Hold Time) - BẮT ĐẦU CHẠY NGAY KHI VÀO TRANG CHECKOUT
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    try {
      const storedConfig = sessionStorage.getItem(holdConfigKey);
      const stored = sessionStorage.getItem(holdTimerKey);

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
      sessionStorage.setItem(holdTimerKey, newExpiry.toString());
      sessionStorage.setItem(holdConfigKey, HOLD_DURATION_SECONDS.toString());
      return HOLD_DURATION_SECONDS;
    } catch {
      return HOLD_DURATION_SECONDS;
    }
  });

  const [isExpired, setIsExpired] = useState(() => {
    try {
      const stored = sessionStorage.getItem(holdTimerKey);
      if (stored) {
        return Date.now() >= parseInt(stored, 10);
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const storedConfig = sessionStorage.getItem(holdConfigKey);
      const stored = sessionStorage.getItem(holdTimerKey);
      const remaining = stored && storedConfig === HOLD_DURATION_SECONDS.toString()
        ? Math.floor((parseInt(stored, 10) - Date.now()) / 1000)
        : 0;
      if (remaining > 0 && remaining <= HOLD_DURATION_SECONDS) {
        setRemainingSeconds(remaining);
        setIsExpired(false);
        return;
      }
      const newExpiry = Date.now() + HOLD_DURATION_SECONDS * 1000;
      sessionStorage.setItem(holdTimerKey, newExpiry.toString());
      sessionStorage.setItem(holdConfigKey, HOLD_DURATION_SECONDS.toString());
      setRemainingSeconds(HOLD_DURATION_SECONDS);
      setIsExpired(false);
    } catch {
      setRemainingSeconds(HOLD_DURATION_SECONDS);
      setIsExpired(false);
    }
  }, [holdConfigKey, holdTimerKey]);

  useEffect(() => {
    if (!isExpired || isAttraction) return;
    bookingApi.releaseRoomHold(roomHoldToken.current).catch(() => {});
  }, [isExpired, isAttraction]);

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
    sessionStorage.setItem(holdTimerKey, newExpiry.toString());
    sessionStorage.setItem(holdConfigKey, HOLD_DURATION_SECONDS.toString());
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
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const requestId = useRef(crypto.randomUUID());

  // Voucher & Loyalty Points states
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  const [availablePromos, setAvailablePromos] = useState([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [quoteData, setQuoteData] = useState(null);

  const maxRedeemablePoints = useMemo(() => {
    if (!quoteData) return 0;
    const baseAmount = Math.max(
      0,
      (quoteData.subtotal || bookingData?.totalAmount || 0) -
        (quoteData.hotel_discount_amount || 0) -
        (quoteData.promotion_discount_amount || 0)
    );
    const pointVal = quoteData.point_value || 1000;
    const affordable = Math.floor(baseAmount / pointVal);
    return Math.max(0, Math.min(quoteData.points_available || 0, affordable));
  }, [quoteData, bookingData?.totalAmount]);
  const roomHoldToken = useRef(crypto.randomUUID());
  const isPaidRef = useRef(false);
  const [roomHoldError, setRoomHoldError] = useState("");
  const [roomHoldReady, setRoomHoldReady] = useState(false);
  const [roomCountInput, setRoomCountInput] = useState(bookingData?.rooms || 1);
  const [roomCountError, setRoomCountError] = useState("");
  const [updatingRoomCount, setUpdatingRoomCount] = useState(false);
  const [isEditRoomGuestModalOpen, setIsEditRoomGuestModalOpen] = useState(false);
  const [editModalError, setEditModalError] = useState("");
  const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false);
  const [editTicketModalError, setEditTicketModalError] = useState("");
  const [updatingTicketCount, setUpdatingTicketCount] = useState(false);

  // Release room hold immediately when customer leaves checkout without completing payment
  useEffect(() => {
    return () => {
      if (!isPaidRef.current && !isAttraction && roomHoldToken.current) {
        bookingApi.releaseRoomHold(roomHoldToken.current).catch(() => {});
      }
    };
  }, [isAttraction]);

  useEffect(() => {
    if (location.state?.rooms) setRoomCountInput(location.state.rooms);
  }, [location.state?.rooms]);

  useEffect(() => {
    if (!bookingData || isAttraction) return undefined;
    let active = true;
    setRoomHoldError("");
    setRoomHoldReady(false);
    bookingApi.holdRoom({
      service_id: bookingData.serviceId,
      check_in: bookingData.checkInDate,
      check_out: bookingData.checkOutDate,
      rooms: bookingData.rooms,
        guests: bookingData.guests,
        adults: bookingData.adults,
      hold_token: roomHoldToken.current,
    }).then(() => {
      if (active) setRoomHoldReady(true);
    }).catch((err) => {
      if (active) {
        const message = err.status === 404
          ? "Tính năng giữ phòng chưa được khởi động trên backend. Vui lòng tải lại sau khi backend được restart."
          : err.message || "Ngày phòng vừa được khách khác giữ. Vui lòng chọn lại ngày.";
        setRoomHoldError(message);
        setRoomHoldReady(false);
        setPayError(message);
      }
    });
    return () => { active = false; };
  }, [bookingData, isAttraction]);

  useEffect(() => {
    const serviceType = isAttraction ? "ATTRACTION" : "HOTEL";
    bookingApi.promotions({ service_type: serviceType })
      .then((res) => {
        const promos = res.data?.promotions || [];
        setAvailablePromos(promos);
        const userIsNew = res.data?.is_new_user;
        if (userIsNew !== undefined) setIsNewUser(userIsNew);

        // Tự động áp dụng mã chào mừng khách hàng mới nếu đơn hàng đủ điều kiện tối thiểu
        if (!appliedPromo && userIsNew && promos.length > 0) {
          const orderAmt = bookingData?.totalAmount || 0;
          const welcomePromo = promos.find((p) =>
            (p.target_audience === "NEW_USER" || p.voucher_type === "NEW_USER") &&
            (!p.min_order_amount || orderAmt >= p.min_order_amount)
          );
          if (welcomePromo) {
            setAppliedPromo(welcomePromo.code);
            setPromoInput(welcomePromo.code);
          }
        }
      })
      .catch(() => {});
  }, [isAttraction, bookingData?.totalAmount]);

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
          adults: bookingData.adults,
          children: bookingData.children,
          hold_token: roomHoldToken.current,
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

  const handleSaveRoomGuestConfig = async ({ rooms, adults, children, childrenAges }) => {
    if (isAttraction || updatingRoomCount || isExpired) return;
    const roomCapacity = Number(bookingData?.roomCapacity) || 2;
    const maxCapacity = rooms * roomCapacity;
    const totalGuests = adults + children;

    if (!Number.isSafeInteger(rooms) || rooms < 1) {
      setEditModalError("Vui lòng chọn ít nhất 1 phòng.");
      return;
    }
    if (adults < rooms) {
      setEditModalError(`Mỗi phòng cần ít nhất 1 người lớn (${rooms} phòng cần tối thiểu ${rooms} người lớn).`);
      return;
    }
    if (totalGuests > maxCapacity) {
      setEditModalError(`Hạng phòng này chỉ chứa tối đa ${roomCapacity} người/phòng (${rooms} phòng chứa tối đa ${maxCapacity} khách). Với ${totalGuests} khách, vui lòng tăng số lượng phòng.`);
      return;
    }

    setUpdatingRoomCount(true);
    setEditModalError("");
    setRoomCountError("");
    setPayError("");
    try {
      await bookingApi.holdRoom({
        service_id: bookingData.serviceId,
        check_in: bookingData.checkInDate,
        check_out: bookingData.checkOutDate,
        rooms,
        guests: totalGuests,
        adults,
        hold_token: roomHoldToken.current,
      });

      const nextBooking = {
        ...bookingData,
        rooms,
        guests: totalGuests,
        adults,
        children,
        childrenAges: (childrenAges || []).slice(0, children),
        totalAmount: bookingData.servicePrice * bookingData.nights * rooms,
      };

      setBookingData(nextBooking);
      setRoomCountInput(rooms);
      setQuoteData(null);
      sessionStorage.setItem(HOTEL_BOOKING_KEY, JSON.stringify(nextBooking));
      handleRenewHoldTime();
      setRoomHoldReady(true);
      setIsEditRoomGuestModalOpen(false);
    } catch (error) {
      setEditModalError(error.message || "Không thể cập nhật số phòng/khách do vượt quá tồn phòng còn lại.");
    } finally {
      setUpdatingRoomCount(false);
    }
  };

  const handleSaveTicketConfig = async ({ selectedItems, totalTickets, totalAmount }) => {
    if (!isAttraction || updatingTicketCount || isExpired) return;
    try {
      setUpdatingTicketCount(true);
      setEditTicketModalError("");

      const nextBooking = {
        ...bookingData,
        selectedItems,
        guests: totalTickets,
        totalAmount,
        servicePrice: totalAmount / (totalTickets || 1),
      };

      setBookingData(nextBooking);
      try {
        sessionStorage.setItem(HOTEL_BOOKING_KEY, JSON.stringify(nextBooking));
        ticketCart.write({
          facility_id: bookingData.facilityId,
          date: bookingData.checkInDate,
          items: selectedItems.map((o) => ({
            line_key: o.line_key,
            ...(o.inventory_id
              ? { inventory_id: o.inventory_id }
              : { service_id: o.service_id, ticket_type_id: o.ticket_type_id, visit_date: o.visit_date, time_slot: o.time_slot || 'ALL_DAY' }),
            quantity: Number(o.quantity),
          })),
        });
      } catch (err) {
        console.error("Failed to cache updated ticket booking", err);
      }

      setQuoteData(null);
      handleRenewHoldTime();
      setIsEditTicketModalOpen(false);
    } catch (error) {
      setEditTicketModalError(error.message || "Không thể cập nhật số lượng vé.");
    } finally {
      setUpdatingTicketCount(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo("");
    setPromoInput("");
    setPromoError("");
  };

  // Creates the order, then the order page shows the single payment QR.
  const proceedToPayment = async () => {
    if (paying || isExpired) return;
    if (!isAttraction && (!roomHoldReady || Number(roomCountInput) !== Number(bookingData.rooms))) {
      setPayError("Đang kiểm tra lại lượt giữ phòng. Vui lòng thử lại sau giây lát.");
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      const isBookingForOther = !formData.isPrimaryGuest && Boolean(formData.recipientName?.trim());
      const bookerFullName = `${formData.lastName} ${formData.firstName}`.trim();
      const actualGuestName = isBookingForOther
        ? `${formData.recipientName.trim()} (Người đặt: ${bookerFullName})`
        : bookerFullName;

      const guest = {
        guest_name: actualGuestName,
        guest_email: formData.email.trim(),
        guest_phone: formData.phone.trim(),
        recipient_name: isBookingForOther ? formData.recipientName.trim() : undefined,
        special_requests: formData.specialRequests?.trim() || undefined,
        estimated_arrival: formData.estimatedArrival || undefined,
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
            adults: bookingData.adults,
            children: bookingData.children,
            hold_token: roomHoldToken.current,
          });
      try {
        sessionStorage.removeItem(HOTEL_BOOKING_KEY);
        sessionStorage.removeItem(holdTimerKey);
      } catch { /* ignore storage errors */ }
      isPaidRef.current = true;
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
          err = "Số điện thoại di động phải gồm 9-10 chữ số (vd: 0912345678).";
        } else if (
          !/^(0|\+?84)?[35789][0-9]{8}$/.test(trimmed.replace(/\s+/g, ""))
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

    proceedToPayment();
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
      <nav aria-label="Các bước đặt chỗ" className="border-b border-slate-200 bg-white">
        <ol className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 text-sm sm:px-6">
          <li aria-current="step" className="flex items-center gap-2 font-semibold text-primary-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">1</span>
            Thông tin khách hàng
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-slate-300 sm:w-12" />
          <li className="flex items-center gap-2 text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-bold">2</span>
            Thanh toán
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-slate-300 sm:w-12" />
          <li className="flex items-center gap-2 text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-bold">3</span>
            Xác nhận
          </li>
        </ol>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          2. HOLD TIME BANNER: CĂN GIỮA & CHẠY LÙI NGAY KHI VÀO MÀN HÌNH
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`border-b py-2.5 px-4 transition-colors ${
          isExpired
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : remainingSeconds < 180
            ? "bg-amber-100 border-amber-300 text-amber-950"
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
            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-sm bg-white border border-amber-300 px-2.5 py-0.5 rounded-md text-amber-800">
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
                      <ClockTimePicker
                        value={formData.estimatedArrival}
                        onChange={(val) => handleChange("estimatedArrival", val)}
                        isAttraction={isAttraction}
                        timeSlots={bookingData?.timeSlots || (bookingData?.selectedItems || []).map((item) => item.time_slot).filter(Boolean)}
                      />
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

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                  {payError && <p role="alert" className="w-full rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{payError}</p>}
                  <button
                    type="submit"
                    disabled={isExpired || paying || updatingRoomCount || Boolean(roomHoldError) || !quoteData || (!isAttraction && !roomHoldReady) || (!isAttraction && Number(roomCountInput) !== Number(bookingData.rooms))}
                    className="h-12 w-full rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-[380px]"
                  >
                    {paying ? "Đang tạo đơn..." : "Xác nhận và thanh toán"}
                  </button>
                  <p className="text-xs text-slate-500">Bạn sẽ nhận mã QR thanh toán ở trang chi tiết đơn.</p>
                </div>
              </fieldset>
            </form>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐẶT PHÒNG THUẦN DB (4 CỘT) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {bookingData.facilityImage && (
                <img src={bookingData.facilityImage} alt={bookingData.facilityName} className="h-44 w-full object-cover" />
              )}

              {/* Chi tiết đặt phòng */}
              <div className="p-5 space-y-4 text-xs sm:text-sm">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    {bookingData.facilityName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bookingData.facilityAddress || bookingData.facilityCity}
                  </p>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    {isAttraction ? (
                      <IconTicket size={15} className="text-primary-600" />
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
                <div className="flex items-center justify-between gap-3 text-slate-600 py-2 border-b border-slate-100">
                  <div className="flex items-start gap-2">
                    <IconUsers size={16} className="text-primary-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">
                        {isAttraction
                          ? `${bookingData.guests} vé tham quan`
                          : `${bookingData.rooms} phòng · ${bookingData.adults || bookingData.rooms} người lớn${
                              bookingData.children ? `, ${bookingData.children} trẻ em` : ""
                            }`}
                      </div>
                      {isAttraction && Array.isArray(bookingData.selectedItems) && bookingData.selectedItems.length > 0 && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap gap-x-2">
                          {bookingData.selectedItems.map((item, idx) => (
                            <span key={item.line_key || idx}>
                              {item.quantity} × {item.ticket_name || "Vé tham quan"}
                            </span>
                          ))}
                        </div>
                      )}
                      {!isAttraction && bookingData.children > 0 && bookingData.childrenAges?.length > 0 && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Độ tuổi trẻ em: {bookingData.childrenAges.slice(0, bookingData.children).map((a, i) => `Bé ${i + 1} (${a === 0 ? "< 1 tuổi" : `${a} tuổi`})`).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {((!isAttraction && (roomCountError || roomHoldError)) || (isAttraction && editTicketModalError)) && (
                  <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    {roomCountError || roomHoldError || editTicketModalError}
                  </p>
                )}

                {/* Ưu đãi từ khách sạn nếu có */}
                {quoteData?.hotel_discount_amount > 0 && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-blue-900">
                        {quoteData.hotel_promotion?.name || "Ưu đãi khách sạn"}
                      </span>
                    </div>
                    <span className="font-bold text-blue-700">
                      -{formatVND(quoteData.hotel_discount_amount)}
                    </span>
                  </div>
                )}

                {/* Mã giảm giá Travelio Voucher (Travelio Travel Pass) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <IconTicket size={15} className="text-primary-600" />
                      <span>Travelio Voucher</span>
                    </span>
                    {appliedPromo && quoteData?.promotion_discount_amount > 0 && (
                      <span className="font-bold text-primary-700">
                        -{formatVND(quoteData.promotion_discount_amount)}
                      </span>
                    )}
                  </div>

                  {/* Thanh kích hoạt mở Modal chọn Voucher Travelio Style */}
                  <div
                    onClick={() => setIsVoucherModalOpen(true)}
                    className="w-full p-3 rounded-xl border border-dashed border-primary-300 hover:border-primary-500 bg-primary-50/40 hover:bg-primary-50 transition flex items-center justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 shadow-xs">
                        <IconTicket size={16} />
                      </div>
                      <div>
                        {appliedPromo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-extrabold text-primary-700 bg-white px-2 py-0.5 rounded border border-primary-200 shadow-2xs">
                              {appliedPromo}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              (Tiết kiệm {formatVND(quoteData?.promotion_discount_amount || 0)})
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              Chọn hoặc nhập mã ưu đãi
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {availablePromos.length > 0
                                ? `${availablePromos.length} voucher khả dụng cho ${isAttraction ? "vé vui chơi" : "khách sạn"}`
                                : "Nhấn để xem danh sách mã"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {appliedPromo ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePromoCode();
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-primary-700 group-hover:translate-x-0.5 transition-transform">
                          Chọn mã &gt;
                        </span>
                      )}
                    </div>
                  </div>

                  {promoError && (
                    <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>
                  )}

                  {/* Banner chào mừng & hướng dẫn cho khách hàng mới */}
                  {isNewUser && appliedPromo && quoteData?.promotion?.target_audience === "NEW_USER" && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <span className="text-sm"><PartyPopper size="1em" className="inline-block align-[-0.125em] shrink-0" /></span>
                      <span className="leading-tight font-medium">
                        Ưu đãi chào mừng khách hàng mới đã tự động được áp dụng cho đơn này!
                      </span>
                    </div>
                  )}
                  {isNewUser && !appliedPromo && availablePromos.some((p) => p.target_audience === "NEW_USER") && (
                    <div
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition"
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span><Gift size="1em" className="inline-block align-[-0.125em] shrink-0" /></span>
                        <span>Bạn có mã ưu đãi cho khách hàng mới!</span>
                      </span>
                      <span className="text-amber-800 font-bold underline text-[11px]">Chọn ngay &gt;</span>
                    </div>
                  )}
                </div>

                {/* MODAL CHỌN VOUCHER DU LỊCH TRAVELIO */}
                <TravelVoucherModal
                  isOpen={isVoucherModalOpen}
                  onClose={() => setIsVoucherModalOpen(false)}
                  promotions={availablePromos}
                  appliedCode={appliedPromo}
                  onSelectPromo={(code) => {
                    setPromoInput(code);
                    applyPromoCode(code);
                  }}
                  onRemovePromo={removePromoCode}
                  orderTotal={quoteData?.total_amount ?? bookingData.totalAmount}
                  isAttraction={isAttraction}
                  isNewUser={isNewUser}
                  promoError={promoError}
                  onApplyManualCode={(code) => {
                    setPromoInput(code);
                    applyPromoCode(code);
                  }}
                />

                {/* MODAL THAY ĐỔI PHÒNG & SỐ LƯỢNG KHÁCH */}
                <EditRoomGuestModal
                  isOpen={isEditRoomGuestModalOpen}
                  onClose={() => setIsEditRoomGuestModalOpen(false)}
                  bookingData={bookingData}
                  onSave={handleSaveRoomGuestConfig}
                  updating={updatingRoomCount}
                  error={editModalError}
                />

                {/* MODAL THAY ĐỔI SỐ LƯỢNG VÉ THAM QUAN */}
                <EditTicketModal
                  isOpen={isEditTicketModalOpen}
                  onClose={() => setIsEditTicketModalOpen(false)}
                  bookingData={bookingData}
                  onSave={handleSaveTicketConfig}
                  updating={updatingTicketCount}
                  error={editTicketModalError}
                />
                {quoteData && (quoteData.points_available > 0 || quoteData.points_redeemed > 0) && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => {
                            setUsePoints(e.target.checked);
                            if (e.target.checked && (!pointsInput || Number(pointsInput) === 0)) {
                              setPointsInput(String(maxRedeemablePoints));
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
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={maxRedeemablePoints}
                            step={1}
                            value={pointsInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setPointsInput("");
                              } else {
                                const num = Math.max(0, Math.min(Number(val), maxRedeemablePoints));
                                setPointsInput(String(num));
                              }
                            }}
                            className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300 outline-none focus:border-blue-500"
                            placeholder="Số điểm"
                          />
                          <button
                            type="button"
                            onClick={() => setPointsInput(String(maxRedeemablePoints))}
                            className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md border border-primary-200 transition cursor-pointer"
                          >
                            Dùng tối đa
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          = Giảm {formatVND(Math.min(Number(pointsInput || 0), maxRedeemablePoints) * (quoteData.point_value || 1000))} (Khả dụng tối đa {maxRedeemablePoints} điểm)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chi tiết tính giá tiền */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {isAttraction ? (
                    (quoteData?.items || bookingData?.selectedItems || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(quoteData?.items || bookingData.selectedItems || []).map((item, idx) => {
                          const name = item.ticket_name || item.service_name || bookingData?.serviceName || "Vé tham quan";
                          const qty = item.quantity || 1;
                          const price = item.unit_price ?? item.price ?? 0;
                          const lineTotal = item.line_total ?? (price * qty);
                          return (
                            <div key={item.line_key || idx} className="flex items-center justify-between text-slate-600 text-xs">
                              <span>
                                {name} ({formatVND(price)} × {qty})
                              </span>
                              <span className="font-semibold text-slate-700">
                                {formatVND(lineTotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span>{bookingData?.serviceName || "Vé tham quan"} × {bookingData?.guests || 1} vé</span>
                        <span className="font-semibold text-slate-700">
                          {formatVND(quoteData ? quoteData.subtotal : bookingData?.totalAmount || 0)}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span>
                        {formatVND(bookingData?.servicePrice || 0)} × {bookingData?.nights || 1} đêm × {bookingData?.rooms || 1} phòng
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatVND(quoteData ? quoteData.subtotal : bookingData?.totalAmount || 0)}
                      </span>
                    </div>
                  )}

                  {quoteData?.hotel_discount_amount > 0 && (
                    <div className="flex items-center justify-between text-blue-600 text-xs font-medium">
                      <span>{quoteData.hotel_promotion?.name || "Ưu đãi khách sạn"} (-{quoteData.hotel_promotion?.percent}%)</span>
                      <span>- {formatVND(quoteData.hotel_discount_amount)}</span>
                    </div>
                  )}

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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// TRAVEL VOUCHER MODAL & DETAIL DRAWER COMPONENT
// ─────────────────────────────────────────────────────────────

const formatDateShort = (dateStr) => {
  if (!dateStr) return "Vô thời hạn";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Vô thời hạn";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Vô thời hạn";
  }
};

const isNearExpiry = (dateStr) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 3;
  } catch {
    return false;
  }
};

function EditRoomGuestModal({
  isOpen,
  onClose,
  bookingData,
  onSave,
  updating,
  error,
}) {
  const [rooms, setRooms] = useState(bookingData?.rooms || 1);
  const [adults, setAdults] = useState(bookingData?.adults || bookingData?.rooms || 2);
  const [children, setChildren] = useState(bookingData?.children || 0);
  const [childrenAges, setChildrenAges] = useState(bookingData?.childrenAges || []);

  useEffect(() => {
    if (isOpen && bookingData) {
      setRooms(bookingData.rooms || 1);
      setAdults(bookingData.adults || bookingData.rooms || 2);
      setChildren(bookingData.children || 0);
      setChildrenAges(
        bookingData.childrenAges && bookingData.childrenAges.length === (bookingData.children || 0)
          ? bookingData.childrenAges
          : Array(bookingData.children || 0).fill(5)
      );
    }
  }, [isOpen, bookingData]);

  if (!isOpen || !bookingData) return null;

  const roomCapacity = Number(bookingData.roomCapacity) || 2;
  const maxCapacity = rooms * roomCapacity;
  const totalGuests = adults + children;
  const isOverCapacity = totalGuests > maxCapacity;
  const isAdultsTooLow = adults < rooms;
  const nights = bookingData.nights || 1;
  const servicePrice = bookingData.servicePrice || 0;
  const newTotal = servicePrice * nights * rooms;

  const handleChildrenChange = (newCount) => {
    const validCount = Math.max(0, Math.min(10, newCount));
    setChildren(validCount);
    const updatedAges = [...childrenAges];
    if (validCount > updatedAges.length) {
      for (let i = updatedAges.length; i < validCount; i++) {
        updatedAges.push(5);
      }
    } else {
      updatedAges.length = validCount;
    }
    setChildrenAges(updatedAges);
  };

  const handleAgeChange = (index, age) => {
    const updated = [...childrenAges];
    updated[index] = Number(age);
    setChildrenAges(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-900">
              Thay đổi số phòng & số lượng khách
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {bookingData.serviceName} &bull; Sức chứa: {roomCapacity} khách / phòng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Form controls */}
        <div className="space-y-4">
          {/* Số lượng phòng */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-800">Số lượng phòng</div>
              <div className="text-xs text-slate-500">Tối đa sức chứa {maxCapacity} khách</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={rooms <= 1}
                onClick={() => setRooms(Math.max(1, rooms - 1))}
                className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconMinus size={16} />
              </button>
              <span className="font-heading font-extrabold text-base text-slate-900 w-8 text-center">{rooms}</span>
              <button
                type="button"
                disabled={rooms >= 20}
                onClick={() => {
                  const nextRooms = rooms + 1;
                  setRooms(nextRooms);
                  if (nextRooms > adults) setAdults(nextRooms);
                }}
                className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>

          {/* Người lớn */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-800">Người lớn</div>
              <div className="text-xs text-slate-500">Từ 12 tuổi trở lên (tối thiểu 1 người/phòng)</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={adults <= rooms}
                onClick={() => setAdults(Math.max(rooms, adults - 1))}
                className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconMinus size={16} />
              </button>
              <span className="font-heading font-extrabold text-base text-slate-900 w-8 text-center">{adults}</span>
              <button
                type="button"
                disabled={adults >= 40}
                onClick={() => setAdults(adults + 1)}
                className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>

          {/* Trẻ em */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-sm text-slate-800">Trẻ em</div>
                <div className="text-xs text-slate-500">Dưới 12 tuổi</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={children <= 0}
                  onClick={() => handleChildrenChange(children - 1)}
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <IconMinus size={16} />
                </button>
                <span className="font-heading font-extrabold text-base text-slate-900 w-8 text-center">{children}</span>
                <button
                  type="button"
                  disabled={children >= 10}
                  onClick={() => handleChildrenChange(children + 1)}
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            </div>

            {/* Danh sách độ tuổi của từng trẻ em */}
            {children > 0 && (
              <div className="pt-3 border-t border-slate-200/60 mt-3 space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Độ tuổi tính đến ngày nhận phòng:</span>
                  <span className="text-[11px] text-slate-500 font-normal">Cần thiết cho phụ thu/miễn phí</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {Array.from({ length: children }).map((_, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">Bé {idx + 1}:</span>
                      <select
                        value={childrenAges[idx] ?? 5}
                        onChange={(e) => handleAgeChange(idx, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      >
                        {Array.from({ length: 18 }).map((__, age) => (
                          <option key={age} value={age}>
                            {age === 0 ? "< 1 tuổi" : `${age} tuổi`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cảnh báo sức chứa hoặc người lớn */}
          {isAdultsTooLow && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <IconAlertTriangle size={15} className="shrink-0" />
              <span>Bạn đang đặt {rooms} phòng. Mỗi phòng cần tối thiểu 1 người lớn!</span>
            </div>
          )}
          {isOverCapacity && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <IconAlertTriangle size={15} className="shrink-0" />
              <span>Tổng số khách ({totalGuests} khách) vượt quá sức chứa tối đa của {rooms} phòng ({maxCapacity} khách). Vui lòng tăng số phòng!</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
              <IconAlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tạm tính chi phí mới */}
          <div className="p-3.5 bg-primary-50/50 border border-primary-100 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-600 block">Tạm tính giá phòng mới:</span>
              <span className="text-[11px] text-slate-500">
                {formatVND(servicePrice)} &times; {nights} đêm &times; {rooms} phòng
              </span>
            </div>
            <div className="font-heading font-extrabold text-lg text-primary-700">
              {formatVND(newTotal)}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={updating || isOverCapacity || isAdultsTooLow}
            onClick={() => onSave({ rooms, adults, children, childrenAges })}
            className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2"
          >
            {updating ? (
              <>
                <span className="animate-spin text-white">⏳</span>
                <span>Đang kiểm tra & giữ phòng...</span>
              </>
            ) : (
              <span>Xác nhận & Cập nhật</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL CHỈNH SỬA VÉ THAM QUAN NGAY TẠI CHECKOUT
// ─────────────────────────────────────────────────────────────
function EditTicketModal({
  isOpen,
  onClose,
  bookingData,
  onSave,
  updating,
  error,
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [ticketOptions, setTicketOptions] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    if (!isOpen || !bookingData) return;
    let active = true;
    setClientError("");
    setLoadError("");

    // Khởi tạo số lượng từ bookingData hiện tại
    const initQty = {};
    (bookingData.selectedItems || []).forEach((item) => {
      const key = item.line_key || item.inventory_id || `${item.service_id}:${item.ticket_type_id}:${bookingData.checkInDate}`;
      initQty[key] = item.quantity || 1;
    });
    setQuantities(initQty);

    setLoading(true);
    facilityApi
      .getTicketAvailability(bookingData.facilityId, bookingData.checkInDate)
      .then((res) => {
        if (!active) return;
        const availServices = Array.isArray(res.data) ? res.data : [];
        const opts = [];
        availServices.forEach((s) => {
          if (bookingData.serviceId && s._id !== bookingData.serviceId) return;
          (s.ticket_types || []).forEach((t) => {
            const list = attractionTicketOptions(s, t, bookingData.checkInDate, true);
            list.forEach((opt) => {
              opts.push({
                ...opt,
                ticket_name: t.name,
                service_name: s.name,
                age_label: ageLabel(t),
                description: t.description,
                conditions: t.conditions,
              });
            });
          });
        });

        // Fallback nếu không có cấu hình từ API
        if (opts.length === 0 && (bookingData.selectedItems || []).length > 0) {
          bookingData.selectedItems.forEach((item) => {
            opts.push({
              line_key: item.line_key || item.inventory_id,
              service_id: item.service_id,
              ticket_type_id: item.ticket_type_id,
              ticket_name: item.ticket_name,
              price: item.price ?? item.unit_price ?? 0,
              available_qty: 30,
              visit_date: item.visit_date || bookingData.checkInDate,
              time_slot: item.time_slot || "ALL_DAY",
              age_label: "",
            });
          });
        }
        setTicketOptions(opts);
      })
      .catch((err) => {
        if (!active) return;
        const fallbackOpts = (bookingData.selectedItems || []).map((item) => ({
          line_key: item.line_key || item.inventory_id,
          service_id: item.service_id,
          ticket_type_id: item.ticket_type_id,
          ticket_name: item.ticket_name,
          price: item.price ?? item.unit_price ?? 0,
          available_qty: 30,
          visit_date: item.visit_date || bookingData.checkInDate,
          time_slot: item.time_slot || "ALL_DAY",
          age_label: "",
        }));
        setTicketOptions(fallbackOpts);
        setLoadError(err.message || "Không thể tải danh sách vé mới nhất.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, bookingData]);

  if (!isOpen || !bookingData) return null;

  const totalTickets = Object.values(quantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
  const newTotal = ticketOptions.reduce((sum, opt) => {
    const q = Number(quantities[opt.line_key]) || 0;
    return sum + (opt.price || 0) * q;
  }, 0);

  const handleUpdateQty = (key, qty) => {
    setClientError("");
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, qty),
    }));
  };

  const handleConfirm = () => {
    if (totalTickets < 1) {
      setClientError("Vui lòng chọn ít nhất 1 vé.");
      return;
    }
    if (totalTickets > 30) {
      setClientError("Số lượng vé đặt trực tuyến tối đa là 30 vé. Vui lòng liên hệ hotline với đoàn lớn hơn!");
      return;
    }

    let hasChildTicket = false;
    let hasAdultTicket = false;
    ticketOptions.forEach((opt) => {
      const q = Number(quantities[opt.line_key]) || 0;
      if (q > 0) {
        const name = (opt.ticket_name || "").toLowerCase();
        if (name.includes("trẻ em") || name.includes("child") || name.includes("em bé") || name.includes("bé")) {
          hasChildTicket = true;
        } else {
          hasAdultTicket = true;
        }
      }
    });

    if (hasChildTicket && !hasAdultTicket) {
      setClientError("Trẻ em cần ít nhất 1 vé người lớn đi cùng tại khu vui chơi!");
      return;
    }

    const selectedItems = ticketOptions
      .filter((opt) => (Number(quantities[opt.line_key]) || 0) > 0)
      .map((opt) => ({
        line_key: opt.line_key,
        ticket_name: opt.ticket_name,
        ...(opt.inventory_id
          ? { inventory_id: opt.inventory_id }
          : {
              service_id: opt.service_id,
              ticket_type_id: opt.ticket_type_id,
              visit_date: opt.visit_date || bookingData.checkInDate,
              time_slot: opt.time_slot || "ALL_DAY",
            }),
        quantity: Number(quantities[opt.line_key]),
        price: opt.price,
        time_slot: opt.time_slot || "ALL_DAY",
      }));

    onSave({ selectedItems, totalTickets, totalAmount: newTotal });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <IconTicket size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-900">
                Thay đổi số lượng vé tham quan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {bookingData.facilityName} &bull; Ngày: {formatDateVN(bookingData.checkInDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <div className="animate-spin text-2xl mb-2">⏳</div>
            <span>Đang tải các hạng vé khả dụng...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl bg-slate-50/50 p-3 sm:p-4">
              {ticketOptions.map((opt) => {
                const qty = Number(quantities[opt.line_key]) || 0;
                const availQty = opt.available_qty ?? 30;
                const isSoldOut = availQty <= 0;

                return (
                  <div key={opt.line_key} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm">{opt.ticket_name}</div>
                        {opt.age_label && opt.age_label !== "Mọi độ tuổi" && (
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">{opt.age_label}</div>
                        )}
                        <div className="text-sm font-extrabold text-primary-700 mt-1">
                          {opt.price === 0 ? "0 đ (Miễn phí)" : formatVND(opt.price)}
                        </div>
                        {isSoldOut && (
                          <span className="text-xs text-rose-500 font-semibold block mt-0.5">
                            Hết vé ngày này
                          </span>
                        )}
                        {!isSoldOut && availQty < 10 && (
                          <span className="text-xs text-amber-600 font-medium block mt-0.5">
                            Chỉ còn {availQty} vé
                          </span>
                        )}
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={qty <= 0 || updating}
                          onClick={() => handleUpdateQty(opt.line_key, qty - 1)}
                          className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition select-none"
                        >
                          <IconMinus size={14} />
                        </button>
                        <span className="w-8 text-center font-bold text-base text-slate-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={isSoldOut || qty >= Math.min(availQty, 30) || totalTickets >= 30 || updating}
                          onClick={() => handleUpdateQty(opt.line_key, qty + 1)}
                          className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition select-none"
                        >
                          <IconPlus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error alerts */}
            {(clientError || error || loadError) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <IconAlertTriangle size={15} className="shrink-0" />
                <span>{clientError || error || loadError}</span>
              </div>
            )}

            {/* Tạm tính chi phí mới */}
            <div className="p-3.5 bg-primary-50/50 border border-primary-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-600 block">Tạm tính giá vé mới:</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Tổng cộng: {totalTickets} vé
                </span>
              </div>
              <div className="font-heading font-extrabold text-lg text-primary-700">
                {formatVND(newTotal)}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={loading || updating || totalTickets < 1}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2"
          >
            {updating ? (
              <>
                <span className="animate-spin text-white">⏳</span>
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <span>Xác nhận & Cập nhật</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TravelVoucherModal({
  isOpen,
  onClose,
  promotions = [],
  appliedCode = "",
  onSelectPromo,
  onRemovePromo,
  orderTotal = 0,
  isAttraction = false,
  isNewUser = true,
  promoError = "",
  onApplyManualCode,
}) {
  const [manualCode, setManualCode] = useState("");
  const [selectedCode, setSelectedCode] = useState(appliedCode);
  const [validationAlert, setValidationAlert] = useState("");
  const [detailVoucher, setDetailVoucher] = useState(null);

  useEffect(() => {
    setSelectedCode(appliedCode);
  }, [appliedCode, isOpen]);

  const currentService = isAttraction ? "ATTRACTION" : "HOTEL";

  const validateVoucher = (p) => {
    if (!p) return { isValid: false, reason: "Mã không hợp lệ" };
    const now = new Date();

    // 1. Service type check (DB field: applicable_service or voucher_type)
    const service =
      p.applicable_service ||
      (p.voucher_type === "HOTEL"
        ? "HOTEL"
        : p.voucher_type === "ATTRACTION"
        ? "ATTRACTION"
        : "ALL");

    if (service !== "ALL" && service !== currentService) {
      return {
        isValid: false,
        code: "SERVICE_MISMATCH",
        reason:
          service === "HOTEL"
            ? "Chỉ áp dụng khi đặt phòng Khách sạn"
            : "Chỉ áp dụng cho Vé khu vui chơi & Tham quan",
      };
    }

    // 2. Minimum order amount check (DB field: min_order_amount)
    const minOrder = Number(p.min_order_amount || 0);
    if (orderTotal < minOrder) {
      const needed = minOrder - orderTotal;
      return {
        isValid: false,
        code: "MIN_ORDER",
        reason: `Đơn tối thiểu ${formatVND(minOrder)} (Bạn còn thiếu ${formatVND(needed)})`,
        needed,
      };
    }

    // 3. Time validity (DB fields: valid_from, valid_to)
    if (p.valid_from && new Date(p.valid_from) > now) {
      return {
        isValid: false,
        code: "NOT_STARTED",
        reason: `Chưa đến thời gian áp dụng (Bắt đầu từ ${formatDateShort(p.valid_from)})`,
      };
    }

    if (p.valid_to) {
      const expDate = new Date(p.valid_to);
      if (expDate.getUTCHours() === 0 && expDate.getUTCMinutes() === 0 && expDate.getUTCSeconds() === 0) {
        expDate.setUTCHours(23, 59, 59, 999);
      }
      if (expDate < now) {
        return {
          isValid: false,
          code: "EXPIRED",
          reason: `Voucher đã hết hạn sử dụng vào ngày ${formatDateShort(p.valid_to)}`,
        };
      }
    }

    // 4. Global usage limit (DB fields: usage_limit, used_count)
    if (p.usage_limit != null && (p.used_count || 0) >= p.usage_limit) {
      return {
        isValid: false,
        code: "USAGE_LIMIT_EXCEEDED",
        reason: "Voucher đã hết lượt sử dụng trên hệ thống",
      };
    }

    // 5. Target audience check (DB field: target_audience)
    if (
      (p.target_audience === "NEW_USER" || p.voucher_type === "NEW_USER") &&
      isNewUser === false
    ) {
      return {
        isValid: false,
        code: "NOT_NEW_USER",
        reason: "Bạn đã sử dụng mã ưu đãi chào mừng khách hàng mới",
      };
    }

    if (
      (p.target_audience === "LOYALTY_POINT" ||
        (p.points_cost && p.points_cost > 0)) &&
      !p.user_id
    ) {
      return {
        isValid: false,
        code: "REQUIRES_REDEEM",
        reason: "Voucher cần đổi điểm thưởng trước khi sử dụng",
      };
    }

    // Calculate estimated savings from real DB values
    let estimatedDiscount =
      p.discount_type === "PERCENTAGE"
        ? Math.round((orderTotal * Number(p.discount_value)) / 100)
        : Number(p.discount_value);
    if (p.max_discount != null && p.max_discount > 0) {
      estimatedDiscount = Math.min(estimatedDiscount, p.max_discount);
    }
    estimatedDiscount = Math.min(estimatedDiscount, orderTotal);

    return {
      isValid: true,
      estimatedDiscount,
    };
  };

  const { eligibleList, ineligibleList } = useMemo(() => {
    const eligible = [];
    const ineligible = [];

    (promotions || []).forEach((p) => {
      const validation = validateVoucher(p);
      if (validation.isValid) {
        eligible.push({ ...p, validation });
      } else {
        ineligible.push({ ...p, validation });
      }
    });

    return { eligibleList: eligible, ineligibleList: ineligible };
  }, [promotions, orderTotal, currentService, isNewUser]);

  if (!isOpen) return null;

  const handleSelectEligible = (code) => {
    setValidationAlert("");
    setSelectedCode(code);
  };

  const handleIneligibleClick = (p, validation) => {
    setValidationAlert(`Không thể áp dụng mã [${p.code}]: ${validation.reason}`);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setValidationAlert("");

    const found = (promotions || []).find((p) => p.code?.toUpperCase() === code);

    if (found) {
      const validation = validateVoucher(found);
      if (validation.isValid) {
        setSelectedCode(found.code);
        onSelectPromo(found.code);
        setValidationAlert("");
        setManualCode("");
        onClose();
      } else {
        setValidationAlert(`Không thể áp dụng mã [${found.code}]: ${validation.reason}`);
      }
    } else {
      setSelectedCode(code);
      onApplyManualCode?.(code);
      setManualCode("");
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedCode && selectedCode !== appliedCode) {
      const found = (promotions || []).find((p) => p.code === selectedCode);
      if (found) {
        const val = validateVoucher(found);
        if (!val.isValid) {
          setValidationAlert(`Voucher không hợp lệ: ${val.reason}`);
          return;
        }
      }
      onSelectPromo(selectedCode);
    } else if (!selectedCode && appliedCode) {
      onRemovePromo();
    }
    onClose();
  };

  const selectedValidation = selectedCode
    ? validateVoucher((promotions || []).find((p) => p.code === selectedCode))
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* HEADER (TRAVEL BRANDING) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-primary-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-xs">
              {isAttraction ? <IconTicket size={20} /> : <IconHotel size={20} />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <span>Ưu đãi & Voucher Du lịch</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                  Travelio
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isAttraction
                  ? "Áp dụng cho Vé khu vui chơi & Tham quan"
                  : "Áp dụng cho Đặt phòng Khách sạn & Resort"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition cursor-pointer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* MANUAL INPUT FORM & VALIDATION ALERT */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã voucher du lịch..."
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value.toUpperCase());
                if (validationAlert) setValidationAlert("");
              }}
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Áp dụng
            </button>
          </form>

          {/* INSTANT VALIDATION ERROR BANNER */}
          {(validationAlert || promoError) && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <IconAlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-500" />
              <div className="font-medium leading-relaxed">
                {validationAlert || promoError}
              </div>
            </div>
          )}
        </div>

        {/* VOUCHER LIST (TRAVEL PASS / COUPON STYLE) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/70">
          {/* SECTION 1: ELIGIBLE VOUCHERS */}
          <div>
            <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <span>Voucher có thể áp dụng</span>
              </span>
              <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                {eligibleList.length} mã khả dụng
              </span>
            </div>

            {eligibleList.length === 0 ? (
              <div className="text-center py-7 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <IconTicket size={20} />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Hiện không có mã giảm giá nào phù hợp với đơn đặt này.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {eligibleList.map((p) => {
                  const isChecked = selectedCode === p.code;
                  const isHotel =
                    p.applicable_service === "HOTEL" ||
                    p.voucher_type === "HOTEL";
                  const isAtt =
                    p.applicable_service === "ATTRACTION" ||
                    p.voucher_type === "ATTRACTION";
                  const serviceLabel = isHotel
                    ? "Khách sạn"
                    : isAtt
                    ? "Vé vui chơi"
                    : "Toàn sàn";

                  return (
                    <div
                      key={p._id || p.code}
                      onClick={() => handleSelectEligible(p.code)}
                      className={`relative flex rounded-xl border transition-all cursor-pointer bg-white overflow-hidden shadow-xs hover:shadow-md ${
                        isChecked
                          ? "border-primary-500 ring-2 ring-primary-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* TICKET STUB (TRAVEL THEMED OCEAN BLUE) */}
                      <div className="w-24 sm:w-28 bg-gradient-to-br from-primary-600 via-sky-600 to-primary-700 p-2.5 flex flex-col items-center justify-center text-white shrink-0 relative border-r border-dashed border-sky-300">
                        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />

                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-1">
                          {isHotel ? (
                            <IconHotel size={13} className="text-white" />
                          ) : (
                            <IconTicket size={13} className="text-white" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100">
                          {serviceLabel}
                        </span>
                        <span className="text-xs font-black tracking-tight mt-0.5 text-center">
                          {p.discount_type === "PERCENTAGE"
                            ? `${p.discount_value}%`
                            : formatVND(p.discount_value)}
                        </span>
                      </div>

                      {/* TICKET CONTENT */}
                      <div className="flex-1 p-3 pl-4 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-primary-900 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                              {p.code}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Đủ điều kiện
                            </span>
                          </div>

                          <div className="text-xs text-slate-800 font-semibold">
                            Giảm{" "}
                            {p.discount_type === "PERCENTAGE"
                              ? `${p.discount_value}%`
                              : formatVND(p.discount_value)}
                            {p.discount_type === "PERCENTAGE" &&
                              p.max_discount > 0 &&
                              ` (Tối đa ${formatVND(p.max_discount)})`}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            Đơn tối thiểu:{" "}
                            <span className="font-semibold text-slate-700">
                              {p.min_order_amount > 0
                                ? formatVND(p.min_order_amount)
                                : "0 ₫"}
                            </span>
                          </div>

                          {/* ESTIMATED SAVINGS */}
                          {p.validation?.estimatedDiscount > 0 && (
                            <div className="text-[11px] font-semibold text-primary-600">
                              Tiết kiệm: -{formatVND(p.validation.estimatedDiscount)}
                            </div>
                          )}

                          {/* TIME & DETAIL LINK */}
                          <div className="flex items-center gap-3 pt-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <IconClock size={12} className="text-slate-400" />
                              <span>HSD: {formatDateShort(p.valid_to)}</span>
                              {isNearExpiry(p.valid_to) && (
                                <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded text-[10px]">
                                  Sắp hết hạn
                                </span>
                              )}
                            </div>

                            {/* DETAIL BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailVoucher(p);
                              }}
                              className="text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                            >
                              <span>Điều kiện</span>
                              <IconChevronRight size={11} />
                            </button>
                          </div>
                        </div>

                        {/* RADIO SELECT BUTTON */}
                        <div className="shrink-0 pl-2">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isChecked
                                ? "border-primary-600 bg-primary-600 text-white shadow-xs"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <IconCheck size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: INELIGIBLE VOUCHERS */}
          {ineligibleList.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-500 mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Chưa đủ điều kiện sử dụng</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {ineligibleList.length} mã
                </span>
              </div>

              <div className="space-y-3">
                {ineligibleList.map((p) => {
                  return (
                    <div
                      key={p._id || p.code}
                      onClick={() => handleIneligibleClick(p, p.validation)}
                      className="relative flex rounded-xl border border-slate-200 bg-white/70 overflow-hidden shadow-2xs opacity-75 hover:opacity-100 transition cursor-not-allowed group"
                    >
                      {/* Left Stub (Muted Slate) */}
                      <div className="w-24 sm:w-28 bg-slate-300 p-2.5 flex flex-col items-center justify-center text-white shrink-0 relative border-r border-dashed border-slate-300">
                        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
                        <IconTicket size={18} className="mb-1 opacity-70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-100">
                          VOUCHER
                        </span>
                        <span className="text-xs font-bold text-slate-100 mt-0.5">
                          {p.discount_type === "PERCENTAGE"
                            ? `${p.discount_value}%`
                            : formatVND(p.discount_value)}
                        </span>
                      </div>

                      {/* Right Body */}
                      <div className="flex-1 p-3 pl-4 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {p.code}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Chưa đủ điều kiện
                            </span>
                          </div>

                          <div className="text-xs text-slate-600">
                            Giảm{" "}
                            {p.discount_type === "PERCENTAGE"
                              ? `${p.discount_value}%`
                              : formatVND(p.discount_value)}
                          </div>

                          {/* REASON WHY INELIGIBLE */}
                          <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                            <IconAlertTriangle size={12} className="shrink-0" />
                            <span>{p.validation.reason}</span>
                          </div>

                          <div className="flex items-center gap-3 pt-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <IconClock size={12} />
                              <span>HSD: {formatDateShort(p.valid_to)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailVoucher(p);
                              }}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                            >
                              <span>Điều kiện</span>
                              <IconChevronRight size={11} />
                            </button>
                          </div>
                        </div>

                        <div className="w-5 h-5 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 text-[10px]">
                          <X size="1em" className="inline-block align-[-0.125em] shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          {appliedCode ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCode("");
                onRemovePromo();
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Bỏ chọn mã hiện tại
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              {selectedCode ? (
                <span>
                  Đang chọn:{" "}
                  <strong className="text-primary-700 font-mono font-bold">
                    {selectedCode}
                  </strong>
                </span>
              ) : (
                "Chưa chọn mã nào"
              )}
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={Boolean(
                selectedCode && selectedValidation && !selectedValidation.isValid
              )}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đồng ý
            </button>
          </div>
        </div>
      </div>

      {/* VOUCHER DETAIL MODAL (XEM CHI TIẾT ĐIỀU KIỆN & THỂ LỆ TỪ DB) */}
      {detailVoucher && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Detail Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-primary-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-xs">
                  {detailVoucher.applicable_service === "HOTEL" ? (
                    <IconHotel size={16} />
                  ) : (
                    <IconTicket size={16} />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Chi tiết điều kiện Voucher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailVoucher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Modal Detail Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Voucher Code & Discount Highlight Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-sky-50 border border-primary-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-base font-black text-primary-900">
                    {detailVoucher.code}
                  </div>
                  <div className="text-xs text-primary-700 font-bold mt-0.5">
                    Giảm{" "}
                    {detailVoucher.discount_type === "PERCENTAGE"
                      ? `${detailVoucher.discount_value}%`
                      : formatVND(detailVoucher.discount_value)}
                    {detailVoucher.discount_type === "PERCENTAGE" &&
                      detailVoucher.max_discount > 0 &&
                      ` (Tối đa ${formatVND(detailVoucher.max_discount)})`}
                  </div>
                </div>
                <div className="text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-white text-primary-800 border border-primary-200 shadow-2xs">
                  {detailVoucher.applicable_service === "HOTEL"
                    ? "Khách sạn"
                    : detailVoucher.applicable_service === "ATTRACTION"
                    ? "Khu vui chơi"
                    : "Toàn sàn"}
                </div>
              </div>

              {/* Title & Description */}
              {detailVoucher.title && (
                <div>
                  <div className="font-bold text-slate-800 text-xs mb-0.5">
                    Tên chương trình
                  </div>
                  <div className="text-slate-600">{detailVoucher.title}</div>
                </div>
              )}

              {/* Conditions List */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Đơn hàng tối thiểu:</span>
                  <span className="font-bold text-slate-800">
                    {detailVoucher.min_order_amount > 0
                      ? formatVND(detailVoucher.min_order_amount)
                      : "Không giới hạn"}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Giảm tối đa (Trần):</span>
                  <span className="font-bold text-slate-800">
                    {detailVoucher.discount_type === "PERCENTAGE"
                      ? detailVoucher.max_discount
                        ? formatVND(detailVoucher.max_discount)
                        : "Không giới hạn"
                      : "Đã cố định theo mệnh giá"}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Phạm vi dịch vụ:</span>
                  <span className="font-bold text-primary-700">
                    {detailVoucher.applicable_service === "HOTEL"
                      ? "Chỉ áp dụng phòng Khách sạn"
                      : detailVoucher.applicable_service === "ATTRACTION"
                      ? "Chỉ áp dụng Vé khu vui chơi"
                      : "Áp dụng toàn sàn Travelio"}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Đối tượng áp dụng:</span>
                  <span className="font-bold text-slate-800">
                    {detailVoucher.target_audience === "NEW_USER"
                      ? "Khách hàng mới (đơn đầu tiên)"
                      : detailVoucher.target_audience === "LOYALTY_POINT"
                      ? `Hội viên đổi ${detailVoucher.points_cost || 0} điểm`
                      : "Tất cả khách hàng"}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Thời gian hiệu lực:</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {detailVoucher.valid_from ? formatDateShort(detailVoucher.valid_from) : "Hôm nay"} -{" "}
                    {formatDateShort(detailVoucher.valid_to)}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Số lượt sử dụng:</span>
                  <span className="font-semibold text-slate-700">
                    {detailVoucher.usage_limit_per_user || 1} lượt / mỗi khách
                  </span>
                </div>
              </div>

              {/* Terms of Use */}
              <div className="pt-3 border-t border-slate-100">
                <div className="font-bold text-slate-800 mb-1">
                  Điều khoản & Lưu ý sử dụng
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
                  <p>
                    • {detailVoucher.description || "Mã giảm giá áp dụng trực tiếp cho các đơn đặt chỗ trên nền tảng Travelio."}
                  </p>
                  <p>• Mã không có giá trị quy đổi thành tiền mặt hoặc chuyển nhượng.</p>
                  <p>• Mỗi đơn đặt phòng / vé chỉ được áp dụng tối đa 01 mã voucher.</p>
                </div>
              </div>
            </div>

            {/* Modal Detail Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDetailVoucher(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Quay lại
              </button>

              {validateVoucher(detailVoucher).isValid && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectEligible(detailVoucher.code);
                    setDetailVoucher(null);
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Áp dụng mã này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
