import { useEffect, useState } from "react";
import AgodaDatePicker from "../components/common/AgodaDatePicker";
import {
  IconSearch,
  IconCalendar,
  IconFilter,
  IconHotel,
  IconTicket,
  IconMap,
  IconMapPin,
  IconX,
  IconCheck,
  IconZap,
  IconQR,
} from "../components/Icons";

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 ₫";
  return `${Number(amount).toLocaleString("vi-VN")} ₫`;
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

const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowISO = (baseDateStr) => {
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ─────────────────────────────────────────────────────────────
// TOP SEARCH BAR
// ─────────────────────────────────────────────────────────────

function SearchTopBar({
  searchInput, setSearchInput, onSearchSubmit, searchError,
  checkIn, checkOut, onDateChange,
  activeType, onTypeChange,
  activeFilterCount, showMobileFilter, setShowMobileFilter,
  showMap, setShowMap, onClearKeyword,
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3 justify-between">
        {/* Search Input */}
        <form
          onSubmit={onSearchSubmit}
          className={`flex-1 min-w-[260px] max-w-lg flex items-center gap-2 rounded-xl px-3.5 py-2 border transition ${
            searchError
              ? "bg-rose-50/50 border-rose-400 ring-2 ring-rose-100"
              : "bg-slate-100 hover:bg-slate-100/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500 border-slate-200"
          }`}
        >
          <IconSearch size={16} className={searchError ? "text-rose-500 flex-shrink-0" : "text-slate-400 flex-shrink-0"} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchError || "Tìm theo tên chỗ nghỉ, điểm đến, địa chỉ..."}
            className={`w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none ${searchError ? "text-rose-900 placeholder:text-rose-400 font-semibold" : "text-text-primary placeholder:text-slate-400"}`}
          />
          {searchInput && (
            <button type="button" onClick={onClearKeyword} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
              <IconX size={14} />
            </button>
          )}
          <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-lg transition flex-shrink-0 cursor-pointer">Tìm</button>
        </form>

        {/* Date Picker */}
        <div className="relative">
          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition"
          >
            <IconCalendar size={14} className="text-primary-500" />
            <span>{formatDateVN(checkIn) || "Nhận phòng"}</span>
            <span className="text-slate-400 font-normal">→</span>
            <span>{formatDateVN(checkOut) || "Trả phòng"}</span>
          </div>
          <AgodaDatePicker
            isOpen={isCalendarOpen}
            checkIn={checkIn}
            checkOut={checkOut}
            singleDateMode={activeType === "ATTRACTION"}
            onChange={(dates) => { onDateChange(dates); }}
            onClose={() => setIsCalendarOpen(false)}
          />
        </div>

        {/* Type Switch Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { value: "all", label: "Tất cả", icon: <IconFilter size={12} />, activeClass: "bg-white text-primary-600 shadow-xs" },
            { value: "HOTEL", label: "Chỗ nghỉ", icon: <IconHotel size={12} />, activeClass: "bg-primary-500 text-white shadow-xs" },
            { value: "ATTRACTION", label: "Vé vui chơi", icon: <IconTicket size={12} />, activeClass: "bg-secondary-500 text-white shadow-xs" },
          ].map(({ value, label, icon, activeClass }) => {
            const active = activeType === (value === "all" ? "ALL" : value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTypeChange(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${active ? activeClass : "text-slate-600 hover:text-slate-900"}`}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer"
        >
          <IconFilter size={14} className="text-primary-500" />
          <span>Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </button>

        {/* Toggle Map */}
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${showMap ? "bg-primary-50 border-primary-500 text-primary-600" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}
        >
          <IconMap size={14} />
          {showMap ? "Ẩn bản đồ" : "Bản đồ"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTER SIDEBAR
// ─────────────────────────────────────────────────────────────

function SearchFilterSidebar({ filterOptions = { cities: [], amenities: [], priceRange: { min: 0, max: 10000000 } }, filters = {}, localMaxPrice, setLocalMaxPrice, activeFilterCount, onClearFilters, onFilterChange, showMobileFilter }) {
  const currentAmenitiesList = filters.amenities ? filters.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const isAttraction = (filters.type || "").toUpperCase() === "ATTRACTION";

  const handleCityToggle = (cityName) => onFilterChange?.({ city: filters.city === cityName ? "" : cityName });
  const handleStarToggle = (s) => onFilterChange?.({ stars: filters.stars === String(s) ? "" : s });
  const handleAmenityToggle = (amenityName) => {
    const next = currentAmenitiesList.includes(amenityName)
      ? currentAmenitiesList.filter((a) => a !== amenityName)
      : [...currentAmenitiesList, amenityName];
    onFilterChange?.({ amenities: next.join(",") });
  };
  const handleRatingSelect = (val) => onFilterChange?.({ minRating: filters.minRating === String(val) ? "" : val });
  const sliderMax = 10000000;
  const sliderStep = 100000;
  const displayedMaxPrice = localMaxPrice || sliderMax;

  const isPresetActive = (min, max) => {
    const curMin = filters.minPrice !== undefined && filters.minPrice !== "" ? Number(filters.minPrice) : null;
    const curMax = filters.maxPrice !== undefined && filters.maxPrice !== "" ? Number(filters.maxPrice) : null;

    if (min === 0 && max) {
      return curMax === max && (curMin === null || curMin === 0);
    }
    if (min && max && max !== sliderMax) {
      return curMin === min && curMax === max;
    }
    if (max === sliderMax || max === "" || !max) {
      return curMin === min && (curMax === null || curMax >= sliderMax);
    }
    return false;
  };

  const handlePricePreset = (min, max) => {
    if (isPresetActive(min, max)) {
      onFilterChange?.({ minPrice: "", maxPrice: "" });
      setLocalMaxPrice(sliderMax);
    } else {
      onFilterChange?.({ minPrice: min !== undefined ? min : "", maxPrice: max !== undefined ? max : "" });
      setLocalMaxPrice(max || sliderMax);
    }
  };

  const pricePresets = isAttraction
    ? [
        [0, 300000, "Dưới 300k"],
        [300000, 600000, "300k - 600k"],
        [600000, 1000000, "600k - 1 triệu"],
        [1000000, 10000000, "Trên 1 triệu"],
      ]
    : [
        [0, 1500000, "Dưới 1,5 triệu"],
        [1500000, 3000000, "1,5 - 3 triệu"],
        [3000000, 6000000, "3 - 6 triệu"],
        [6000000, 10000000, "Trên 6 triệu"],
      ];

  return (
    <aside className={`w-full lg:w-72 flex-shrink-0 ${showMobileFilter ? "block" : "hidden lg:block"}`}>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-32 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <IconFilter size={16} className="text-primary-500" />
            <h2 className="font-heading font-700 text-slate-900 text-base">Bộ lọc {isAttraction ? "vé vui chơi" : "tìm kiếm"}</h2>
          </div>
          {activeFilterCount > 0 && (
            <button type="button" onClick={onClearFilters} className="text-xs text-primary-600 hover:text-primary-700 font-bold cursor-pointer">
              Xóa tất cả ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Price Range */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
            <span>{isAttraction ? "Giá vé tối đa" : "Khoảng giá tối đa"}</span>
            <span className="text-primary-600 font-extrabold text-sm">{formatVND(displayedMaxPrice)}</span>
          </div>
          <input
            type="range"
            min={100000}
            max={sliderMax}
            step={sliderStep}
            value={displayedMaxPrice}
            onChange={(e) => setLocalMaxPrice(Number(e.target.value))}
            onMouseUp={(e) => onFilterChange?.({ maxPrice: Number(e.target.value) })}
            onTouchEnd={(e) => onFilterChange?.({ maxPrice: Number(e.target.value) })}
            className="w-full accent-primary-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>100.000 ₫</span><span>10.000.000 ₫</span></div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {pricePresets.map(([min, max, label]) => {
              const isSelected = isPresetActive(min, max);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePricePreset(min, max)}
                  className={`text-[11px] font-bold py-1.5 px-2 rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-primary-500 border-primary-500 text-white shadow-xs"
                      : "border-slate-200 hover:border-primary-500 hover:bg-primary-50 text-slate-700 bg-white"
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && <IconCheck size={11} className="text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Star Rating - Only for Hotels */}
        {!isAttraction && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Xếp hạng sao khách sạn</p>
            <div className="grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map((s) => {
                const isSelected = filters.stars === String(s);
                return (
                  <button key={s} type="button" onClick={() => handleStarToggle(s)} className={`flex flex-col items-center justify-center py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${isSelected ? "bg-amber-50 border-amber-500 text-amber-700 shadow-xs" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}>
                    <span className="text-amber-500 flex items-center">{s}★</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* City Filter */}
        {filterOptions.cities && filterOptions.cities.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Thành phố / Điểm đến</p>
            <div className="space-y-2">
              {filterOptions.cities.map((city) => (
                <label key={city} className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-slate-700 hover:text-primary-600 group">
                  <input type="checkbox" checked={filters.city === city} onChange={() => handleCityToggle(city)} className="w-4 h-4 rounded text-primary-500 focus:ring-primary-400 accent-primary-500 cursor-pointer" />
                  <span>{city}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Guest Rating */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Đánh giá của khách hàng</p>
          <div className="space-y-1.5">
            {[["4.8", "Tuyệt hảo (4.8+)"], ["4.5", "Rất tốt (4.5+)"], ["4.0", "Hài lòng (4.0+)"]].map(([val, label]) => {
              const isSelected = filters.minRating === val;
              return (
                <button key={val} type="button" onClick={() => handleRatingSelect(val)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${isSelected ? "bg-primary-50 border-primary-500 text-primary-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  <span>{label}</span>
                  {isSelected && <IconCheck size={12} className="text-primary-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amenities */}
        {filterOptions.amenities && filterOptions.amenities.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              {isAttraction ? "Dịch vụ & Trải nghiệm đi kèm" : "Tiện ích nổi bật"}
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filterOptions.amenities.map((amen) => {
                const isChecked = currentAmenitiesList.includes(amen.name);
                return (
                  <label key={amen._id} className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 hover:text-primary-600 group">
                    <input type="checkbox" checked={isChecked} onChange={() => handleAmenityToggle(amen.name)} className="w-4 h-4 rounded text-primary-500 focus:ring-primary-400 accent-primary-500 cursor-pointer" />
                    <span>{amen.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────────────────────────

function StarRow({ count = 5 }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={12} height={12} viewBox="0 0 24 24" fill={i <= count ? "#f59e0b" : "#e2e8f0"}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function SearchResultCard({ item, onNavigateDetail }) {
  const isHotel = item.type === "HOTEL";
  return (
    <div
      onClick={() => onNavigateDetail?.(item._id)}
      className="bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition duration-200 overflow-hidden flex flex-col md:flex-row cursor-pointer group"
    >
      {/* Image */}
      <div className="w-full md:w-72 h-52 flex-shrink-0 relative overflow-hidden bg-slate-100">
        {item.primary_image ? (
          <img src={item.primary_image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            {isHotel ? <IconHotel size={28} /> : <IconTicket size={28} />}
            <span className="text-[11px] font-medium mt-1">Cơ sở chưa có ảnh</span>
          </div>
        )}
        <div className={`absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md text-white ${isHotel ? "bg-primary-500" : "bg-secondary-500"}`}>
          {isHotel ? <><IconHotel size={11} /> Chỗ nghỉ</> : <><IconTicket size={11} /> Vé vui chơi</>}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isHotel ? (
              <div className="flex items-center gap-1.5">
                <StarRow count={item.stars || 5} />
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{item.stars || 5} sao</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded">Trải nghiệm hấp dẫn</span>
            )}
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <IconMapPin size={12} className="text-slate-400" /> {item.city}
            </span>
          </div>

          <h3 className="font-heading font-700 text-slate-900 text-lg group-hover:text-primary-600 transition leading-snug mb-1">{item.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-1 mb-2">{item.address}</p>
          {item.description && <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100"><IconZap size={10} /> Xác nhận tức thì</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100"><IconQR size={10} /> Vé QR điện tử</span>
            {isHotel && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100"><IconCheck size={10} /> Miễn phí hủy phòng</span>}
          </div>

          {item.amenities && item.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.amenities.slice(0, 4).map((amen) => (
                <span key={amen._id || amen.name} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{amen.name}</span>
              ))}
              {item.amenities.length > 4 && <span className="text-[11px] font-medium text-slate-400 px-1 py-0.5">+{item.amenities.length - 4} tiện ích khác</span>}
            </div>
          )}
        </div>

        {/* Bottom Row */}
        <div className="flex items-end justify-between pt-4 mt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary-500 text-white text-xs font-black w-8 h-8 rounded-xl flex items-center justify-center shadow-xs">
              {item.rating ? Number(item.rating).toFixed(1) : "Mới"}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {item.rating ? item.rating >= 4.8 ? "Tuyệt hảo" : item.rating >= 4.5 ? "Xuất sắc" : item.rating >= 4.0 ? "Rất tốt" : "Hài lòng" : "Mới"}
              </div>
              <div className="text-[10px] text-slate-400">{item.review_count > 0 ? `${item.review_count} đánh giá` : "Cơ sở mới trên Travelio"}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Giá chỉ từ</div>
            <div className="font-heading font-800 text-primary-600 text-xl tracking-tight leading-tight">{formatVND(item.min_price)}</div>
            <div className="text-[10px] text-slate-400 mb-2">{isHotel ? "mỗi đêm" : "mỗi vé / người"}</div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigateDetail?.(item._id); }}
              className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs hover:shadow cursor-pointer"
            >
              {isHotel ? "Xem phòng & giá" : "Đặt vé ngay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON / EMPTY STATE / MAP BANNER / PAGINATION
// ─────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse flex flex-col md:flex-row">
          <div className="w-full md:w-72 h-52 bg-slate-200 flex-shrink-0" />
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-3/4 h-6 bg-slate-200 rounded" />
              <div className="w-1/2 h-4 bg-slate-200 rounded" />
              <div className="flex gap-2">
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </div>
            </div>
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-32 h-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchEmptyState({ onClearFilters }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <IconSearch size={28} />
      </div>
      <h3 className="font-heading font-700 text-slate-800 text-lg mb-1">Không tìm thấy dịch vụ phù hợp</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">Rất tiếc, không có chỗ nghỉ hoặc vé vui chơi nào khớp với điều kiện tìm kiếm của bạn. Hãy thử đổi từ khóa hoặc điều chỉnh khoảng giá/bộ lọc.</p>
      {onClearFilters && (
        <button type="button" onClick={onClearFilters} className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-primary-500/20 transition cursor-pointer">
          Xóa tất cả bộ lọc
        </button>
      )}
    </div>
  );
}

function SearchMapBanner({ showMap, facilities = [], onNavigateDetail }) {
  if (!showMap) return null;
  return (
    <div className="bg-slate-100 rounded-2xl h-56 mb-5 overflow-hidden relative border border-slate-200 shadow-inner">
      <img
        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=450&fit=crop&auto=format"
        alt="Bản đồ các địa điểm du lịch"
        className="w-full h-full object-cover opacity-60"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-dark/20 backdrop-blur-xs">
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-5 py-2.5 text-xs font-bold text-slate-800 shadow-lg flex items-center gap-2">
          <IconMap size={16} className="text-primary-500" />
          Bản đồ tương tác — Hiển thị {facilities.length} địa điểm trong khu vực
        </div>
      </div>
      {facilities.slice(0, 4).map((f, i) => {
        const offsets = [{ top: "28%", left: "35%" }, { top: "52%", left: "58%" }, { top: "68%", left: "25%" }, { top: "40%", left: "75%" }];
        const pos = offsets[i] || offsets[0];
        return (
          <div key={f._id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition" style={{ top: pos.top, left: pos.left }} onClick={() => onNavigateDetail?.(f._id)}>
            <div className="bg-primary-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border-2 border-white">{formatVND(f.min_price)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SearchPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => (
        <button
          key={pageNum}
          type="button"
          onClick={() => onPageChange?.(pageNum)}
          className={`w-9 h-9 rounded-xl text-xs font-bold transition cursor-pointer ${pagination.page === pageNum ? "bg-primary-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
        >
          {pageNum}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function SearchResultsScreen({
  facilities = [],
  pagination = { total: 0, page: 1, limit: 10, totalPages: 1 },
  filterOptions = { cities: [], amenities: [], priceRange: { min: 0, max: 10000000 } },
  loading = false,
  error = null,
  filters = {},
  onFilterChange,
  onClearFilters,
  onNavigateDetail,
  onRetry,
}) {
  const [searchInput, setSearchInput] = useState(filters.keyword || "");
  const [showMap, setShowMap] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [checkIn, setCheckIn] = useState(filters.checkIn || getTodayISO());
  const [checkOut, setCheckOut] = useState(filters.checkOut || getTomorrowISO());
  const isAttraction = (filters.type || "").toUpperCase() === "ATTRACTION";
  const [localMaxPrice, setLocalMaxPrice] = useState(
    filters.maxPrice ? Number(filters.maxPrice) : 10000000
  );
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    setSearchInput(filters.keyword || "");
    if (filters.checkIn) setCheckIn(filters.checkIn);
    if (filters.checkOut) setCheckOut(filters.checkOut);
    if (filters.maxPrice) {
      setLocalMaxPrice(Number(filters.maxPrice));
    } else {
      setLocalMaxPrice(10000000);
    }
  }, [filters.keyword, filters.checkIn, filters.checkOut, filters.maxPrice]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchInput.trim() && !filters.keyword) {
      setSearchError("Vui lòng nhập tên chỗ nghỉ hoặc địa điểm!");
      setTimeout(() => setSearchError(""), 3000);
      return;
    }
    setSearchError("");
    onFilterChange?.({ keyword: searchInput.trim() });
  };

  const handleDateChange = (dates) => {
    if (dates.checkIn) setCheckIn(dates.checkIn);
    if (dates.checkOut) setCheckOut(dates.checkOut);
    onFilterChange?.({ checkIn: dates.checkIn, checkOut: dates.checkOut });
  };

  const currentAmenitiesList = filters.amenities ? filters.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const activeType = filters.type ? filters.type.toUpperCase() : "ALL";
  const activeFilterCount = [
    filters.type && filters.type !== "all",
    filters.city,
    filters.stars,
    filters.minRating,
    filters.minPrice,
    filters.maxPrice,
    ...currentAmenitiesList,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <SearchTopBar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        searchError={searchError}
        checkIn={checkIn}
        checkOut={checkOut}
        onDateChange={handleDateChange}
        activeType={activeType}
        onTypeChange={(typeVal) => onFilterChange?.({ type: typeVal === "all" ? "" : typeVal })}
        activeFilterCount={activeFilterCount}
        showMobileFilter={showMobileFilter}
        setShowMobileFilter={setShowMobileFilter}
        showMap={showMap}
        setShowMap={setShowMap}
        onClearKeyword={() => { setSearchInput(""); onFilterChange?.({ keyword: "" }); }}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-7">
          <SearchFilterSidebar
            filterOptions={filterOptions}
            filters={filters}
            localMaxPrice={localMaxPrice}
            setLocalMaxPrice={setLocalMaxPrice}
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            onFilterChange={onFilterChange}
            showMobileFilter={showMobileFilter}
          />

          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h1 className="font-heading font-700 text-slate-900 text-lg">
                  {loading ? "Đang tìm kiếm cơ sở phù hợp..." : (
                    <>Tìm thấy{" "}<span className="text-primary-600 font-extrabold">{pagination.total}</span>{" "}kết quả phù hợp</>
                  )}
                </h1>
                {filters.keyword && (
                  <p className="text-xs text-slate-500 mt-0.5">Từ khóa:{" "}<span className="font-semibold text-slate-700">"{filters.keyword}"</span></p>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={filters.sortBy || "recommended"}
                  onChange={(e) => onFilterChange?.({ sortBy: e.target.value })}
                  className="bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="recommended">Được đề xuất nhiều nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating_desc">Đánh giá cao nhất</option>
                  <option value="newest">Mới cập nhật</option>
                </select>
              </div>
            </div>

            {/* Active Filter Badges */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-400 mr-1">Bộ lọc đang bật:</span>
                {filters.type && filters.type !== "all" && (
                  <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg font-bold">
                    {filters.type === "HOTEL" ? "Chỗ nghỉ" : "Vé vui chơi"}
                    <button type="button" onClick={() => onFilterChange?.({ type: "" })} className="hover:text-primary-900 cursor-pointer"><IconX size={12} /></button>
                  </span>
                )}
                {filters.city && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold">
                    {filters.city}
                    <button type="button" onClick={() => onFilterChange?.({ city: "" })} className="hover:text-blue-900 cursor-pointer"><IconX size={12} /></button>
                  </span>
                )}
                {filters.stars && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold">
                    {filters.stars}★
                    <button type="button" onClick={() => onFilterChange?.({ stars: "" })} className="hover:text-amber-900 cursor-pointer"><IconX size={12} /></button>
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                    ≤ {formatVND(filters.maxPrice)}
                    <button type="button" onClick={() => onFilterChange?.({ maxPrice: "" })} className="hover:text-slate-900 cursor-pointer"><IconX size={12} /></button>
                  </span>
                )}
                {currentAmenitiesList.map((amen) => (
                  <span key={amen} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold">
                    {amen}
                    <button type="button" onClick={() => { const next = currentAmenitiesList.filter((a) => a !== amen); onFilterChange?.({ amenities: next.join(",") }); }} className="hover:text-emerald-900 cursor-pointer"><IconX size={12} /></button>
                  </span>
                ))}
                <button type="button" onClick={onClearFilters} className="text-primary-600 hover:text-primary-700 font-bold ml-auto cursor-pointer">Xóa tất cả</button>
              </div>
            )}

            <SearchMapBanner showMap={showMap} facilities={facilities} onNavigateDetail={onNavigateDetail} />

            {/* Error */}
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 p-4 rounded-2xl mb-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Có lỗi xảy ra khi tải dữ liệu</p>
                  <p className="text-xs text-danger-600 mt-0.5">{error}</p>
                </div>
                {onRetry && (
                  <button onClick={onRetry} className="bg-danger-600 hover:bg-danger-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer">Thử lại</button>
                )}
              </div>
            )}

            {loading && <SearchSkeleton />}
            {!loading && !error && facilities.length === 0 && <SearchEmptyState onClearFilters={onClearFilters} />}
            {!loading && !error && facilities.length > 0 && (
              <div className="space-y-4">
                {facilities.map((item) => (
                  <SearchResultCard key={item._id} item={item} onNavigateDetail={onNavigateDetail} />
                ))}
              </div>
            )}

            {!loading && <SearchPagination pagination={pagination} onPageChange={(pageNum) => onFilterChange?.({ page: pageNum })} />}
          </main>
        </div>
      </div>
    </div>
  );
}
