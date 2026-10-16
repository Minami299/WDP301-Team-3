import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import facilityApi from '../services/api/facilityApi';
import { ticketCart } from '../services/storage/ticketCart';
import { localDate, inputClass, money, buttonClass } from '../utils/attractionUi';
import { ageLabel } from '../utils/ticketTypes';
import useAuth from '../hooks/useAuth';
import {
  IconCamera,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconMapPin,
  IconCalendar,
  IconTicket,
  IconCheck,
  IconClock,
} from './Icons';

const formatDateVN = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const getHighResImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', '1600');
      u.searchParams.set('q', '85');
      u.searchParams.set('auto', 'format');
      u.searchParams.delete('h');
      return u.toString();
    } catch {
      return url.replace(/w=\d+/, 'w=1600');
    }
  }
  return url;
};

// ─────────────────────────────────────────────────────────────
// 1. INLINE CALENDAR (Ảnh 3 - Chọn ngày bên trái card mở rộng)
// ─────────────────────────────────────────────────────────────
function InlineCalendar({ selectedDate, onSelectDate, minDate = localDate() }) {
  const [viewDate, setViewDate] = useState(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'Tháng Một',
    'Tháng Hai',
    'Tháng Ba',
    'Tháng Tư',
    'Tháng Năm',
    'Tháng Sáu',
    'Tháng Bảy',
    'Tháng Tám',
    'Tháng Chín',
    'Tháng Mười',
    'Tháng Mười Một',
    'Tháng Mười Hai',
  ];

  const handlePrev = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const todayStr = localDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, dateStr });
  }

  return (
    <div className="w-full max-w-[360px] select-none bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
      <div className="text-base font-extrabold text-slate-900 mb-3">Chọn ngày tham quan</div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={handlePrev}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Tháng trước"
        >
          <IconChevronLeft size={18} />
        </button>
        <span className="font-extrabold text-sm sm:text-base text-slate-900">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Tháng sau"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center mb-2 bg-slate-200/60 py-1.5 rounded-xl">
        {['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'].map((w) => (
          <span key={w} className="text-xs font-extrabold text-slate-700">
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid with large buttons */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} />;
          const isPast = item.dateStr < minDate;
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;

          return (
            <button
              key={item.dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(item.dateStr)}
              className={`w-10 h-10 mx-auto flex items-center justify-center text-sm font-bold rounded-xl transition ${
                isSelected
                  ? 'bg-primary-600 text-white font-black shadow-md scale-105'
                  : isPast
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-800 hover:bg-primary-100/80 hover:text-primary-700 cursor-pointer'
              } ${isToday && !isSelected ? 'border-2 border-primary-400 text-primary-700 font-extrabold' : ''}`}
            >
              <span>{item.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. DETAIL MODAL (Ảnh 4 - Popup xem chi tiết vé & điều khoản)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 2. DETAIL MODAL (Popup xem chi tiết dịch vụ & hạng vé)
// ─────────────────────────────────────────────────────────────
function ServiceDetailModal({ service, facility, onClose }) {
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!service) return null;

  const categoryMap = {
    ATTRACTION: 'Điểm tham quan',
    TOUR: 'Tour du lịch',
    TICKET: 'Vé tham quan',
    EXPERIENCE: 'Trải nghiệm',
  };

  const pricingUnitMap = {
    PERSON: 'Theo người',
    TICKET: 'Theo vé',
    TOUR: 'Theo tour',
    PACKAGE: 'Theo gói',
  };

  const categoryLabel = categoryMap[service.service_category];
  const unitLabel = pricingUnitMap[service.pricing_unit];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="w-6" />
          <h2 className="font-heading font-bold text-base sm:text-lg text-slate-900 text-center">
            Chi tiết dịch vụ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-slate-800 text-sm">
          {/* Service Name & Category */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {categoryLabel && (
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200">
                  {categoryLabel}
                </span>
              )}
              {unitLabel && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {unitLabel}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{service.name}</h3>
          </div>

          {/* Description */}
          {service.description && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Mô tả dịch vụ</h4>
              <p className={`text-slate-600 leading-relaxed whitespace-pre-wrap ${showFullDesc ? '' : 'line-clamp-4'}`}>
                {service.description}
              </p>
              {service.description.length > 150 && (
                <button
                  type="button"
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-primary-600 font-bold text-xs mt-1.5 hover:underline cursor-pointer"
                >
                  {showFullDesc ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>
          )}

          {/* Specific Meta Info (Location, Duration, Capacity) */}
          {(service.location || service.duration_minutes || service.capacity) && (
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Thông tin trải nghiệm</h4>
              {service.location && (
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <IconMapPin size={16} className="text-primary-500 flex-shrink-0 mt-0.5" />
                  <span>Địa điểm: <strong className="text-slate-900">{service.location}</strong></span>
                </div>
              )}
              {service.duration_minutes && (
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                  <IconClock size={16} className="text-primary-500 flex-shrink-0" />
                  <span>Thời lượng: <strong className="text-slate-900">{service.duration_minutes} phút</strong></span>
                </div>
              )}
              {service.capacity && (
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                  <span className="text-primary-500 font-bold flex-shrink-0">•</span>
                  <span>Sức chứa: <strong className="text-slate-900">{service.capacity} người</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Ticket Types in this Service */}
          {service.ticket_types && service.ticket_types.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-sm mb-3">
                Các hạng vé áp dụng ({service.ticket_types.length})
              </h4>
              <div className="space-y-3">
                {service.ticket_types.map((t, idx) => {
                  const age = ageLabel(t);
                  return (
                    <div
                      key={t._id || idx}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm"
                    >
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">{t.name}</span>
                        <span className="font-black text-primary-700 text-sm sm:text-base">
                          {money(t.price)}
                        </span>
                      </div>
                      {age && age !== 'Mọi độ tuổi' && (
                        <p className="text-xs text-slate-500 mt-1 font-medium">Độ tuổi: {age}</p>
                      )}
                      {t.description && (
                        <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{t.description}</p>
                      )}
                      {t.conditions && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          <strong>Điều kiện: </strong>
                          <span>{t.conditions}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Facility Info */}
          {facility && (
            <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">Địa điểm tổ chức</h4>
              <p className="font-semibold text-slate-800">{facility.name}</p>
              {(facility.address || facility.city) && (
                <p className="text-slate-600">
                  {[facility.address, facility.city].filter(Boolean).join(', ')}
                </p>
              )}
              {facility.contact_phone && (
                <p className="text-slate-600">Điện thoại liên hệ: {facility.contact_phone}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. PHOTO GALLERY COMPONENT
// ─────────────────────────────────────────────────────────────
function AttractionGallery({ facility, images = [] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, images.length]);

  const openLightboxAt = (idx) => {
    if (images.length === 0) return;
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <>
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
                onClick={() => setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
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
                onClick={() => setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
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
                      ? 'border-primary-500 scale-105 shadow-md shadow-primary-500/30'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {images.length === 0 ? (
        <div className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 h-56 sm:h-72 flex flex-col items-center justify-center text-center p-6 text-slate-500 shadow-inner">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3 text-slate-400">
            <IconCamera size={32} />
          </div>
          <div className="font-heading font-bold text-base sm:text-lg text-slate-700 mb-1">{facility.name}</div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">Cơ sở vui chơi chưa tải hình ảnh lên hệ thống.</p>
        </div>
      ) : images.length === 1 ? (
        <div
          className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 h-64 sm:h-80 md:h-[400px] cursor-pointer group"
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
        <div className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-64 sm:h-80 md:h-[400px]">
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
        <div className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-64 sm:h-80 md:h-[400px]">
            <div className="md:col-span-2 relative group cursor-pointer overflow-hidden bg-slate-800 h-full" onClick={() => openLightboxAt(0)}>
              <img src={images[0]} alt={`${facility.name} - 1`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="grid grid-rows-2 gap-2 h-full">
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
        <div className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-64 sm:h-80 md:h-[400px]">
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
        <div className="relative mb-6 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-64 sm:h-80 md:h-[420px]">
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden bg-slate-800" onClick={() => openLightboxAt(0)}>
              <img src={images[0]} alt={facility.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {images.slice(1, 4).map((img, idx) => (
              <div key={idx} className="relative group cursor-pointer overflow-hidden bg-slate-800" onClick={() => openLightboxAt(idx + 1)}>
                <img src={img} alt={`${facility.name} - ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
            <div className="relative group cursor-pointer overflow-hidden bg-slate-800" onClick={() => openLightboxAt(4)}>
              <img src={images[4]} alt={`${facility.name} - 5`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {images.length > 5 && (
                <div className="absolute inset-0 bg-black/60 hover:bg-black/70 transition flex flex-col items-center justify-center text-white font-heading font-bold text-base sm:text-lg">
                  <span>+{images.length - 5}</span>
                  <span className="text-xs font-normal">ảnh khác</span>
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => openLightboxAt(0)} className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200/80 transition-all cursor-pointer hover:scale-102">
            <IconCamera size={16} className="text-primary-500" />
            <span>Xem tất cả {images.length} hình ảnh</span>
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN ATTRACTION DETAIL COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AttractionDetail({ facility }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser } = useAuth();

  const [date, setDate] = useState(() => params.get('date') || localDate());
  const [quantities, setQuantities] = useState(() => {
    const cart = ticketCart.read();
    return cart?.facility_id === facility._id && cart.date === (params.get('date') || localDate())
      ? Object.fromEntries(cart.items.map((i) => [i.line_key || i.inventory_id, i.quantity]))
      : {};
  });
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);

  // Expanded service card ID (defaults to first service when loaded, matches Ảnh 3)
  const [expandedServiceId, setExpandedServiceId] = useState(null);

  // Detail Modal State (Ảnh 4)
  const [detailService, setDetailService] = useState(null);

  const key = `${facility._id}:${date}:${revision}`;
  const loading = result?.key !== key;
  const services = result?.key === key ? result.services : [];
  const error = result?.key === key ? result.error : '';

  useEffect(() => {
    let active = true;
    facilityApi
      .getTicketAvailability(facility._id, date)
      .then((r) => {
        if (active) {
          setResult({ key, services: r.data, error: '' });
          if (!expandedServiceId && r.data?.length > 0) {
            setExpandedServiceId(r.data[0]._id);
          }
        }
      })
      .catch((e) => {
        if (active) setResult({ key, services: [], error: e.message });
      });
    return () => {
      active = false;
    };
  }, [facility._id, date, key]);

  // Aggregate images from facility & services
  const images = (() => {
    const list = [];
    if (facility.primary_image) {
      const highRes = getHighResImageUrl(facility.primary_image);
      if (highRes) list.push(highRes);
    }
    if (Array.isArray(facility.images)) {
      facility.images.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.image_url;
        if (url) {
          const highRes = getHighResImageUrl(url);
          if (highRes && !list.includes(highRes)) list.push(highRes);
        }
      });
    }
    if (Array.isArray(facility.services)) {
      facility.services.forEach((s) => {
        if (Array.isArray(s.photos)) {
          s.photos.forEach((photo) => {
            if (photo) {
              const highRes = getHighResImageUrl(photo);
              if (highRes && !list.includes(highRes)) list.push(highRes);
            }
          });
        }
      });
    }
    return list;
  })();

  const optionsFor = (service, type) =>
    type.schedules?.length
      ? type.schedules.map((row) => ({
          ...row,
          line_key: String(row.inventory_id),
          service_id: service._id,
          ticket_type_id: type._id,
          visit_date: date,
        }))
      : [
          {
            line_key: `${service._id}:${type._id}:${date}`,
            service_id: service._id,
            ticket_type_id: type._id,
            visit_date: date,
            price: type.price,
            time_slot: 'ALL_DAY',
            available_qty: type.requires_schedule ? 0 : 1000,
          },
        ];

  const options = services.flatMap((s) => s.ticket_types.flatMap((t) => optionsFor(s, t)));
  const selected = options.filter((o) => Number(quantities[o.line_key]) > 0 && o.available_qty > 0);
  const total = selected.reduce((sum, o) => sum + o.price * Number(quantities[o.line_key]), 0);

  const checkout = () => {
    if (!selected.length) return;
    ticketCart.write({
      facility_id: facility._id,
      date,
      items: selected.map((o) => ({
        line_key: o.line_key,
        ...(o.inventory_id
          ? { inventory_id: o.inventory_id }
          : { service_id: o.service_id, ticket_type_id: o.ticket_type_id, visit_date: date }),
        quantity: Number(quantities[o.line_key]),
      })),
    });
    navigate('/checkout');
  };

  const handleUpdateQty = (lineKey, newQty) => {
    setQuantities((prev) => ({
      ...prev,
      [lineKey]: Math.max(0, newQty),
    }));
  };

  return (
    <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 font-body text-slate-900">
      {/* Top Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/search?type=ATTRACTION"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition"
        >
          <IconChevronLeft size={16} />
          <span>Điểm tham quan & trải nghiệm</span>
        </Link>
      </div>

      {/* Facility Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 bg-secondary-50 text-secondary-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-secondary-200">
            <IconTicket size={13} />
            Vé vui chơi & trải nghiệm
          </span>
          {facility.category && (
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
              {facility.category}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          {facility.name}
        </h1>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 mt-2">
          <IconMapPin size={16} className="text-primary-500 flex-shrink-0" />
          <span>
            {facility.address ? `${facility.address}, ` : ''}
            {facility.city}
          </span>
        </div>
      </div>

      {/* Hero Adaptive Image Gallery with Lightbox */}
      <AttractionGallery facility={facility} images={images} />

      {/* Facility Description / Overview Card */}
      {facility.description && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 mb-8 shadow-xs">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-slate-900 mb-2">Giới thiệu trải nghiệm</h2>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{facility.description}</p>
          {facility.vendor?.name && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm text-slate-500">
              <span>
                Đơn vị tổ chức: <strong className="text-slate-800">{facility.vendor.name}</strong>
              </span>
              {facility.vendor.email && <span>Email: {facility.vendor.email}</span>}
            </div>
          )}
        </div>
      )}

      {/* Booking Grid: Tickets Packages & Sticky Summary Drawer */}
      <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs">
              <div className="inline-block w-9 h-9 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-base font-semibold text-slate-600">Đang kiểm tra và tải hạng vé...</p>
            </div>
          ) : error ? (
            <div role="alert" className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-700 text-sm shadow-xs">
              <p className="font-bold text-base mb-1">Không thể tải thông tin vé</p>
              <p className="mb-3">{error}</p>
              <button
                type="button"
                className="font-bold underline text-rose-800 hover:text-rose-900 cursor-pointer"
                onClick={() => setRevision((x) => x + 1)}
              >
                Thử tải lại
              </button>
            </div>
          ) : !services.length ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500 shadow-xs">
              <IconTicket size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">Chưa có dịch vụ hoặc hạng vé nào mở bán cho ngày này.</p>
              <p className="text-sm text-slate-400 mt-1">Vui lòng chọn ngày tham quan khác.</p>
            </div>
          ) : (
            services.map((s) => {
              const isExpanded = expandedServiceId === s._id;

              // Calculate min price for this service
              const servicePrices = s.ticket_types?.map((t) => Number(t.price)).filter((p) => !isNaN(p) && p >= 0) || [];
              const minPrice = servicePrices.length ? Math.min(...servicePrices) : 0;

              // Total price and count for this specific service
              const serviceOpts = s.ticket_types?.flatMap((t) => optionsFor(s, t)) || [];
              const serviceSelected = serviceOpts.filter((o) => Number(quantities[o.line_key]) > 0 && o.available_qty > 0);
              const serviceTotal = serviceSelected.reduce((sum, o) => sum + o.price * Number(quantities[o.line_key]), 0);
              const serviceTotalQty = serviceSelected.reduce((sum, o) => sum + Number(quantities[o.line_key]), 0);

              // ── COLLAPSED VIEW (Ảnh 2) ──
              if (!isExpanded) {
                return (
                  <article
                    key={s._id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs hover:border-primary-400 transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">
                        {s.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setDetailService(s)}
                        className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline whitespace-nowrap cursor-pointer flex-shrink-0"
                      >
                        <span>Chi tiết</span>
                        <IconChevronRight size={16} />
                      </button>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Giá chỉ từ</span>
                        <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                          {money(minPrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedServiceId(s._id)}
                        className="border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-extrabold px-8 py-2.5 rounded-full text-sm sm:text-base transition cursor-pointer hover:scale-102"
                      >
                        Chọn
                      </button>
                    </div>
                  </article>
                );
              }

              // ── EXPANDED VIEW (Ảnh 3) ──
              return (
                <article
                  key={s._id}
                  className="bg-white rounded-3xl border-2 border-primary-500 p-6 sm:p-8 shadow-lg transition"
                >
                  {/* Header: Title & Chi tiết link */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 leading-snug">
                      {s.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setDetailService(s)}
                      className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline whitespace-nowrap cursor-pointer flex-shrink-0"
                    >
                      <span>Chi tiết</span>
                      <IconChevronRight size={16} />
                    </button>
                  </div>

                  {/* 2-Column Selection Body: Calendar (Left) & Guests (Right) */}
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Chọn ngày with Inline Calendar */}
                    <div className="md:col-span-6 flex justify-center md:justify-start">
                      <InlineCalendar
                        selectedDate={date}
                        onSelectDate={(newDate) => {
                          setDate(newDate);
                          setQuantities({});
                        }}
                      />
                    </div>

                    {/* Right Column: Ticket Stepper Counters */}
                    <div className="md:col-span-6 space-y-4">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-extrabold text-base text-slate-900">Chọn số lượng vé</span>
                      </div>

                      <div className="divide-y divide-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        {s.ticket_types?.map((t) => {
                          const opts = optionsFor(s, t);
                          const firstOpt = opts[0];
                          if (!firstOpt) return null;
                          const lineKey = firstOpt.line_key;
                          const qty = Number(quantities[lineKey]) || 0;
                          const availQty = firstOpt.available_qty;
                          const subLabel = ageLabel(t);

                          return (
                            <div key={t._id} className="py-3.5 first:pt-0 last:pb-0">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-extrabold text-slate-900 text-base">{t.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
                                  <div className="text-sm font-bold text-primary-700 mt-1">
                                    {money(firstOpt.price)}
                                  </div>
                                  {availQty === 0 && (
                                    <span className="text-xs text-rose-500 font-semibold block mt-1">
                                      Hết vé ngày này
                                    </span>
                                  )}
                                </div>

                                {/* Stepper: (-) qty (+) */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <button
                                    type="button"
                                    disabled={qty <= 0}
                                    onClick={() => handleUpdateQty(lineKey, qty - 1)}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-300 text-slate-700 hover:border-primary-500 hover:text-primary-600 flex items-center justify-center font-black text-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white shadow-xs hover:scale-105"
                                    title="Giảm 1 vé"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-black text-lg sm:text-xl text-slate-900">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={availQty <= 0 || qty >= Math.min(availQty, 1000)}
                                    onClick={() => handleUpdateQty(lineKey, qty + 1)}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-300 text-slate-700 hover:border-primary-500 hover:text-primary-600 flex items-center justify-center font-black text-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white shadow-xs hover:scale-105"
                                    title="Thêm 1 vé"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row (Ảnh 3) */}
                  <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => setExpandedServiceId(null)}
                      className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer py-1.5"
                    >
                      Thu gọn
                    </button>

                    <div className="flex items-center gap-6 ml-auto">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Tổng tiền</span>
                        <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-600 tracking-tight">
                          {money(serviceTotal || minPrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={serviceTotalQty === 0 || Boolean(currentUser && currentUser.role !== 'CUSTOMER')}
                        onClick={checkout}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-extrabold px-8 sm:px-10 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102"
                      >
                        Bước tiếp theo
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Right Sticky Cart Drawer */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs self-start lg:sticky lg:top-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <IconTicket size={20} className="text-primary-600" />
            <h2 className="font-heading font-extrabold text-slate-900 text-lg">Vé đã chọn</h2>
          </div>

          <div className="my-5 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Ngày tham quan:</span>
              <strong className="text-slate-900 font-bold">{formatDateVN(date) || date}</strong>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tổng số vé:</span>
              <strong className="text-slate-900 font-bold">
                {selected.reduce((sum, o) => sum + Number(quantities[o.line_key]), 0)} vé
              </strong>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Tổng cộng</span>
            <span className="font-black text-2xl sm:text-3xl text-primary-600">{money(total)}</span>
          </div>

          <button
            disabled={loading || !selected.length || Boolean(currentUser && currentUser.role !== 'CUSTOMER')}
            onClick={checkout}
            className="w-full mt-6 py-3.5 text-base font-extrabold rounded-2xl bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentUser ? 'Mua vé đã chọn' : 'Đăng nhập & mua vé'}
          </button>

          {currentUser && currentUser.role !== 'CUSTOMER' && (
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-4 text-center">
              Vui lòng đăng nhập tài khoản Khách hàng để tiến hành mua vé.
            </p>
          )}

          {selected.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">
              Vui lòng chọn số lượng vé bạn muốn mua ở danh sách bên trái.
            </p>
          )}
        </aside>
      </div>

      {/* Modal Chi tiết (Ảnh 4) */}
      <ServiceDetailModal
        service={detailService}
        facility={facility}
        onClose={() => setDetailService(null)}
      />
    </main>
  );
}
