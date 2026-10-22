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

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setViewDate((prev) => {
          if (prev.getFullYear() !== d.getFullYear() || prev.getMonth() !== d.getMonth()) {
            return new Date(d.getFullYear(), d.getMonth(), 1);
          }
          return prev;
        });
      }
    }
  }, [selectedDate]);

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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectDate(item.dateStr);
              }}
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
// ATTRACTION REVIEWS COMPONENT
// ─────────────────────────────────────────────────────────────
function AttractionReviews({ facility, currentUser, onRefresh }) {
  const navigate = useNavigate();
  const reviews = Array.isArray(facility?.reviews) ? facility.reviews : [];
  const reviewCount = facility?.review_count ?? reviews.length;
  const avgRating = facility?.rating
    ? Number(facility.rating).toFixed(1)
    : reviews.length
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
    : null;

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (facility?.customer_review) {
      setNewRating(facility.customer_review.rating || 5);
      setNewComment(facility.customer_review.comment || '');
    }
  }, [facility?.customer_review]);

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.round(Number(r.rating)) || 5;
    if (ratingCounts[star] !== undefined) ratingCounts[star]++;
  });

  const canManageReviews = currentUser?.role === 'ACTIVITY_VENDOR' && String(facility.vendor_id) === String(currentUser.id || currentUser._id);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');
    if (!newComment.trim()) {
      setReviewError('Vui lòng nhập nội dung đánh giá của bạn.');
      return;
    }
    try {
      setSubmittingReview(true);
      await facilityApi.createReview(facility._id, { rating: newRating, comment: newComment.trim() });
      setReviewSuccess('Nhận xét của bạn đã được ghi nhận thành công!');
      setNewComment('');
      onRefresh?.();
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || 'Không thể gửi nhận xét. Vui lòng thử lại.');
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
      setReplyText('');
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <section className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900">
            Đánh giá & Nhận xét từ du khách
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Phản hồi thực tế từ những du khách đã tham quan tại <strong>{facility?.name}</strong>
          </p>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center sm:border-r sm:border-slate-200 sm:pr-8 shrink-0">
          <div className="font-heading font-black text-4xl sm:text-5xl text-primary-600 mb-1">
            {avgRating || '5.0'}
          </div>
          <div className="flex justify-center text-amber-400 gap-0.5 text-lg mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={s <= Math.round(Number(avgRating) || 5) ? 'text-amber-400' : 'text-slate-200'}>
                ★
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {reviewCount > 0 ? `Dựa trên ${reviewCount} đánh giá thực tế` : 'Chưa có lượt đánh giá nào'}
          </div>
        </div>

        <div className="flex-1 w-full space-y-2 text-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star] || 0;
            const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="w-12 text-slate-700 font-bold">{star} sao</span>
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-slate-500 font-semibold">{count > 0 ? `${pct}%` : '0%'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Form */}
      <div className="mb-8 p-6 bg-primary-50/40 rounded-2xl border border-primary-100">
        <h3 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 mb-2">
          Viết nhận xét của bạn
        </h3>
        {currentUser ? (
          facility?.has_purchased ? (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <IconCheck size={13} className="text-emerald-600" /> Đã mua vé tham quan tại cơ sở này
                </span>
                {facility?.customer_review && (
                  <span className="text-xs text-slate-500 font-medium">
                    (Bạn đang chỉnh sửa đánh giá đã gửi)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Đánh giá sao:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className={`text-2xl transition cursor-pointer ${s <= newRating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}
                      title={`${s} sao`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-600">{newRating} sao</span>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm thực tế về điểm tham quan, quy trình vào cổng, dịch vụ vui chơi..."
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {reviewError && <p className="text-xs font-bold text-rose-600">{reviewError}</p>}
              {reviewSuccess && <p className="text-xs font-bold text-emerald-600">{reviewSuccess}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Đang gửi...' : (facility?.customer_review ? 'Cập nhật nhận xét' : 'Gửi nhận xét')}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-500 font-bold text-base mt-0.5">🔒</span>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Chỉ khách hàng đã mua vé tham quan thành công mới có thể đánh giá
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Hệ thống xác thực từ lịch sử đơn hàng đã hoàn tất để đảm bảo phản hồi thật và minh bạch.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-600">
              Bạn đã từng tham quan tại {facility?.name}? Đăng nhập bằng tài khoản đã mua vé để gửi nhận xét!
            </p>
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
            >
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
                    <img
                      src={rev.customer_avatar}
                      alt={rev.customer_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shadow-xs">
                      {rev.customer_name?.charAt(0) || 'K'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {rev.customer_name || 'Khách tham quan'}
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        Đã trải nghiệm
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {rev.created_at
                        ? new Date(rev.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Khách hàng'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                  <span className="text-amber-400">★</span>
                  <span className="text-xs font-bold text-amber-700">{rev.rating || 5}.0</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">
                {rev.comment}
              </p>

              {rev.vendor_reply && (
                <div className="mt-3 ml-13 p-3.5 bg-slate-50 rounded-xl border-l-4 border-primary-500 text-xs">
                  <div className="font-bold text-slate-800 mb-1">
                    Phản hồi từ Nhà cung cấp tham quan:
                  </div>
                  <p className="text-slate-600 leading-relaxed italic whitespace-pre-wrap break-words">
                    "{rev.vendor_reply}"
                  </p>
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
                        <button
                          type="button"
                          disabled={submittingReply}
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={submittingReply || !replyText.trim()}
                          onClick={() => handleSubmitReply(rev._id)}
                          className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(rev._id);
                        setReplyText(rev.vendor_reply || '');
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      💬 {rev.vendor_reply ? 'Chỉnh sửa phản hồi' : 'Phản hồi nhận xét này'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
          Chưa có đánh giá nào được ghi nhận cho địa điểm này.
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN ATTRACTION DETAIL COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AttractionDetail({ facility, onRefresh }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser } = useAuth();

  const initialVisitDate = params.get('checkIn') || params.get('date') || localDate();
  const [date, setDate] = useState(() => initialVisitDate);
  const [quantities, setQuantities] = useState(() => {
    const cart = ticketCart.read();
    return cart?.facility_id === facility._id && cart.date === initialVisitDate
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
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const initialLoading = !result && (!facility.services || facility.services.length === 0);
  const services = result?.services || facility.services || [];
  const error = result?.error || '';

  useEffect(() => {
    let active = true;
    setIsUpdatingDate(true);
    facilityApi
      .getTicketAvailability(facility._id, date)
      .then((r) => {
        if (active) {
          const availServices = r.data?.length ? r.data : (facility.services || []);
          setResult({ key, services: availServices, error: '' });
          if (!expandedServiceId && availServices.length > 0) {
            setExpandedServiceId(availServices[0]._id);
          }
        }
      })
      .catch((e) => {
        if (active) {
          setResult((prev) => ({
            key,
            services: prev?.services || facility.services || [],
            error: e.message,
          }));
        }
      })
      .finally(() => {
        if (active) setIsUpdatingDate(false);
      });
    return () => {
      active = false;
    };
  }, [facility._id, date, revision]);

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
  const [checkoutError, setCheckoutError] = useState('');
  const selected = options.filter((o) => Number(quantities[o.line_key]) > 0 && o.available_qty > 0);
  const total = selected.reduce((sum, o) => sum + o.price * Number(quantities[o.line_key]), 0);

  const checkout = () => {
    if (!currentUser) {
      if (selected.length > 0) {
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
      }
      navigate('/auth/login', {
        state: {
          returnUrl: date ? `/facilities/${facility._id}?date=${date}` : `/facilities/${facility._id}`,
        },
      });
      return;
    }
    if (!date) {
      setCheckoutError('Vui lòng chọn ngày tham quan!');
      setTimeout(() => setCheckoutError(''), 4000);
      return;
    }
    if (date < localDate()) {
      setCheckoutError('Ngày tham quan không thể ở trong quá khứ!');
      setTimeout(() => setCheckoutError(''), 4000);
      return;
    }
    if (!selected.length) {
      setCheckoutError('Vui lòng chọn ít nhất 1 vé để tiếp tục đặt vé!');
      setTimeout(() => setCheckoutError(''), 4000);
      return;
    }

    const totalTickets = selected.reduce((sum, o) => sum + Number(quantities[o.line_key]), 0);
    if (totalTickets > 30) {
      setCheckoutError('Số lượng vé đặt trực tuyến tối đa là 30 vé. Vui lòng liên hệ hotline với đoàn lớn hơn!');
      setTimeout(() => setCheckoutError(''), 4500);
      return;
    }

    // Business check: If child ticket is chosen, is there at least 1 adult ticket?
    let hasChildTicket = false;
    let hasAdultTicket = false;
    selected.forEach((o) => {
      const type = services.flatMap((s) => s.ticket_types).find((t) => t._id === o.ticket_type_id);
      const name = (type?.name || '').toLowerCase();
      if (name.includes('trẻ em') || name.includes('child') || (type?.max_age != null && type.max_age < 18)) {
        hasChildTicket = true;
      } else {
        hasAdultTicket = true;
      }
    });

    if (hasChildTicket && !hasAdultTicket) {
      setCheckoutError('Trẻ em cần ít nhất 1 vé người lớn đi cùng tại khu vui chơi!');
      setTimeout(() => setCheckoutError(''), 4500);
      return;
    }

    setCheckoutError('');
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

    const firstSelected = selected[0];
    const serviceObj = services.find((s) => s._id === firstSelected?.service_id);
    const serviceName = serviceObj?.name || 'Vé tham quan & trải nghiệm';

    navigate('/checkout', {
      state: {
        facilityId: facility._id,
        facilityName: facility.name,
        facilityAddress: facility.address,
        facilityCity: facility.city,
        facilityImage: images[0] || facility.primary_image || null,
        type: 'ATTRACTION',
        serviceId: firstSelected?.service_id,
        serviceName,
        servicePrice: total / (totalTickets || 1),
        nights: 1,
        rooms: 1,
        guests: totalTickets,
        checkInDate: date,
        checkOutDate: date,
        totalAmount: total,
        selectedItems: selected.map((o) => ({
          line_key: o.line_key,
          ...(o.inventory_id
            ? { inventory_id: o.inventory_id }
            : { service_id: o.service_id, ticket_type_id: o.ticket_type_id, visit_date: date }),
          quantity: Number(quantities[o.line_key]),
          price: o.price,
        })),
      },
    });
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
          {initialLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs">
              <div className="inline-block w-9 h-9 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-base font-semibold text-slate-600">Đang kiểm tra và tải hạng vé...</p>
            </div>
          ) : error && !services.length ? (
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
                  {checkoutError && (
                    <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
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
                        disabled={
                          (currentUser ? serviceTotalQty === 0 : false) ||
                          Boolean(currentUser && currentUser.role !== 'CUSTOMER')
                        }
                        onClick={checkout}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-extrabold px-8 sm:px-10 py-3.5 rounded-full text-base shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102"
                      >
                        {currentUser ? 'Bước tiếp theo' : 'Đăng nhập & đặt vé'}
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

          {checkoutError && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="text-rose-500 font-bold shrink-0">⚠️</span>
              <span>{checkoutError}</span>
            </div>
          )}

          <button
            disabled={
              initialLoading ||
              (currentUser ? !selected.length : false) ||
              Boolean(currentUser && currentUser.role !== 'CUSTOMER')
            }
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
              {currentUser
                ? 'Vui lòng chọn số lượng vé bạn muốn mua ở danh sách bên trái.'
                : 'Bạn có thể đăng nhập ngay hoặc chọn vé trước khi đăng nhập.'}
            </p>
          )}
        </aside>
      </div>

      {/* Review Section */}
      <AttractionReviews
        facility={facility}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />

      {/* Modal Chi tiết (Ảnh 4) */}
      <ServiceDetailModal
        service={detailService}
        facility={facility}
        onClose={() => setDetailService(null)}
      />
    </main>
  );
}
