import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PartnerRegistrationModal from "../components/PartnerRegistrationModal";
import Footer from "../components/Footer";
import AgodaDatePicker from "../components/common/AgodaDatePicker";
import AgodaRoomGuestPicker from "../components/common/AgodaRoomGuestPicker";
import DestinationAutocomplete from "../components/common/DestinationAutocomplete";
import {
  IconSearch,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconHotel,
  IconTicket,
  IconPackage,
  IconQR,
  IconArrowRight,
  IconStar,
  IconZap,
  IconShield,
  IconPlus,
  IconMinus,
  IconCheck,
  IconX,
} from "../components/Icons";
import { facilityApi } from "../services/api/facilityApi";

function StarRating({ rating = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          size={12}
          filled={i <= Math.floor(rating)}
          className="text-warning-500"
        />
      ))}
    </div>
  );
}

const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 ₫";
  return `${Number(amount).toLocaleString("vi-VN")} ₫`;
};

const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFutureISO = (daysAhead = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};


export default function HomeScreen({
  onNavigate,
  onSignIn,
  onRegister,
  onProfile,
  currentUser,
  onSignOut,
}) {
  const navigate = useNavigate();
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [activeTab, setActiveTab] = useState("stays");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState(getTodayISO());
  const [checkOut, setCheckOut] = useState(getFutureISO(2));

  // Room & Guest states (Agoda style)
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState([]);

  // Auto-advance popover states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRoomGuestOpen, setIsRoomGuestOpen] = useState(false);

  const [destinationError, setDestinationError] = useState("");
  const destinationInputRef = useRef(null);

  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  // Real DB data states
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [featuredAttractions, setFeaturedAttractions] = useState([]);
  const [loadingDB, setLoadingDB] = useState(true);

  // Fetch real facilities from MongoDB Atlas
  useEffect(() => {
    let active = true;
    setLoadingDB(true);

    Promise.all([
      facilityApi.getFacilities({ type: "HOTEL", limit: 3 }),
      facilityApi.getFacilities({ type: "ATTRACTION", limit: 4 }),
    ])
      .then(([hotelsRes, attractionsRes]) => {
        if (!active) return;
        if (hotelsRes && hotelsRes.success) {
          setFeaturedHotels(hotelsRes.data || []);
        }
        if (attractionsRes && attractionsRes.success) {
          setFeaturedAttractions(attractionsRes.data || []);
        }
      })
      .catch((err) => {
        console.warn("Lỗi khi tải dữ liệu từ database:", err);
      })
      .finally(() => {
        if (active) setLoadingDB(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (customParams = {}) => {
    const kw =
      customParams.keyword !== undefined ? customParams.keyword : destination;
    const trimmedKw = (kw || "").trim();

    // 1. Destination / Keyword validation
    if (!trimmedKw) {
      const msg =
        activeTab === "stays"
          ? "Vui lòng nhập điểm đến hoặc tên khách sạn!"
          : activeTab === "attractions"
            ? "Vui lòng nhập thành phố hoặc tên khu vui chơi!"
            : "Vui lòng nhập điểm đến du lịch!";
      setDestinationError(msg);
      destinationInputRef.current?.focus();
      return;
    }

    // 2. Date validation
    const today = getTodayISO();
    if (checkIn && checkIn < today) {
      setDestinationError("Ngày nhận phòng / sử dụng vé không được là ngày trong quá khứ!");
      setIsCalendarOpen(true);
      return;
    }

    if (activeTab === "stays") {
      if (!checkOut) {
        setDestinationError("Vui lòng chọn ngày trả phòng khách sạn!");
        setIsCalendarOpen(true);
        return;
      }
      if (checkOut <= checkIn) {
        setDestinationError("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!");
        setIsCalendarOpen(true);
        return;
      }
      const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
      if (nights > 30) {
        setDestinationError("Hệ thống chỉ hỗ trợ đặt phòng tối đa 30 đêm cho mỗi lượt đặt.");
        setIsCalendarOpen(true);
        return;
      }

      // 3. Room & Guests validation for hotel
      const currentRooms = customParams.rooms || rooms;
      const currentAdults = customParams.adults || adults;
      if (currentAdults < 1) {
        setDestinationError("Cần ít nhất 1 người lớn để đặt phòng khách sạn!");
        setIsRoomGuestOpen(true);
        return;
      }
      if (currentRooms > currentAdults) {
        setDestinationError(`Không thể đặt ${currentRooms} phòng cho ${currentAdults} người lớn. Mỗi phòng bắt buộc cần ít nhất 1 người lớn bảo hộ!`);
        setIsRoomGuestOpen(true);
        return;
      }
    } else {
      // Attraction ticket validation
      const currentAdults = customParams.adults !== undefined ? customParams.adults : adults;
      const currentChildren = customParams.childrenCount !== undefined ? customParams.childrenCount : childrenCount;
      if (currentAdults < 1 && currentChildren > 0) {
        setDestinationError("Trẻ em cần ít nhất 1 người lớn đi cùng để tham gia khu vui chơi!");
        setIsRoomGuestOpen(true);
        return;
      }
      if (currentAdults + currentChildren < 1) {
        setDestinationError("Vui lòng chọn ít nhất 1 vé tham quan!");
        setIsRoomGuestOpen(true);
        return;
      }
      if (currentAdults + currentChildren > 30) {
        setDestinationError("Đơn đặt trực tuyến tối đa 30 vé. Với đoàn đông hơn, vui lòng liên hệ hotline!");
        setIsRoomGuestOpen(true);
        return;
      }
    }

    setDestinationError("");
    setIsCalendarOpen(false);
    setIsRoomGuestOpen(false);

    const totalGuests = (customParams.adults || adults) + (customParams.childrenCount !== undefined ? customParams.childrenCount : childrenCount);

    const params = {
      keyword: trimmedKw,
      type:
        activeTab === "stays"
          ? "HOTEL"
          : activeTab === "attractions"
            ? "ATTRACTION"
            : "",
      checkIn,
      checkOut: activeTab === "attractions" ? "" : checkOut,
      guests: totalGuests || 1,
      rooms: activeTab === "stays" ? (customParams.rooms || rooms) : 1,
      adults: customParams.adults || adults,
      children: customParams.childrenCount !== undefined ? customParams.childrenCount : childrenCount,
      ...customParams,
    };
    onNavigate?.(2, params);
  };

  return (
    <div className="min-h-screen bg-bg-default font-body text-slate-800">
      {/* Hero Search Section - Vibrant Tropical Travel Theme */}
      <section className="relative min-h-[620px] overflow-visible flex items-center justify-center py-16 sm:py-20">
        {/* Background Image: Sunny Tropical Paradise Beach & Resort */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85&auto=format&fit=crop"
          alt="Sunny tropical beach paradise"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Radiant, sunny contrast overlay - keeps the blue ocean & sunshine vivid while ensuring high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/30 to-slate-900/70" />

        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 py-4 flex flex-col items-center">
          {/* Hero Header Content */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-amber-300 font-extrabold text-xs uppercase tracking-wider mb-4 shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400" />
              <span>Khám phá kỳ nghỉ mơ ước &bull; Đặt phòng & Vé vui chơi</span>
            </div>

            <h1 className="font-heading font-black text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.15] max-w-3xl mx-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] tracking-tight">
              Khám phá - Đặt chỗ - Trải nghiệm  
            </h1>

            <p className="text-white/95 mt-3 text-base sm:text-lg max-w-2xl mx-auto font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-relaxed">
              Khám phá kỳ nghỉ mơ ước và đặt vé giải trí dễ dàng.
            </p>
          </div>

          {/* Search Widget Card - Pure White, Elevated 3D Shadow */}
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] w-full overflow-visible border border-slate-100 ring-4 ring-white/20 relative">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/80 rounded-t-3xl overflow-hidden p-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("stays");
                  if (!checkOut) setCheckOut(getFutureISO(2));
                  setDestinationError("");
                  setIsCalendarOpen(false);
                  setIsRoomGuestOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === "stays"
                    ? "bg-white text-primary-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <IconHotel size={18} className={activeTab === "stays" ? "text-primary-500" : "text-slate-400"} />
                <span>Chỗ nghỉ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("attractions");
                  setCheckOut("");
                  setDestinationError("");
                  setIsCalendarOpen(false);
                  setIsRoomGuestOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === "attractions"
                    ? "bg-white text-primary-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <IconTicket size={18} className={activeTab === "attractions" ? "text-primary-500" : "text-slate-400"} />
                <span>Vé vui chơi</span>
              </button>
            </div>

            {/* Form */}
            <div className="p-5 sm:p-6 bg-white rounded-b-3xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                {/* 1. Destination Input */}
                <div className="md:col-span-5">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    {activeTab === "stays"
                      ? "Điểm đến hoặc khách sạn"
                      : "Thành phố hoặc khu vui chơi"}
                  </label>
                  <DestinationAutocomplete
                    value={destination}
                    onChange={(val) => {
                      setDestination(val);
                      if (destinationError) setDestinationError("");
                    }}
                    onSelect={(item) => {
                      setDestination(item.name);
                      if (destinationError) setDestinationError("");
                      // Auto-advance to Step 2: Open Calendar
                      setIsCalendarOpen(true);
                      setIsRoomGuestOpen(false);
                    }}
                    onEnterPress={() => handleSearch()}
                    placeholder={
                      activeTab === "stays"
                        ? "Phú Quốc, Đà Nẵng, Vinpearl..."
                        : "Bà Nà Hills, VinWonders, Sun World..."
                    }
                    error={destinationError}
                    activeTab={activeTab}
                    inputRef={destinationInputRef}
                  />
                  {destinationError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mt-1.5 animate-bounce-subtle">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-rose-500 flex-shrink-0"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{destinationError}</span>
                    </div>
                  )}
                </div>

                {/* 2. Date Picker (Agoda Style) */}
                <div className="md:col-span-4 relative">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    {activeTab === "attractions" ? "Ngày sử dụng" : "Thời gian lưu trú"}
                  </label>
                  <div
                    onClick={() => {
                      setIsCalendarOpen(!isCalendarOpen);
                      setIsRoomGuestOpen(false);
                    }}
                    className={`cursor-pointer bg-slate-50 hover:bg-slate-100/70 border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition ${
                      isCalendarOpen ? "border-primary-500 ring-4 ring-primary-100 bg-white" : "border-slate-200 hover:border-primary-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconCalendar size={18} className="text-primary-500 flex-shrink-0" />
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {activeTab === "attractions" ? (
                          formatDateVN(checkIn) || "Chọn ngày"
                        ) : (
                          <span>
                            {formatDateVN(checkIn)} <span className="text-slate-400 font-normal">→</span> {formatDateVN(checkOut)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary-600 whitespace-nowrap bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                      {activeTab === "attractions"
                        ? "1 ngày"
                        : `${Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))} đêm`}
                    </span>
                  </div>

                  {/* Agoda Calendar Popover */}
                  <AgodaDatePicker
                    isOpen={isCalendarOpen}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    singleDateMode={activeTab === "attractions"}
                    onChange={(dates) => {
                      if (dates.checkIn) setCheckIn(dates.checkIn);
                      if (dates.checkOut !== undefined) setCheckOut(dates.checkOut);
                    }}
                    onComplete={() => {
                      // Auto-advance to Step 3: Open Room/Guest picker
                      setIsCalendarOpen(false);
                      setIsRoomGuestOpen(true);
                    }}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                </div>

                {/* 3. Rooms, Guests & Child Ages (Agoda Style Popover) */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    {activeTab === "attractions" ? "Số vé tham quan" : "Phòng & Số khách"}
                  </label>
                  <AgodaRoomGuestPicker
                    isOpen={isRoomGuestOpen}
                    onToggle={() => {
                      setIsRoomGuestOpen(!isRoomGuestOpen);
                      setIsCalendarOpen(false);
                    }}
                    onClose={() => setIsRoomGuestOpen(false)}
                    onDone={() => handleSearch()}
                    rooms={rooms}
                    setRooms={setRooms}
                    adults={adults}
                    setAdults={setAdults}
                    childrenCount={childrenCount}
                    setChildrenCount={setChildrenCount}
                    childrenAges={childrenAges}
                    setChildrenAges={setChildrenAges}
                    activeTab={activeTab}
                  />
                </div>
              </div>

              {/* Submit Button & Quick Suggestions */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-extrabold text-slate-400 mr-1 uppercase tracking-wider">
                    Gợi ý hot:
                  </span>
                  {[
                    { name: "Phú Quốc", icon: "🏝️" },
                    { name: "Đà Nẵng", icon: "🏖️" },
                    { name: "Vinpearl", icon: "🎡" },
                    { name: "Bà Nà Hills", icon: "🏰" },
                    { name: "Nha Trang", icon: "🌴" },
                  ].map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => {
                        setDestination(tag.name);
                        setDestinationError("");
                        handleSearch({ keyword: tag.name });
                      }}
                      className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="w-full sm:w-auto bg-gradient-to-r from-sky-500 via-primary-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold px-9 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
                >
                  <IconSearch size={18} />
                  <span>Tìm kiếm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals (Tiếng Việt) */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-8 py-3 flex items-center justify-center gap-10 text-xs text-text-primary-600 flex-wrap">
          {[
            {
              icon: <IconShield size={14} className="text-success-500" />,
              text: "Bảo đảm đặt chỗ an toàn 100%",
            },
            {
              icon: <IconZap size={14} className="text-warning-500" />,
              text: "Nhận vé QR điện tử tức thì",
            },
            {
              icon: <IconQR size={14} className="text-primary-500" />,
              text: "2.4M+ Lượt vé kích hoạt thành công",
            },
            {
              icon: (
                <IconStar size={14} className="text-secondary-500" filled />
              ),
              text: "4.8/5 Điểm đánh giá dịch vụ",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 font-medium">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-12">
        {/* Curated Packages / Stay + Play Combos (Tiếng Việt & DB Thật) */}
        <div className="mb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-primary-500 font-semibold text-sm uppercase tracking-widest mb-1">
                Gói Ưu Đãi Nổi Bật
              </p>
              <h2 className="font-heading font-700 text-3xl text-text-primary">
                Combo Nghỉ Dưỡng & Vui Chơi
              </h2>
              <p className="text-text-primary-600 mt-1">
                Kết hợp phòng khách sạn và trải nghiệm vui chơi giải trí, tiết kiệm đến 30%
              </p>
            </div>
            <button
              onClick={() => onNavigate?.(2, { type: "HOTEL" })}
              className="flex items-center gap-1.5 text-primary-500 font-semibold text-sm hover:underline cursor-pointer"
            >
              Xem tất cả gói ưu đãi <IconArrowRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingDB ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-[16px] overflow-hidden border border-border animate-pulse"
                >
                  <div className="h-48 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : featuredHotels.length > 0 ? (
              featuredHotels.map((card) => {
                const imgUrl =
                  card.primary_image ||
                  card.images?.[0]?.image_url ||
                  null;
                return (
                  <div
                    key={card._id}
                    className="bg-white rounded-[16px] overflow-hidden border border-border hover:shadow-lg transition-all duration-200 group cursor-pointer"
                    onClick={() => onNavigate?.(3, { id: card._id })}
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={card.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <IconHotel size={32} />
                          <span className="text-[11px] font-medium mt-1">Cơ sở chưa có ảnh</span>
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-secondary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {card.rating >= 4.8 ? "Bán chạy nhất" : "Đánh giá cao"}
                      </span>
                      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-dark/60 to-transparent pointer-events-none" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1 text-xs text-text-primary-600 mb-1.5">
                        <IconMapPin size={12} />
                        {card.city || card.address || "Việt Nam"}
                      </div>
                      <h3 className="font-heading font-700 text-text-primary text-base leading-snug mb-1 line-clamp-1">
                        {card.name}
                      </h3>
                      <p className="text-xs text-text-primary-600 mb-2 line-clamp-1">
                        {card.address || "Khu nghỉ dưỡng sang trọng"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {card.amenities && card.amenities.length > 0 ? (
                          card.amenities.slice(0, 2).map((a, i) => (
                            <span
                              key={i}
                              className="bg-primary-50 text-primary-600 text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1"
                            >
                              <IconTicket size={10} /> {a.name || "Dịch vụ 5 sao"}
                            </span>
                          ))
                        ) : (
                          <span className="bg-primary-50 text-primary-600 text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                            <IconTicket size={10} /> Trọn gói nghỉ dưỡng + Tiện ích
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={card.rating || 4.8} />
                          <span className="text-xs font-semibold text-text-primary">
                            {card.rating || 4.8}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-heading font-700 text-primary-500 text-lg">
                            {formatVND(card.min_price)}
                          </div>
                          <div className="text-[10px] text-text-primary-400">
                            mỗi đêm
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>

        {/* Trending Activities (Tiếng Việt & DB Thật) */}
        <div className="mb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-secondary-500 font-semibold text-sm uppercase tracking-widest mb-1">
                Xu Hướng Hiện Tại
              </p>
              <h2 className="font-heading font-700 text-3xl text-text-primary">
                Hoạt Động & Vé Vui Chơi Nổi Bật
              </h2>
            </div>
            <button
              onClick={() => onNavigate?.(2, { type: "ATTRACTION" })}
              className="flex items-center gap-1.5 text-primary-500 font-semibold text-sm hover:underline cursor-pointer"
            >
              Xem tất cả <IconArrowRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {loadingDB ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-[12px] overflow-hidden border border-border animate-pulse"
                >
                  <div className="h-40 bg-slate-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : featuredAttractions.length > 0 ? (
              featuredAttractions.map((act) => {
                const imgUrl =
                  act.primary_image ||
                  act.images?.[0]?.image_url ||
                  null;
                return (
                  <div
                    key={act._id}
                    className="bg-white rounded-[12px] overflow-hidden border border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
                    onClick={() => onNavigate?.(3, { id: act._id })}
                  >
                    <div className="relative h-40 overflow-hidden bg-slate-100 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={act.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <IconTicket size={30} />
                          <span className="text-[11px] font-medium mt-1">Chưa có ảnh</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-success-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        <IconQR size={10} /> Vé QR tức thì
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1 text-[11px] text-text-primary-400 mb-1">
                        <IconMapPin size={11} />
                        {act.city || act.address || "Việt Nam"}
                      </div>
                      <h3 className="font-heading font-600 text-sm text-text-primary leading-snug mb-2 line-clamp-1">
                        {act.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <StarRating rating={act.rating || 4.8} />
                          <span className="text-[11px] text-text-primary-400 ml-1">
                            {act.rating || 4.8}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-text-primary-400 font-medium">
                            Giá vé từ
                          </div>
                          <div className="font-heading font-700 text-primary-500 text-base">
                            {formatVND(act.min_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>

        {/* Guest Lookup Widget (Tiếng Việt) */}
        <div className="bg-gradient-to-r from-dark to-dark-800 rounded-2xl p-8 flex items-center gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <IconQR size={20} className="text-primary-400" />
              <span className="text-primary-400 font-semibold text-sm uppercase tracking-widest">
                Không cần tài khoản
              </span>
            </div>
            <h2 className="font-heading font-700 text-white text-2xl mb-2">
              Tra Cứu Đơn Đặt Chỗ & Vé QR
            </h2>
            <p className="text-text-primary-400 text-sm">
              Nhập mã đặt chỗ hoặc địa chỉ email để kiểm tra hành trình, vé QR điện tử và hóa đơn — nhanh chóng và tiện lợi.
            </p>
          </div>
          <div className="flex-1 max-w-lg">
            <div className="bg-sidebar-800 rounded-xl p-5 border border-border">
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Mã đơn: TVL-2026-XXXXXX hoặc email"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  className="flex-1 bg-sidebar-700 border border-border text-white placeholder-dark-400 px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLookupResult(
                      lookupCode.length > 5 ? "found" : "not-found",
                    )
                  }
                  className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Tra cứu
                </button>
              </div>
              {lookupResult === "found" && (
                <div className="bg-success-500/10 border border-success-500/30 rounded-lg p-3 flex items-center gap-2 text-success-400 text-sm">
                  <IconCheck size={15} /> Tìm thấy đơn đặt chỗ!{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate?.(5)}
                    className="underline ml-1 cursor-pointer font-bold"
                  >
                    Xem vé & lịch trình →
                  </button>
                </div>
              )}
              {lookupResult === "not-found" && (
                <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3 flex items-center gap-2 text-danger-400 text-sm">
                  <IconX size={15} /> Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã hoặc email.
                </div>
              )}
              <p className="text-text-primary-500 text-xs mt-2 text-center">
                Hoặc nhập địa chỉ email đã sử dụng khi thanh toán
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Program CTA Section */}
      <section className="max-w-[1440px] mx-auto px-4 py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 md:p-12 shadow-2xl">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-500/30">
                <IconHotel size={14} className="text-amber-400" /> Dành cho Chủ cơ sở & Đối tác
              </span>
              <h2 className="font-heading font-800 text-white text-2xl sm:text-3xl md:text-4xl leading-tight mb-4">
                Hợp tác cùng Travelio để tăng trưởng doanh thu vượt trội
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Đưa khách sạn, khu nghỉ dưỡng hoặc khu vui chơi của bạn tiếp cận hàng triệu du khách. 
                Quản lý phòng trống, vé điện tử QR và đối soát dòng tiền tự động, minh bạch.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2.5 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-primary-400 font-bold shrink-0">✓</div>
                  <span>Tiếp cận khách hàng tức thì</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-primary-400 font-bold shrink-0">✓</div>
                  <span>Hệ thống vé QR thông minh</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-primary-400 font-bold shrink-0">✓</div>
                  <span>Đối soát doanh thu tự động</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowPartnerModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-7 py-3.5 rounded-xl text-sm sm:text-base transition-all shadow-lg shadow-amber-500/25 hover:scale-[1.02] cursor-pointer"
              >
                <IconHotel size={18} />
                <span>Trở thành đối tác ngay</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/vendor")}
                className="inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold px-6 py-3.5 rounded-xl text-sm border border-slate-700 transition cursor-pointer"
              >
                <span>Đã có tài khoản? Vào Kênh đối tác →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Registration Modal */}
      <PartnerRegistrationModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
      />

      <Footer />
    </div>
  );
}
