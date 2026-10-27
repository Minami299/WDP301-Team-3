import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import facilityApi from "../services/api/facilityApi";
import AgodaDatePicker from "../components/common/AgodaDatePicker";
import {
  IconAlertTriangle,
  IconCamera,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconMap,
  IconArrowRight,
  IconCalendar,
  IconUsers,
  IconCheck,
} from "../components/Icons";

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

const calculateNights = (inDate, outDate) => {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate);
  const d2 = new Date(outDate);
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
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

const formatVND = (price) => {
  if (!price && price !== 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const getHighResImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  if (url.includes("images.unsplash.com")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", "1600");
      u.searchParams.set("q", "85");
      u.searchParams.set("auto", "format");
      u.searchParams.delete("h");
      return u.toString();
    } catch {
      return url.replace(/w=\d+/, "w=1600");
    }
  }
  return url;
};

// ─────────────────────────────────────────────────────────────
// STAR RATING COMPONENTS
// ─────────────────────────────────────────────────────────────

function StarRating({ rating = 5, size = 15 }) {
  const rounded = Math.round(Number(rating) || 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= rounded ? "#f59e0b" : "#e2e8f0"}
          className="transition-colors"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function InteractiveStarPicker({ rating, onChange, size = 22 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5 cursor-pointer">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={(hovered || rating) >= star ? "#f59e0b" : "#cbd5e1"}
            className="transition-colors"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1.5">
        {(hovered || rating)} sao
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AMENITY ICON
// ─────────────────────────────────────────────────────────────

function AmenityIcon({ iconUrl, name }) {
  if (iconUrl && iconUrl.startsWith("<svg")) {
    return (
      <span
        className="w-5 h-5 flex items-center justify-center text-primary-600 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-current"
        dangerouslySetInnerHTML={{ __html: iconUrl }}
      />
    );
  }
  if (iconUrl && (iconUrl.startsWith("http") || iconUrl.startsWith("data:"))) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className="w-5 h-5 object-contain"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
  }
  return <IconCheck size={18} className="text-emerald-500" />;
}

// ─────────────────────────────────────────────────────────────
// GALLERY (Lightbox + Adaptive grid)
// ─────────────────────────────────────────────────────────────

function FacilityGallery({ facility, images = [] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") handlePrevImage();
      if (e.key === "ArrowRight") handleNextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxIndex, images]);

  const openLightboxAt = (idx) => {
    if (images.length === 0) return;
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };
  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    if (images.length <= 1) return;
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      {/* Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fade-in">
          <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full z-10">
            <div className="flex items-center gap-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
                Ảnh {lightboxIndex + 1} / {images.length}
              </span>
              <span className="font-heading font-bold text-sm hidden sm:inline text-white/90">
                {facility.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
              title="Đóng (Esc)"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center max-w-6xl mx-auto w-full my-3">
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer shadow-lg hover:scale-105"
              >
                <IconChevronLeft size={24} />
              </button>
            )}
            <img
              src={images[lightboxIndex]}
              alt={`${facility.name} - Ảnh ${lightboxIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition duration-300"
            />
            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer shadow-lg hover:scale-105"
              >
                <IconChevronRight size={24} />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="max-w-4xl mx-auto w-full overflow-x-auto no-scrollbar flex items-center gap-2 py-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                    lightboxIndex === idx
                      ? "border-primary-500 scale-105 shadow-md shadow-primary-500/30"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Adaptive Gallery Grid */}
      {images.length === 0 ? (
        <div className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 h-56 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-slate-500 shadow-inner">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3 text-slate-400">
            <IconCamera size={32} />
          </div>
          <div className="font-heading font-bold text-base sm:text-lg text-slate-700 mb-1">{facility.name}</div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">Cơ sở dịch vụ chưa tải hình ảnh lên hệ thống.</p>
        </div>
      ) : images.length === 1 ? (
        <div
          className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 h-72 sm:h-96 md:h-[460px] cursor-pointer group"
          onClick={() => openLightboxAt(0)}
        >
          <img src={images[0]} alt={facility.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <button type="button" className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer">
            <IconCamera size={16} className="text-primary-500" />
            <span>Phóng to hình ảnh</span>
          </button>
        </div>
      ) : images.length === 2 ? (
        <div className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2 h-72 sm:h-96 md:h-[440px]">
            {images.slice(0, 2).map((img, i) => (
              <div key={i} className="relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(i)}>
                <img src={img} alt={`${facility.name} - ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => openLightboxAt(0)} className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer hover:scale-102">
            <IconCamera size={16} className="text-primary-500" />
            <span>Xem cả 2 hình ảnh</span>
          </button>
        </div>
      ) : images.length === 3 ? (
        <div className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 sm:gap-2 h-72 sm:h-96 md:h-[440px]">
            <div className="md:col-span-2 relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(0)}>
              <img src={images[0]} alt={`${facility.name} - 1`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="grid grid-rows-2 gap-1.5 sm:gap-2 h-full">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(i + 1)}>
                  <img src={img} alt={`${facility.name} - ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => openLightboxAt(0)} className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer hover:scale-102">
            <IconCamera size={16} className="text-primary-500" />
            <span>Xem tất cả 3 hình ảnh</span>
          </button>
        </div>
      ) : images.length === 4 ? (
        <div className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-1.5 sm:gap-2 h-72 sm:h-96 md:h-[440px]">
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(0)}>
              <img src={images[0]} alt={`${facility.name} - 1`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="md:col-span-2 relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(1)}>
              <img src={images[1]} alt={`${facility.name} - 2`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {images.slice(2, 4).map((img, i) => (
              <div key={i} className="relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(i + 2)}>
                <img src={img} alt={`${facility.name} - ${i + 3}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => openLightboxAt(0)} className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer hover:scale-102">
            <IconCamera size={16} className="text-primary-500" />
            <span>Xem tất cả 4 hình ảnh</span>
          </button>
        </div>
      ) : (
        <div className="relative mb-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-1.5 sm:gap-2 h-72 sm:h-96 md:h-[460px]">
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden bg-slate-800" onClick={() => openLightboxAt(0)}>
              <img src={images[0]} alt={facility.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {images.slice(1, 5).map((img, idx) => {
              const actualIndex = idx + 1;
              const isLastSlot = idx === 3;
              const remainingCount = images.length - 5;
              return (
                <div key={idx} className="relative group cursor-pointer overflow-hidden bg-slate-800 hidden md:block" onClick={() => openLightboxAt(actualIndex)}>
                  <img src={img} alt={`${facility.name} - Ảnh ${actualIndex + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  {isLastSlot && remainingCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center group-hover:bg-black/70 transition-colors">
                      <IconCamera size={22} className="mb-1 text-primary-300" />
                      <span className="font-heading font-extrabold text-base sm:text-lg">+{remainingCount} ảnh</span>
                      <span className="text-[11px] text-white/80 font-medium">Xem toàn bộ ảnh</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => openLightboxAt(0)} className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 bg-white/95 hover:bg-white text-slate-800 hover:text-primary-600 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer hover:scale-102">
            <IconCamera size={16} className="text-primary-500" />
            <span>Xem tất cả {images.length} hình ảnh</span>
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER + BREADCRUMB
// ─────────────────────────────────────────────────────────────

function FacilityHeader({ facility, isHotel, starsCount, avgRating, reviewCount, onNavigate }) {
  return (
    <>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs text-slate-500">
          <button type="button" onClick={() => onNavigate?.(1)} className="font-bold text-slate-800 hover:text-primary-600 transition cursor-pointer">Trang chủ</button>
          <span>/</span>
          <button type="button" onClick={() => onNavigate?.(2, { city: facility.city })} className="hover:text-primary-600 transition font-medium cursor-pointer">{facility.city || "Việt Nam"}</button>
          <span>/</span>
          <button type="button" onClick={() => onNavigate?.(2, { type: facility.type })} className="hover:text-primary-600 transition font-medium cursor-pointer">{isHotel ? "Khách sạn & Resort" : "Vé & Khu vui chơi"}</button>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{facility.name}</span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${isHotel ? "bg-primary-50 text-primary-700 border border-primary-200" : "bg-secondary-50 text-secondary-700 border border-secondary-200"}`}>
                {isHotel ? "Khách sạn & Khu nghỉ dưỡng" : "Điểm vui chơi & Giải trí"}
              </span>
              {starsCount && (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <StarRating rating={starsCount} size={13} />
                  <span className="text-xs font-bold text-amber-700 ml-1">{starsCount} sao</span>
                </div>
              )}
            </div>
            <h1 className="font-heading font-800 text-2xl sm:text-3xl lg:text-4xl text-slate-900 mb-2 leading-tight">{facility.name}</h1>
            <div className="flex items-center flex-wrap gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <IconMapPin size={15} className="text-primary-500 shrink-0" />
                <span>{facility.address ? `${facility.address}, ` : ""}{facility.city || "Việt Nam"}</span>
              </span>
              <a href="#location-map" className="text-primary-600 hover:text-primary-700 font-bold hover:underline inline-flex items-center gap-1">
                <IconMap size={13} /> Xem trên bản đồ
              </a>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="text-slate-500 font-medium">Mã cơ sở: #{facility._id?.toString().slice(-6).toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-slate-200 p-3 sm:px-4 sm:py-3 shadow-xs">
              <div className="text-right">
                <div className="font-heading font-700 text-slate-900 text-sm">
                  {avgRating ? avgRating >= 4.8 ? "Xuất sắc" : avgRating >= 4.5 ? "Rất tốt" : "Được đánh giá tốt" : "Chưa có đánh giá"}
                </div>
                <div className="text-[11px] text-slate-500">{reviewCount > 0 ? `${reviewCount} nhận xét` : "Đang chờ nhận xét"}</div>
              </div>
              <div className="w-11 h-11 bg-primary-500 text-white font-extrabold text-base rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
                {avgRating || "Mới"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("pricing-rooms-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <div className="text-left">
                <div className="text-[10px] text-amber-100 uppercase font-bold tracking-wider leading-none">
                  {facility.min_price ? `Từ ${formatVND(facility.min_price)}` : "Xem bảng giá"}
                </div>
                <div className="text-sm font-black leading-tight flex items-center gap-1.5 mt-0.5">
                  <span>{isHotel ? "Xem phòng & giá" : "Xem vé & giá"}</span>
                  <span className="text-xs">↓</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AMENITIES
// ─────────────────────────────────────────────────────────────

function FacilityAmenities({ amenities = [] }) {
  if (!amenities || amenities.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-700 text-xl text-slate-900 mb-1">Tiện nghi & Dịch vụ nổi bật</h2>
          <p className="text-xs text-slate-500">Các tiện ích được cung cấp trực tiếp tại cơ sở</p>
        </div>
        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">{amenities.length} tiện ích</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {amenities.map((amen) => (
          <div key={amen._id} className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition group">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/60 shadow-xs flex items-center justify-center shrink-0 group-hover:border-primary-300 transition">
              <AmenityIcon iconUrl={amen.icon_url} name={amen.name} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition line-clamp-1">{amen.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SERVICES / ROOMS / TICKETS (Bảng giá và Chi tiết phòng)
// ─────────────────────────────────────────────────────────────

function FacilityServices({
  services = [],
  isHotel,
  selectedServiceId,
  onSelectService,
  nights = 1,
  rooms = 1,
  facilityName = "",
  hasSelectedDates = true,
  onSelectRoom,
}) {
  const [detailedRoomModal, setDetailedRoomModal] = useState(null);

  if (!services || services.length === 0) return null;

  return (
    <div
      id="pricing-rooms-section"
      className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">
            <span>{isHotel ? "🏨 Bảng giá phòng & Hạng phòng" : "🎟️ Bảng giá vé & Gói trải nghiệm"}</span>
          </div>
          <h2 className="font-heading font-800 text-xl sm:text-2xl text-slate-900">
            {isHotel ? "Các hạng phòng trống & Bảng giá chi tiết" : "Các loại vé tham quan & Trải nghiệm"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isHotel
              ? hasSelectedDates
                ? `Xem chi tiết tiện nghi từng phòng, giá mỗi đêm và tạm tính cho ${nights} đêm lưu trú${rooms > 1 ? ` (${rooms} phòng)` : ""}.`
                : "Xem chi tiết tiện nghi từng phòng và giá mỗi đêm. Vui lòng đặt lịch để tính chính xác tổng giá lưu trú."
              : "Xem chi tiết dịch vụ đi kèm trong từng hạng vé."}
          </p>
        </div>

        {isHotel && hasSelectedDates && (nights > 1 || rooms > 1) && (
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-800 shrink-0">
            Đang tính cho: <span className="text-amber-900 underline">{nights} đêm &bull; {rooms} phòng</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {services.map((svc, index) => {
          const isSelected = selectedServiceId === svc._id;
          const pricePerNight = svc.base_price || 0;
          const totalPrice = isHotel ? pricePerNight * nights * (rooms || 1) : pricePerNight;
          const capacity = svc.capacity || 2;

          return (
            <div
              key={svc._id}
              className={`rounded-2xl border-2 p-5 sm:p-6 transition-all bg-white hover:border-primary-300 ${
                isSelected
                  ? "border-primary-500 ring-4 ring-primary-100 shadow-md bg-primary-50/10"
                  : "border-slate-200 hover:shadow-sm"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                {/* Room Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-heading font-800 text-lg sm:text-xl text-slate-900">
                      {svc.name}
                    </h3>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-slate-200">
                      <IconUsers size={13} className="text-primary-500" />
                      {isHotel ? `Sức chứa tối đa: ${capacity} khách` : `${capacity} khách / vé`}
                    </span>
                    {index === 0 && (
                      <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        ⭐ Lựa chọn phổ biến
                      </span>
                    )}
                  </div>

                  {svc.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mb-3.5 leading-relaxed line-clamp-2">
                      {svc.description}
                    </p>
                  )}

                  {/* Highlights pills */}
                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                      📶 Wifi tốc độ cao
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                      ❄️ Điều hòa mát lạnh
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                      ✓ Miễn phí hủy trước 24h
                    </span>
                  </div>

                  {/* "Xem chi tiết phòng" button (Detail inspection without rushing to checkout) */}
                  <button
                    type="button"
                    onClick={() => setDetailedRoomModal(svc)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline cursor-pointer"
                  >
                    <span>👁️ Xem chi tiết phòng & chính sách →</span>
                  </button>
                </div>

                {/* Pricing & Actions */}
                <div className="lg:text-right shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">
                      {isHotel ? "Giá mỗi đêm" : "Giá vé"}
                    </div>
                    <div className="font-heading font-900 text-2xl sm:text-3xl text-primary-600">
                      {formatVND(pricePerNight)}
                    </div>
                    {isHotel && hasSelectedDates && (nights > 1 || rooms > 1) && (
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                        Tổng cộng ({nights} đêm{rooms > 1 ? ` • ${rooms} phòng` : ""}): <span className="text-slate-800">{formatVND(totalPrice)}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">Đã bao gồm thuế & phí</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailedRoomModal(svc)}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:border-primary-400 text-slate-700 hover:text-primary-600 transition cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectRoom) {
                          onSelectRoom(svc);
                        } else {
                          onSelectService?.(svc._id);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isSelected
                          ? "bg-primary-500 text-white shadow-primary-500/25 ring-2 ring-primary-300"
                          : "border border-slate-300 text-slate-800 hover:border-primary-500 hover:bg-primary-50"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <IconCheck size={14} />
                          <span>Đang chọn phòng này</span>
                        </>
                      ) : (
                        <span>Chọn phòng này</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED ROOM MODAL (Xem chi tiết phòng mà chưa đến bước đặt phòng) */}
      {detailedRoomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDetailedRoomModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setDetailedRoomModal(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <IconX size={18} />
            </button>

            {/* Modal Header */}
            <div className="mb-5 pr-8">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                {isHotel ? "Chi tiết hạng phòng" : "Chi tiết hạng vé"}
              </span>
              <h3 className="font-heading font-800 text-2xl text-slate-900 mt-2">
                {detailedRoomModal.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tại cơ sở: <strong className="text-slate-800">{facilityName || "Khách sạn"}</strong>
              </p>
            </div>

            {/* Room Specifications Card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/70 mb-5 text-xs">
              <div>
                <div className="text-slate-400 font-bold uppercase text-[10px]">Sức chứa</div>
                <div className="font-black text-slate-900 mt-0.5">
                  {detailedRoomModal.capacity || 2} người lớn
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-bold uppercase text-[10px]">Giường ngủ</div>
                <div className="font-black text-slate-900 mt-0.5">
                  1 Giường King lớn
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-bold uppercase text-[10px]">Diện tích phòng</div>
                <div className="font-black text-slate-900 mt-0.5">32 - 38 m²</div>
              </div>
            </div>

            {/* Description */}
            {detailedRoomModal.description && (
              <div className="mb-5">
                <h4 className="font-heading font-700 text-sm text-slate-900 mb-1.5">Mô tả phòng</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {detailedRoomModal.description}
                </p>
              </div>
            )}

            {/* Included Amenities Checklist */}
            <div className="mb-5">
              <h4 className="font-heading font-700 text-sm text-slate-900 mb-2.5">
                Tiện ích phòng bao gồm
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {[
                  "Wifi cáp quang miễn phí toàn phòng",
                  "Điều hòa không khí 2 chiều",
                  "Phòng tắm riêng với bồn tắm & vòi sen",
                  "Máy sấy tóc & khăn tắm cao cấp",
                  "Tủ lạnh mini & bình đun siêu tốc",
                  "Nước suối, trà & cà phê miễn phí mỗi ngày",
                  "Bàn làm việc & két sắt an toàn",
                  "TV thông minh màn hình phẳng",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="mb-6 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1.5 text-blue-900">
              <div className="font-bold flex items-center gap-1.5">
                <span>📋 Chính sách đặt phòng & Hủy phòng:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800">
                <li>Nhận phòng: từ 14:00 | Trả phòng: trước 12:00</li>
                <li>Miễn phí hủy phòng trước 24 giờ so với ngày nhận phòng.</li>
                <li>Chỉ hiển thị thông tin chi tiết phòng và bảng giá tham khảo, chưa chuyển sang bước đặt phòng.</li>
              </ul>
            </div>

            {/* Pricing Summary in Modal */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Giá mỗi đêm</div>
                <div className="font-heading font-900 text-2xl text-primary-600">
                  {formatVND(detailedRoomModal.base_price)}
                </div>
                {isHotel && nights > 1 && (
                  <div className="text-[11px] text-slate-500 font-bold">
                    Tạm tính {nights} đêm: {formatVND(detailedRoomModal.base_price * nights)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailedRoomModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectService?.(detailedRoomModal._id);
                    setDetailedRoomModal(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-md shadow-primary-500/20 cursor-pointer"
                >
                  Chọn hạng phòng này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAP
// ─────────────────────────────────────────────────────────────

function FacilityMap({ facility }) {
  if (!facility) return null;
  return (
    <div id="location-map" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs scroll-mt-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading font-700 text-xl text-slate-900 mb-1 flex items-center gap-2">
            <IconMap size={20} className="text-primary-500" /> Vị trí & Bản đồ
          </h2>
          <p className="text-xs text-slate-600 font-medium">{facility.address ? `${facility.address}, ` : ""}{facility.city || "Việt Nam"}</p>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.name} ${facility.address || ""} ${facility.city || ""}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-primary-400 bg-white hover:bg-primary-50 text-slate-700 hover:text-primary-600 font-bold text-xs transition flex items-center gap-1.5"
        >
          <span>Chỉ đường trên Google Maps</span>
          <IconArrowRight size={13} />
        </a>
      </div>
      <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
        <iframe
          title="Bản đồ vị trí cơ sở"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${facility.address || facility.name}, ${facility.city || "Việt Nam"}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────

function FacilityReviews({ facility, reviews = [], avgRating, reviewCount, ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, currentUser, onRefresh, onNavigateLogin }) {
  const canManageReviews = currentUser?.role === 'HOTEL_OWNER' && String(facility.vendor_id) === String(currentUser.id || currentUser._id);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (facility?.customer_review) {
      setNewRating(facility.customer_review.rating || 5);
      setNewComment(facility.customer_review.comment || "");
    }
  }, [facility?.customer_review]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");
    if (!newComment.trim()) {
      setReviewError("Vui lòng nhập nội dung đánh giá của bạn.");
      return;
    }
    try {
      setSubmittingReview(true);
      await facilityApi.createReview(facility._id, { rating: newRating, comment: newComment.trim() });
      setReviewSuccess("Nhận xét của bạn đã được ghi nhận thành công!");
      setNewComment("");
      onRefresh?.();
    } catch (err) {
      setReviewError(err.message || err.response?.data?.message || "Không thể gửi nhận xét. Vui lòng thử lại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      setSubmittingReply(true);
      await facilityApi.replyReview(facility._id, reviewId, { reply: replyText.trim() });
      setReplyingReviewId(null);
      setReplyText("");
      onRefresh?.();
    } catch (err) {
      alert(err.message || err.response?.data?.message || "Lỗi khi gửi phản hồi");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-700 text-xl text-slate-900 mb-1">Đánh giá & Nhận xét từ khách hàng</h2>
          <p className="text-xs text-slate-500">Phản hồi thực tế từ du khách đã sử dụng dịch vụ</p>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center sm:border-r sm:border-slate-200 sm:pr-8 shrink-0">
          <div className="font-heading font-900 text-4xl sm:text-5xl text-primary-600 mb-1">{avgRating || "Mới"}</div>
          <div className="flex justify-center mb-1">
            <StarRating rating={avgRating ? Math.round(Number(avgRating)) : 5} size={16} />
          </div>
          <div className="text-xs text-slate-500 font-medium">{reviewCount > 0 ? `Dựa trên ${reviewCount} đánh giá từ DB` : "Chưa có lượt đánh giá nào"}</div>
        </div>
        <div className="flex-1 w-full space-y-1.5 text-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star] || 0;
            const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="w-12 text-slate-600 font-bold">{star} sao</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right text-slate-500 font-semibold">{count > 0 ? `${pct}%` : "0%"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Form */}
      <div className="mb-8 p-5 bg-primary-50/40 rounded-2xl border border-primary-100">
        <h3 className="font-heading font-700 text-sm sm:text-base text-slate-900 mb-2">Viết nhận xét của bạn</h3>
        {currentUser ? (
          facility?.has_purchased ? (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="text-emerald-600 font-bold">✓</span> Đã đặt dịch vụ tại cơ sở này
                </span>
                {facility?.customer_review && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Bạn đang chỉnh sửa đánh giá đã gửi)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Đánh giá của bạn:</span>
                <InteractiveStarPicker rating={newRating} onChange={(r) => setNewRating(r)} />
              </div>
              <div>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Hãy chia sẻ trải nghiệm thực tế, chất lượng phòng ốc hoặc dịch vụ..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              {reviewError && <p className="text-xs font-bold text-rose-600">{reviewError}</p>}
              {reviewSuccess && <p className="text-xs font-bold text-emerald-600">{reviewSuccess}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={submittingReview} className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition cursor-pointer disabled:opacity-50">
                  {submittingReview ? "Đang gửi..." : (facility?.customer_review ? "Cập nhật nhận xét" : "Gửi nhận xét")}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-500 font-bold text-base mt-0.5">🔒</span>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Chỉ khách hàng đã đặt phòng hoặc mua vé thành công mới có thể đánh giá
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Hệ thống xác thực từ lịch sử đơn hàng đã xác nhận/hoàn thành để đảm bảo phản hồi thật và minh bạch.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-600">Bạn đã từng trải nghiệm tại {facility.name}? Đăng nhập bằng tài khoản đã đặt chỗ để gửi nhận xét!</p>
            <button type="button" onClick={onNavigateLogin} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer">
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev._id} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {rev.customer_avatar ? (
                    <img src={rev.customer_avatar} alt={rev.customer_name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shadow-xs">
                      {rev.customer_name?.charAt(0) || "K"}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900">{rev.customer_name || "Khách hàng"}</div>
                    <div className="text-[11px] text-slate-400">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }) : "Khách hàng"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg">
                  <StarRating rating={rev.rating || 5} size={12} />
                  <span className="text-xs font-bold text-amber-700">{rev.rating || 5}.0</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">{rev.comment}</p>

              {rev.vendor_reply && (
                <div className="mt-3 ml-13 p-3.5 bg-slate-50 rounded-xl border-l-3 border-primary-500 text-xs">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    Phản hồi từ Chủ khách sạn:
                  </div>
                  <p className="text-slate-600 leading-relaxed italic whitespace-pre-wrap break-words">"{rev.vendor_reply}"</p>
                </div>
              )}

              {canManageReviews && (!rev.vendor_reply_by || String(rev.vendor_reply_by) === String(currentUser.id || currentUser._id)) && (
                <div className="mt-3 ml-13">
                  {replyingReviewId === rev._id ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <textarea
                        rows={2}
                        maxLength={5000}
                        aria-label="Nội dung phản hồi"
                        disabled={submittingReply}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập câu trả lời chính thức của ban quản lý..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={submittingReply} onClick={() => setReplyingReviewId(null)} className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer">Hủy</button>
                        <button type="button" disabled={submittingReply || !replyText.trim()} onClick={() => handleSubmitReply(rev._id)} className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg cursor-pointer">
                          {submittingReply ? "Đang gửi..." : "Gửi phản hồi"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setReplyingReviewId(rev._id); setReplyText(rev.vendor_reply || ""); }} className="text-xs text-primary-600 hover:text-primary-700 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      💬 {rev.vendor_reply ? 'Chỉnh sửa phản hồi' : 'Phản hồi nhận xét này'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">Chưa có đánh giá nào được ghi nhận cho cơ sở này.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOOKING DRAWER (Static – không theo scroll)
// ─────────────────────────────────────────────────────────────

function FacilityBookingDrawer({
  isHotel,
  currentUser,
  servicePrice,
  selectedService,
  nights,
  rooms = 1,
  setRooms,
  guests,
  setGuests,
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  totalBasePrice,
  finalPrice,
  onBookNow,
  bookingError = "",
  setBookingError,
  hasSelectedDates = true,
  isDatePickerOpen,
  setIsDatePickerOpen,
  dateNotification = "",
  setDateNotification,
}) {
  const [internalDatePickerOpen, setInternalDatePickerOpen] = useState(false);
  const datePickerOpen = isDatePickerOpen !== undefined ? isDatePickerOpen : internalDatePickerOpen;
  const toggleDatePicker = setIsDatePickerOpen || setInternalDatePickerOpen;

  const formatDisplayDate = (iso) => {
    if (!iso) return "";
    try {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="lg:col-span-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg relative">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white rounded-t-2xl sm:rounded-t-3xl">
          <div className="text-xs text-primary-100 font-semibold mb-1">{isHotel ? "Giá phòng bắt đầu từ" : "Giá vé từ"}</div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-800 text-2xl sm:text-3xl text-white">{formatVND(servicePrice)}</span>
            <span className="text-xs text-primary-200 font-medium">{isHotel ? "/ đêm" : "/ khách"}</span>
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {isHotel ? (
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ngày nhận - trả phòng
                </label>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition ${
                  hasSelectedDates
                    ? "text-primary-600 bg-primary-50 border-primary-200"
                    : "text-amber-800 bg-amber-50 border-amber-300 font-extrabold"
                }`}>
                  {hasSelectedDates ? `${nights} đêm` : "Chưa chọn lịch"}
                </span>
              </div>
              <div
                id="booking-date-section"
                onClick={() => toggleDatePicker(!datePickerOpen)}
                className={`grid grid-cols-2 gap-2 cursor-pointer group transition ${
                  !hasSelectedDates
                    ? "p-1 rounded-2xl bg-amber-50/70 border-2 border-amber-300 ring-2 ring-amber-200/50"
                    : ""
                }`}
              >
                <div className={`border rounded-xl p-2.5 transition ${
                  !checkInDate
                    ? "border-amber-300 bg-white"
                    : "border-slate-200 group-hover:border-primary-500 bg-slate-50/50"
                }`}>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mb-0.5">
                    <IconCalendar size={11} className={checkInDate ? "text-primary-500" : "text-amber-500"} /> Nhận phòng
                  </div>
                  <div className={`font-bold text-xs ${checkInDate ? "text-slate-800" : "text-amber-800 font-semibold"}`}>
                    {formatDisplayDate(checkInDate) || "Chọn ngày đến"}
                  </div>
                </div>
                <div className={`border rounded-xl p-2.5 transition ${
                  !checkOutDate
                    ? "border-amber-300 bg-white"
                    : "border-slate-200 group-hover:border-primary-500 bg-slate-50/50"
                }`}>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mb-0.5">
                    <IconCalendar size={11} className={checkOutDate ? "text-primary-500" : "text-amber-500"} /> Trả phòng
                  </div>
                  <div className={`font-bold text-xs ${checkOutDate ? "text-slate-800" : "text-amber-800 font-semibold"}`}>
                    {formatDisplayDate(checkOutDate) || "Chọn ngày đi"}
                  </div>
                </div>
              </div>
              <AgodaDatePicker
                isOpen={datePickerOpen}
                checkIn={checkInDate}
                checkOut={checkOutDate}
                singleDateMode={false}
                align="right"
                onChange={(dates) => {
                  if (dates.checkIn) setCheckInDate(dates.checkIn);
                  if (dates.checkOut) setCheckOutDate(dates.checkOut);
                  if (dates.checkIn && dates.checkOut) {
                    setBookingError?.("");
                    setDateNotification?.("");
                  }
                }}
                onClose={() => toggleDatePicker(false)}
              />
            </div>
          ) : (
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày sử dụng vé
              </label>
              <div
                id="booking-date-section"
                onClick={() => toggleDatePicker(!datePickerOpen)}
                className={`border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group ${
                  !checkInDate
                    ? "border-amber-300 bg-amber-50/50 ring-2 ring-amber-200/50"
                    : "border-slate-200 hover:border-primary-500 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <IconCalendar size={14} className={checkInDate ? "text-primary-500" : "text-amber-500"} />
                  <span className={`font-bold text-xs ${checkInDate ? "text-slate-800" : "text-amber-800"}`}>
                    {formatDisplayDate(checkInDate) || "Chọn ngày sử dụng"}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded group-hover:bg-primary-100 transition">
                  {checkInDate ? "Đổi ngày" : "Chọn ngày"}
                </span>
              </div>
              <AgodaDatePicker
                isOpen={datePickerOpen}
                checkIn={checkInDate}
                checkOut={checkInDate}
                singleDateMode={true}
                align="right"
                onChange={(dates) => {
                  if (dates.checkIn) {
                    setCheckInDate(dates.checkIn);
                    setBookingError?.("");
                    setDateNotification?.("");
                  }
                }}
                onClose={() => toggleDatePicker(false)}
              />
            </div>
          )}

          {isHotel && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số lượng phòng
              </label>
              <select
                value={rooms}
                onChange={(e) => setRooms?.(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 8].map((r) => (
                  <option key={r} value={r}>
                    {r} phòng
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isHotel ? "Số lượng khách lưu trú" : "Số lượng vé"}
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary-500 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((g) => (
                <option key={g} value={g}>
                  {g} {isHotel ? "người" : "vé"}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <div className="flex justify-between items-center text-slate-600">
              <span>Gói đã chọn:</span>
              <span className="font-bold text-slate-900 text-right truncate max-w-[170px]">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-xs">
              <span>
                {isHotel
                  ? hasSelectedDates
                    ? `${formatVND(servicePrice)} × ${nights} đêm${rooms > 1 ? ` × ${rooms} phòng` : ""}`
                    : `${formatVND(servicePrice)} / phòng / đêm${rooms > 1 ? ` × ${rooms} phòng` : ""}`
                  : hasSelectedDates
                  ? `${formatVND(servicePrice)} × ${guests} vé`
                  : `${formatVND(servicePrice)} / vé`}
              </span>
              <span className="font-semibold text-slate-800">
                {hasSelectedDates ? formatVND(totalBasePrice) : formatVND(servicePrice * (rooms || 1))}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">
                {hasSelectedDates ? "Tổng cộng:" : "Tạm tính (chưa chọn lịch):"}
              </span>
              <span className="font-heading font-800 text-lg sm:text-xl text-primary-600">
                {hasSelectedDates ? formatVND(finalPrice) : formatVND(servicePrice * (rooms || 1))}
              </span>
            </div>
            {!hasSelectedDates && (
              <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                ⚠️ Giá tạm tính 1 đêm. Vui lòng đặt lịch để tính đúng số đêm lưu trú.
              </div>
            )}
          </div>

          {dateNotification && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <span className="text-amber-600 font-bold shrink-0 mt-0.5">ℹ️</span>
              <span className="leading-tight">{dateNotification}</span>
            </div>
          )}

          {bookingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <span className="text-rose-500 font-bold shrink-0 mt-0.5">⚠️</span>
              <span className="leading-tight">{bookingError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onBookNow}
            className={`w-full font-heading font-700 py-3.5 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01] text-white ${
              !hasSelectedDates
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 ring-2 ring-amber-300"
                : "bg-secondary-500 hover:bg-secondary-600 shadow-secondary-500/25"
            }`}
          >
            <span>
              {!hasSelectedDates
                ? isHotel
                  ? "📅 Đặt lịch phòng ngay"
                  : "📅 Đặt lịch vé ngay"
                : currentUser
                ? isHotel
                  ? "Đặt phòng ngay"
                  : "Đặt vé ngay"
                : isHotel
                ? "Đăng nhập & đặt phòng"
                : "Đăng nhập & đặt vé"}
            </span>
            <IconArrowRight size={16} />
          </button>

          {currentUser && ["ADMIN", "MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(currentUser.role || currentUser.role_name) && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3 text-center">
              Vui lòng đăng nhập tài khoản Khách hàng để tiến hành đặt phòng.
            </p>
          )}

          {!currentUser && (
            <p className="text-xs text-slate-400 text-center mt-3">
              Bạn có thể đăng nhập ngay hoặc chọn ngày và hạng phòng trước khi đăng nhập.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function FacilityDetailScreen({
  facility,
  loading = false,
  error = null,
  onRetry,
  onRefresh,
  onNavigate,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialRooms,
  initialAdults,
  initialChildren,
}) {
  const { currentUser } = useAuth();

  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [rooms, setRooms] = useState(initialRooms ? Math.max(1, Number(initialRooms)) : 1);
  const [guests, setGuests] = useState(initialGuests ? Number(initialGuests) : 2);
  const [checkInDate, setCheckInDate] = useState(initialCheckIn || "");
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut || "");
  const [bookingError, setBookingError] = useState("");
  const [dateNotification, setDateNotification] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (initialCheckIn !== undefined) setCheckInDate(initialCheckIn || "");
    if (initialCheckOut !== undefined) setCheckOutDate(initialCheckOut || "");
    if (initialGuests) setGuests(Number(initialGuests));
    if (initialRooms) setRooms(Math.max(1, Number(initialRooms)));
  }, [initialCheckIn, initialCheckOut, initialGuests, initialRooms]);

  useEffect(() => {
    if (facility?.services && facility.services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(facility.services[0]._id);
    }
  }, [facility]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-body py-8">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6 animate-pulse" />
          <div className="h-10 bg-slate-200 rounded w-2/3 mb-4 animate-pulse" />
          <div className="h-5 bg-slate-200 rounded w-1/3 mb-8 animate-pulse" />
          <div className="h-96 bg-slate-200 rounded-2xl mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-44 bg-slate-200 rounded-2xl animate-pulse" />
              <div className="h-60 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
            <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-slate-50 font-body flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle size={32} />
          </div>
          <h2 className="font-heading font-700 text-slate-800 text-xl mb-2">Không tìm thấy thông tin cơ sở</h2>
          <p className="text-sm text-slate-500 mb-6">{error || "Địa điểm bạn tìm kiếm có thể đã bị xóa hoặc tạm thời không khả dụng."}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => onNavigate?.(2)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer">
              Về danh sách tìm kiếm
            </button>
            {onRetry && (
              <button onClick={onRetry} className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition cursor-pointer">
                Thử lại
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Build images list from real DB data only
  const images = (() => {
    const list = [];
    if (facility.primary_image) list.push(getHighResImageUrl(facility.primary_image));
    if (Array.isArray(facility.images)) {
      facility.images.forEach((img) => {
        const url = typeof img === "string" ? img : img?.image_url;
        if (url) {
          const highRes = getHighResImageUrl(url);
          if (!list.includes(highRes)) list.push(highRes);
        }
      });
    }
    return list;
  })();

  // Compute ratings from real DB reviews
  const reviews = Array.isArray(facility.reviews) ? facility.reviews : [];
  const reviewCount = reviews.length;
  let ratingSum = 0;
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    ratingSum += Number(r.rating) || 0;
  });
  const avgRating = reviewCount > 0 ? (ratingSum / reviewCount).toFixed(1) : null;

  const isHotel = facility.type === "HOTEL";
  const starsCount = facility.stars || null;
  const isManagerOrVendor = currentUser && ["ADMIN", "MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(currentUser.role || currentUser.role_name);

  const selectedService = facility.services?.find((s) => s._id === selectedServiceId) || facility.services?.[0] || {
    name: isHotel ? "Phòng Tiêu Chuẩn" : "Vé Tiêu Chuẩn",
    base_price: facility.min_price || 0,
    capacity: 2,
    description: "",
  };
  const servicePrice = selectedService.base_price || facility.min_price || 0;
  const hasSelectedDates = Boolean(checkInDate && (isHotel ? checkOutDate : true));
  const nights = isHotel && checkInDate && checkOutDate ? calculateNights(checkInDate, checkOutDate) : 1;
  const totalBasePrice = isHotel ? servicePrice * nights * (rooms || 1) : servicePrice * guests;
  const finalPrice = totalBasePrice;

  const handleBookNow = () => {
    // 0. Check authentication: if not logged in, redirect to login with returnUrl
    if (!currentUser) {
      const searchParams = new URLSearchParams();
      if (checkInDate) searchParams.set("checkIn", checkInDate);
      if (isHotel && checkOutDate) searchParams.set("checkOut", checkOutDate);
      if (rooms) searchParams.set("rooms", String(rooms));
      if (guests) searchParams.set("guests", String(guests));
      const queryString = searchParams.toString();
      const returnUrl = `/facilities/${facility._id}${queryString ? `?${queryString}` : ""}`;
      onNavigate?.("login", { returnUrl });
      return;
    }

    if (isManagerOrVendor) {
      setBookingError("Vui lòng đăng nhập tài khoản Khách hàng để tiến hành đặt phòng.");
      return;
    }

    // 1. Service selection validation
    if (!selectedService || !selectedService._id) {
      setBookingError(isHotel ? "Vui lòng chọn 1 hạng phòng để tiếp tục!" : "Vui lòng chọn 1 loại vé để tiếp tục!");
      return;
    }

    // 2. Date validation: Must select dates before moving to checkout
    if (!checkInDate || (isHotel && !checkOutDate)) {
      setBookingError(
        isHotel
          ? "Vui lòng đặt lịch (chọn ngày nhận và trả phòng) để tiếp tục đặt phòng!"
          : "Vui lòng đặt lịch (chọn ngày tham quan) để tiếp tục đặt vé!"
      );
      setIsDatePickerOpen(true);
      const bookingDateSection = document.getElementById("booking-date-section");
      if (bookingDateSection) {
        bookingDateSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const today = getTodayISO();
    if (checkInDate < today) {
      setBookingError(isHotel ? "Ngày nhận phòng không hợp lệ hoặc đã qua!" : "Ngày sử dụng vé không hợp lệ hoặc đã qua!");
      setIsDatePickerOpen(true);
      return;
    }

    if (isHotel) {
      if (checkOutDate <= checkInDate) {
        setBookingError("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!");
        setIsDatePickerOpen(true);
        return;
      }
      if (nights > 30) {
        setBookingError("Thời gian lưu trú tối đa cho phép là 30 đêm.");
        return;
      }

      // 3. Room & Guests validation
      const currentRooms = rooms || 1;
      const availableRooms = selectedService?.total_rooms ?? selectedService?.available_qty;
      if (typeof availableRooms === "number" && availableRooms > 0 && currentRooms > availableRooms) {
        setBookingError(`Hạng phòng "${selectedService.name}" hiện chỉ còn ${availableRooms} phòng trống, không đủ đáp ứng số lượng ${currentRooms} phòng của quý khách!`);
        return;
      }

      if (currentRooms > guests) {
        setBookingError(`Bạn đang đặt ${currentRooms} phòng cho ${guests} khách. Mỗi phòng cần tối thiểu 1 khách lưu trú!`);
        return;
      }

      const roomCapacity = Number(selectedService.capacity) || 2;
      const maxAllowedGuests = currentRooms * roomCapacity;
      if (guests > maxAllowedGuests) {
        setBookingError(`Hạng phòng "${selectedService.name}" có sức chứa tối đa ${roomCapacity} người/phòng (${currentRooms} phòng chứa tối đa ${maxAllowedGuests} khách). Với ${guests} khách lưu trú, vui lòng đặt thêm số lượng phòng hoặc chọn hạng phòng lớn hơn!`);
        return;
      }
    } else {
      if (guests < 1) {
        setBookingError("Vui lòng chọn ít nhất 1 vé tham quan!");
        return;
      }
      if (guests > 30) {
        setBookingError("Số lượng vé trực tuyến tối đa là 30 vé. Vui lòng liên hệ hotline với đoàn lớn hơn!");
        return;
      }
    }

    setBookingError("");
    onNavigate?.(4, {
      facilityId: facility._id,
      facilityName: facility.name,
      facilityAddress: facility.address,
      facilityCity: facility.city,
      facilityImage: images[0] || null,
      type: facility.type,
      serviceId: selectedService._id,
      serviceName: selectedService.name,
      servicePrice,
      nights: isHotel ? nights : 1,
      rooms: isHotel ? (rooms || 1) : 1,
      guests,
      checkInDate,
      checkOutDate: isHotel ? checkOutDate : "",
      totalAmount: finalPrice,
      availableRooms: selectedService?.total_rooms ?? selectedService?.available_qty ?? null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-900 pb-16">
      <FacilityHeader facility={facility} isHotel={isHotel} starsCount={starsCount} avgRating={avgRating} reviewCount={reviewCount} onNavigate={onNavigate} />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <FacilityGallery facility={facility} images={images} />

        {/* Thông báo đặt lịch nếu người dùng chưa chọn ngày */}
        {!hasSelectedDates && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <IconCalendar size={24} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-base text-amber-950">
                  {isHotel ? "Quý khách chưa chọn ngày nhận và trả phòng" : "Quý khách chưa chọn ngày tham quan"}
                </h4>
                <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                  {isHotel
                    ? "Vui lòng đặt lịch để kiểm tra tình trạng phòng trống chính xác, tính tổng tiền và tiến hành đặt phòng."
                    : "Vui lòng đặt lịch để xem giá vé và tiến hành đặt vé."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDatePickerOpen(true);
                const bookingDateSection = document.getElementById("booking-date-section");
                if (bookingDateSection) {
                  bookingDateSection.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <IconCalendar size={16} />
              <span>Đặt lịch ngay</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            {facility.description && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
                <h2 className="font-heading font-700 text-xl text-slate-900 mb-3">Giới thiệu về cơ sở</h2>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{facility.description}</div>
                {facility.vendor?.name && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
                    <span className="font-medium">Đơn vị quản lý: <strong className="text-slate-800">{facility.vendor.name}</strong></span>
                    {facility.vendor.email && <span>Email liên hệ: {facility.vendor.email}</span>}
                  </div>
                )}
              </div>
            )}

            <FacilityAmenities amenities={facility.amenities} />
            <FacilityServices
              services={facility.services}
              isHotel={isHotel}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              nights={nights}
              rooms={rooms || 1}
              facilityName={facility.name}
              hasSelectedDates={hasSelectedDates}
              onSelectRoom={(svc) => {
                setSelectedServiceId(svc._id);
                if (!hasSelectedDates) {
                  setDateNotification(
                    isHotel
                      ? `Đã chọn hạng phòng "${svc.name}". Vui lòng đặt lịch nhận & trả phòng ở bảng bên phải để hoàn tất đặt phòng!`
                      : `Đã chọn loại vé "${svc.name}". Vui lòng đặt lịch ngày tham quan ở bảng bên phải để đặt vé!`
                  );
                  setIsDatePickerOpen(true);
                  const bookingDateSection = document.getElementById("booking-date-section");
                  if (bookingDateSection) {
                    bookingDateSection.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }
              }}
            />
            <FacilityMap facility={facility} />
            <FacilityReviews
              facility={facility}
              reviews={reviews}
              avgRating={avgRating}
              reviewCount={reviewCount}
              ratingCounts={ratingCounts}
              currentUser={currentUser}
              onRefresh={onRefresh}
              onNavigateLogin={() => onNavigate?.("login")}
            />
          </div>

          {/* RIGHT COLUMN – Static Booking Box */}
          <FacilityBookingDrawer
            isHotel={isHotel}
            currentUser={currentUser}
            servicePrice={servicePrice}
            selectedService={selectedService}
            nights={nights}
            rooms={rooms}
            setRooms={setRooms}
            guests={guests}
            setGuests={setGuests}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
            totalBasePrice={totalBasePrice}
            finalPrice={finalPrice}
            onBookNow={handleBookNow}
            bookingError={bookingError}
            setBookingError={setBookingError}
            hasSelectedDates={hasSelectedDates}
            isDatePickerOpen={isDatePickerOpen}
            setIsDatePickerOpen={setIsDatePickerOpen}
            dateNotification={dateNotification}
            setDateNotification={setDateNotification}
          />
        </div>
      </div>
    </div>
  );
}
