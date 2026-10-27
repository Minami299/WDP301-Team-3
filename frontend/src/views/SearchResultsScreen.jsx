import { useEffect, useState } from "react";
import AgodaDatePicker from "../components/common/AgodaDatePicker";
import AgodaRoomGuestPicker from "../components/common/AgodaRoomGuestPicker";
import {
  IconSearch,
  IconCalendar,
  IconUsers,
  IconFilter,
  IconHotel,
  IconTicket,
  IconMap,
  IconMapPin,
  IconX,
  IconCheck,
  IconZap,
  IconQR,
  IconChevronDown,
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

const formatAgodaDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const days = [
      "Chủ nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayOfWeek = days[d.getDay()];
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return {
      main: `${day} tháng ${month} ${year}`,
      sub: dayOfWeek,
    };
  } catch {
    return null;
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
  rooms, setRooms, adults, setAdults, childrenCount, setChildrenCount, childrenAges, setChildrenAges, onRoomGuestChange,
  activeType, onTypeChange,
  activeFilterCount, showMobileFilter, setShowMobileFilter,
  showMap, setShowMap, onClearKeyword,
  isCalendarOpen, setIsCalendarOpen,
  dateHighlight,
}) {
  const [isRoomGuestOpen, setIsRoomGuestOpen] = useState(false);
  const checkInInfo = formatAgodaDate(checkIn);
  const checkOutInfo = formatAgodaDate(checkOut);
  const nights = (checkIn && checkOut)
    ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div id="search-top-bar" className="bg-[#1c2c4c] border-b border-slate-700/60 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3 justify-between">
        {/* Main Search Controls */}
        <div className="flex-1 flex flex-wrap items-center gap-2.5 min-w-0">
          {/* 1. Destination Input */}
          <div
            className={`min-w-[200px] flex-1 max-w-sm flex items-center gap-2 rounded-xl px-3 h-11 border transition ${
              searchError
                ? "bg-rose-50 border-rose-400 ring-2 ring-rose-200"
                : "bg-white hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 border-transparent shadow-xs"
            }`}
          >
            <IconSearch size={16} className={searchError ? "text-rose-500 shrink-0" : "text-slate-400 shrink-0"} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchSubmit?.();
                }
              }}
              placeholder={searchError || (activeType === "ATTRACTION" ? "Nhập địa điểm du lịch hoặc tên khu vui chơi..." : "Nhập địa điểm du lịch hoặc tên khách sạn...")}
              className={`w-full bg-transparent text-xs sm:text-sm font-semibold focus:outline-none ${searchError ? "text-rose-900 placeholder:text-rose-400 font-bold" : "text-slate-800 placeholder:text-slate-400"}`}
            />
            {searchInput && (
              <button type="button" onClick={onClearKeyword} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* 2. Date Picker (Agoda dual compartment) */}
          <div className="relative">
            <div
              onClick={() => {
                setIsCalendarOpen(!isCalendarOpen);
                setIsRoomGuestOpen(false);
              }}
              className={`flex items-center gap-2 h-11 px-3.5 rounded-xl border transition cursor-pointer select-none bg-white shadow-xs ${
                dateHighlight
                  ? "ring-4 ring-amber-400 border-amber-400 animate-pulse bg-amber-50"
                  : checkIn && checkOut
                  ? "hover:bg-slate-50 border-transparent"
                  : "border-amber-300 ring-2 ring-amber-200/80 bg-white"
              }`}
            >
              {activeType === "ATTRACTION" ? (
                <div className="flex items-center gap-2 min-w-[140px]">
                  <IconCalendar size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {checkIn ? formatDateVN(checkIn) : "Chọn ngày sử dụng"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal leading-none mt-0.5">Vé vui chơi</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Compartment Nhận phòng */}
                  <div className="flex items-center gap-2 min-w-[115px]">
                    <IconCalendar size={16} className={checkIn ? "text-blue-600 shrink-0" : "text-amber-600 shrink-0"} />
                    <div>
                      <div className={`text-xs font-bold leading-tight ${checkIn ? "text-slate-800" : "text-amber-900"}`}>
                        {checkInInfo ? checkInInfo.main : "Nhận phòng"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal leading-none mt-0.5">
                        {checkInInfo ? checkInInfo.sub : "Chọn ngày đến"}
                      </div>
                    </div>
                  </div>

                  <div className="w-[1px] h-6 bg-slate-200 mx-1" />

                  {/* Compartment Trả phòng */}
                  <div className="flex items-center gap-2 min-w-[115px]">
                    <IconCalendar size={16} className={checkOut ? "text-blue-600 shrink-0" : "text-amber-600 shrink-0"} />
                    <div>
                      <div className={`text-xs font-bold leading-tight ${checkOut ? "text-slate-800" : "text-amber-900"}`}>
                        {checkOutInfo ? checkOutInfo.main : "Trả phòng"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal leading-none mt-0.5">
                        {checkOutInfo ? checkOutInfo.sub : "Chọn ngày đi"}
                      </div>
                    </div>
                  </div>

                  {checkIn && checkOut && nights > 0 && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-extrabold border border-blue-100 ml-1 shrink-0">
                      {nights} đêm
                    </span>
                  )}
                </>
              )}
            </div>

            <AgodaDatePicker
              isOpen={isCalendarOpen}
              checkIn={checkIn}
              checkOut={checkOut}
              singleDateMode={activeType === "ATTRACTION"}
              onChange={(dates) => { onDateChange(dates); }}
              onComplete={() => {
                setIsCalendarOpen(false);
              }}
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>

          {/* 3. Room & Guest Picker */}
          <div className="relative">
            <AgodaRoomGuestPicker
              isOpen={isRoomGuestOpen}
              onToggle={() => {
                setIsRoomGuestOpen(!isRoomGuestOpen);
                setIsCalendarOpen(false);
              }}
              onClose={() => setIsRoomGuestOpen(false)}
              onDone={(newParams) => {
                onRoomGuestChange?.(newParams);
                setIsRoomGuestOpen(false);
              }}
              rooms={rooms}
              setRooms={setRooms}
              adults={adults}
              setAdults={setAdults}
              childrenCount={childrenCount}
              setChildrenCount={setChildrenCount}
              childrenAges={childrenAges}
              setChildrenAges={setChildrenAges}
              activeTab={activeType === "ATTRACTION" ? "attractions" : "stays"}
              compact={true}
              align="right"
              triggerClassName="h-11 px-3.5 bg-white hover:bg-slate-50 rounded-xl border border-transparent shadow-xs flex items-center gap-2.5 cursor-pointer transition select-none text-slate-800"
            />
          </div>

          {/* 4. Prominent Blue TÌM Button */}
          <button
            type="button"
            onClick={onSearchSubmit}
            className="h-11 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-heading font-black text-xs tracking-wider transition shadow-md hover:shadow-blue-500/30 cursor-pointer flex items-center justify-center shrink-0 uppercase"
          >
            TÌM
          </button>
        </div>

        {/* Right side: Type Switch Tabs & Mobile Filter Button */}
        <div className="flex items-center gap-2">
          {/* Type Switch Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[
              { value: "all", label: "Tất cả", icon: <IconFilter size={12} />, activeClass: "bg-white text-slate-900 shadow-xs" },
              { value: "HOTEL", label: "Chỗ nghỉ", icon: <IconHotel size={12} />, activeClass: "bg-blue-600 text-white shadow-xs" },
              { value: "ATTRACTION", label: "Vé vui chơi", icon: <IconTicket size={12} />, activeClass: "bg-secondary-500 text-white shadow-xs" },
            ].map(({ value, label, icon, activeClass }) => {
              const active = activeType === (value === "all" ? "ALL" : value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onTypeChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${active ? activeClass : "text-slate-300 hover:text-white"}`}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>

          {/* Mobile Filter Button */}
          {activeType !== "ATTRACTION" && (
            <button
              type="button"
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
            >
              <IconFilter size={14} className="text-blue-400" />
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTER SIDEBAR
// ─────────────────────────────────────────────────────────────

function SearchFilterSidebar({
  filterOptions = { cities: [], amenities: [], priceRange: { min: 0, max: 10000000 } },
  filters = {},
  localMaxPrice,
  setLocalMaxPrice,
  activeFilterCount,
  onClearFilters,
  onFilterChange,
  showMobileFilter,
}) {
  const currentAmenitiesList = filters.amenities
    ? filters.amenities.split(",").map((a) => a.trim()).filter(Boolean)
    : [];
  const isAttraction = (filters.type || "").toUpperCase() === "ATTRACTION";

  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState("");

  if (isAttraction) return null;

  const handleStarToggle = (s) =>
    onFilterChange?.({ stars: filters.stars === String(s) ? "" : s });
  const handleAmenityToggle = (amenityName) => {
    const next = currentAmenitiesList.includes(amenityName)
      ? currentAmenitiesList.filter((a) => a !== amenityName)
      : [...currentAmenitiesList, amenityName];
    onFilterChange?.({ amenities: next.join(",") });
  };
  const handleRatingSelect = (val) =>
    onFilterChange?.({ minRating: filters.minRating === String(val) ? "" : val });
  const sliderMax = 10000000;
  const sliderStep = 100000;
  const displayedMaxPrice = localMaxPrice || sliderMax;

  const isPresetActive = (min, max) => {
    const curMin =
      filters.minPrice !== undefined && filters.minPrice !== ""
        ? Number(filters.minPrice)
        : null;
    const curMax =
      filters.maxPrice !== undefined && filters.maxPrice !== ""
        ? Number(filters.maxPrice)
        : null;

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
      onFilterChange?.({
        minPrice: min !== undefined ? min : "",
        maxPrice: max !== undefined ? max : "",
      });
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

  // Smart sorting & filtering for Amenities
  const allAmenities = filterOptions.amenities || [];
  const filteredAmenities = amenitySearch.trim()
    ? allAmenities.filter((a) =>
        a.name.toLowerCase().includes(amenitySearch.toLowerCase().trim())
      )
    : allAmenities;

  // Selected amenities are prioritized at the top
  const sortedAmenities = [...filteredAmenities].sort((a, b) => {
    const aChecked = currentAmenitiesList.includes(a.name);
    const bChecked = currentAmenitiesList.includes(b.name);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return 0;
  });

  const INITIAL_AMENITY_COUNT = 6;
  const displayedAmenities =
    showAllAmenities || amenitySearch.trim()
      ? sortedAmenities
      : sortedAmenities.slice(0, INITIAL_AMENITY_COUNT);

  return (
    <aside className={`w-full lg:w-72 flex-shrink-0 ${showMobileFilter ? "block" : "hidden lg:block"}`}>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <IconFilter size={16} className="text-primary-500" />
            <h2 className="font-heading font-700 text-slate-900 text-base">Bộ lọc tìm kiếm</h2>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-primary-600 hover:text-primary-700 font-bold cursor-pointer"
            >
              Xóa tất cả ({activeFilterCount})
            </button>
          )}
        </div>

        {/* 1. Price Range */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
            <span>Khoảng giá tối đa</span>
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
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>100.000 ₫</span>
            <span>10.000.000 ₫</span>
          </div>
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

        {/* 2. Star Rating - Only for Hotels */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Xếp hạng sao khách sạn
            </p>
            {filters.stars && (
              <button
                type="button"
                onClick={() => handleStarToggle(filters.stars)}
                className="text-[11px] text-slate-400 hover:text-primary-600 font-semibold cursor-pointer"
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map((s) => {
              const isSelected = filters.stars === String(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStarToggle(s)}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-500 text-amber-700 shadow-xs"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-amber-500 flex items-center">{s}★</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Amenities (MOVED UP - Immediate Visibility & No Nested Scrollbox) */}
        {allAmenities.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tiện ích nổi bật
                </p>
                {currentAmenitiesList.length > 0 && (
                  <span className="bg-primary-50 text-primary-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-primary-200">
                    {currentAmenitiesList.length}
                  </span>
                )}
              </div>
              {currentAmenitiesList.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFilterChange?.({ amenities: "" })}
                  className="text-[11px] text-slate-400 hover:text-primary-600 font-semibold cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            {/* Quick search input when many amenities */}
            {allAmenities.length > 8 && (
              <div className="relative mb-2.5">
                <IconSearch
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={amenitySearch}
                  onChange={(e) => setAmenitySearch(e.target.value)}
                  placeholder="Tìm nhanh tiện ích..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-6 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary-500"
                />
                {amenitySearch && (
                  <button
                    type="button"
                    onClick={() => setAmenitySearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>
            )}

            {/* List without cramped inner scrollbox */}
            <div className="space-y-1.5">
              {displayedAmenities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">Không tìm thấy tiện ích phù hợp</p>
              ) : (
                displayedAmenities.map((amen) => {
                  const isChecked = currentAmenitiesList.includes(amen.name);
                  return (
                    <label
                      key={amen._id}
                      className={`flex items-center gap-2.5 px-2 py-1 rounded-lg cursor-pointer text-xs font-medium transition ${
                        isChecked
                          ? "bg-primary-50 text-primary-800 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-primary-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleAmenityToggle(amen.name)}
                        className="w-4 h-4 rounded text-primary-500 focus:ring-primary-400 accent-primary-500 cursor-pointer"
                      />
                      <span className="flex-1 select-none">{amen.name}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Expand / Collapse toggle */}
            {!amenitySearch && allAmenities.length > INITIAL_AMENITY_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllAmenities(!showAllAmenities)}
                className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer transition"
              >
                <span>
                  {showAllAmenities
                    ? "Thu gọn tiện ích"
                    : `+ Xem thêm (${allAmenities.length - INITIAL_AMENITY_COUNT} tiện ích khác)`}
                </span>
                <IconChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    showAllAmenities ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
        )}

        {/* 4. Guest Rating */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Đánh giá của khách hàng
            </p>
            {filters.minRating && (
              <button
                type="button"
                onClick={() => handleRatingSelect(filters.minRating)}
                className="text-[11px] text-slate-400 hover:text-primary-600 font-semibold cursor-pointer"
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              ["4.8", "Tuyệt hảo (4.8+)"],
              ["4.5", "Rất tốt (4.5+)"],
              ["4.0", "Hài lòng (4.0+)"],
            ].map(([val, label]) => {
              const isSelected = filters.minRating === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleRatingSelect(val)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isSelected
                      ? "bg-primary-50 border-primary-500 text-primary-600 shadow-xs"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && <IconCheck size={12} className="text-primary-600" />}
                </button>
              );
            })}
          </div>
        </div>
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

function SearchResultCard({ item, filters = {}, onNavigateDetail, onRequireDates }) {
  const isHotel = item.type === "HOTEL";
  const hasSelectedHotelDates = Boolean(filters?.checkIn && filters?.checkOut);
  const hasSelectedAttractionDate = Boolean(filters?.checkIn);
  const hasSelectedDate = isHotel ? hasSelectedHotelDates : hasSelectedAttractionDate;

  const nights = item.nights || (hasSelectedHotelDates
    ? Math.max(1, Math.round((new Date(filters.checkOut) - new Date(filters.checkIn)) / (1000 * 60 * 60 * 24)))
    : 1);
  const requestedRooms = item.requested_rooms || Number(filters?.rooms) || 1;
  const requestedGuests = item.requested_guests || Number(filters?.guests) || (Number(filters?.adults || 2) + Number(filters?.children || 0));
  const adults = Number(filters?.adults) || 2;
  const children = Number(filters?.children) || 0;
  const hasMultipleNightsOrRooms = isHotel && hasSelectedHotelDates && (nights > 1 || requestedRooms > 1);

  const handleAction = (e) => {
    e?.stopPropagation?.();
    onNavigateDetail?.(item._id, {
      checkIn: filters.checkIn || "",
      checkOut: isHotel ? (filters.checkOut || "") : "",
      date: filters.checkIn || "",
      guests: requestedGuests,
      adults,
      children,
      rooms: isHotel ? requestedRooms : undefined,
    });
  };

  return (
    <div
      onClick={handleAction}
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

          {/* Hotel Booking Suitability Badge */}
          {isHotel && requestedRooms >= 1 && (
            <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-800 border border-sky-200/80 px-2.5 py-1 rounded-lg text-xs font-bold mb-3">
              <IconCheck size={13} className="text-sky-600 flex-shrink-0" />
              <span>
                Phù hợp cho {requestedGuests} khách ({adults} người lớn{children > 0 ? `, ${children} trẻ em` : ""}) &bull; Cần {requestedRooms} phòng
              </span>
            </div>
          )}

          {/* Attraction Ticket Info Badge */}
          {!isHotel && hasSelectedAttractionDate && (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-bold mb-3">
              <IconCheck size={13} className="text-emerald-600 flex-shrink-0" />
              <span>
                Ngày tham quan: {formatDateVN(filters.checkIn)} &bull; {requestedGuests} vé ({adults} người lớn{children > 0 ? `, ${children} trẻ em` : ""})
              </span>
            </div>
          )}

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
            {!isHotel && hasSelectedAttractionDate && requestedGuests > 1 ? (
              <div className="mb-2">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Giá mỗi vé từ</div>
                <div className="font-heading font-700 text-slate-700 text-sm">
                  {formatVND(item.min_price)} <span className="text-[10px] font-normal text-slate-400">/ vé</span>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500 font-bold">
                    Tổng {requestedGuests} vé ({adults} lớn{children > 0 ? `, ${children} trẻ` : ""}):
                  </div>
                  <div className="font-heading font-800 text-primary-600 text-xl tracking-tight leading-tight">
                    {formatVND(item.estimated_total_price || (item.min_price * requestedGuests))}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-semibold">Đã bao gồm thuế & phí</div>
                </div>
              </div>
            ) : hasMultipleNightsOrRooms ? (
              <div className="mb-2">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Giá mỗi đêm từ</div>
                <div className="font-heading font-700 text-slate-700 text-sm">
                  {formatVND(item.min_price)} <span className="text-[10px] font-normal text-slate-400">/ phòng / đêm</span>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500 font-bold">
                    Tổng {nights} đêm &bull; {requestedRooms} phòng:
                  </div>
                  <div className="font-heading font-800 text-primary-600 text-xl tracking-tight leading-tight">
                    {formatVND(item.estimated_total_price || (item.min_price * nights * requestedRooms))}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-semibold">Đã bao gồm thuế & phí</div>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Giá chỉ từ</div>
                <div className="font-heading font-800 text-primary-600 text-xl tracking-tight leading-tight">{formatVND(item.min_price)}</div>
                <div className="text-[10px] text-slate-400">{isHotel ? "mỗi phòng / đêm" : "mỗi vé / người"}</div>
              </div>
            )}
            <button
              type="button"
              onClick={handleAction}
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

function SearchEmptyState({ onClearFilters, filters = {} }) {
  const rooms = filters.rooms ? Number(filters.rooms) : 1;
  const guests = filters.guests ? Number(filters.guests) : 1;
  const hasSpecificBooking = rooms > 1 || guests > 2;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <IconSearch size={28} />
      </div>
      <h3 className="font-heading font-700 text-slate-800 text-lg mb-1">Không tìm thấy cơ sở phù hợp</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        {hasSpecificBooking
          ? `Rất tiếc, không tìm thấy cơ sở nào đáp ứng đủ ${rooms} phòng và ${guests} khách theo thời gian bạn đã chọn. Bạn hãy thử giảm số phòng hoặc đổi ngày xem phòng khác.`
          : "Rất tiếc, không có chỗ nghỉ hoặc vé vui chơi nào khớp với điều kiện tìm kiếm của bạn. Hãy thử đổi từ khóa hoặc điều chỉnh khoảng giá/bộ lọc."}
      </p>
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
  const [checkIn, setCheckIn] = useState(filters.checkIn || "");
  const [checkOut, setCheckOut] = useState(filters.checkOut || "");
  const [rooms, setRooms] = useState(filters.rooms ? Number(filters.rooms) : 1);
  const [adults, setAdults] = useState(filters.adults ? Number(filters.adults) : 2);
  const [childrenCount, setChildrenCount] = useState(filters.children !== undefined && filters.children !== "" ? Number(filters.children) : 0);
  const [childrenAges, setChildrenAges] = useState(filters.children ? Array(Number(filters.children)).fill(5) : []);
  const isAttraction = (filters.type || "").toUpperCase() === "ATTRACTION";
  const activeType = (filters.type || "").toUpperCase();
  const [localMaxPrice, setLocalMaxPrice] = useState(
    filters.maxPrice ? Number(filters.maxPrice) : 10000000
  );
  const [searchError, setSearchError] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateHighlight, setDateHighlight] = useState(false);

  useEffect(() => {
    setSearchInput(filters.keyword || "");
    setCheckIn(filters.checkIn || "");
    setCheckOut(filters.checkOut || "");
    if (filters.rooms) setRooms(Number(filters.rooms));
    if (filters.adults) setAdults(Number(filters.adults));
    if (filters.children !== undefined && filters.children !== "") {
      setChildrenCount(Number(filters.children));
    }
    if (filters.maxPrice) {
      setLocalMaxPrice(Number(filters.maxPrice));
    } else {
      setLocalMaxPrice(10000000);
    }
  }, [filters.keyword, filters.checkIn, filters.checkOut, filters.rooms, filters.adults, filters.children, filters.maxPrice]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const kw = searchInput.trim();
    if (!kw && !filters.keyword) {
      setSearchError(activeType === "ATTRACTION" ? "Vui lòng nhập địa điểm du lịch hoặc tên khu vui chơi!" : "Vui lòng nhập địa điểm du lịch hoặc tên khách sạn!");
      setTimeout(() => setSearchError(""), 3000);
      return;
    }

    // Business validation for Attraction search
    if (activeType === "ATTRACTION") {
      if (!checkIn) {
        setSearchError("Vui lòng chọn ngày tham quan!");
        setTimeout(() => setSearchError(""), 3500);
        setIsCalendarOpen(true);
        setDateHighlight(true);
        setTimeout(() => setDateHighlight(false), 3000);
        return;
      }
      const today = getTodayISO();
      if (checkIn < today) {
        setSearchError("Ngày tham quan không thể ở trong quá khứ!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
      if (adults + childrenCount < 1) {
        setSearchError("Vui lòng chọn ít nhất 1 vé tham quan!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
      if (childrenCount > 0 && adults < 1) {
        setSearchError("Trẻ em cần ít nhất 1 người lớn đi cùng tại khu vui chơi!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
      if (adults + childrenCount > 30) {
        setSearchError("Số lượng vé đặt trực tuyến tối đa là 30 vé!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
    }

    setSearchError("");
    onFilterChange?.({
      keyword: kw,
      checkIn: checkIn || "",
      checkOut: activeType === "ATTRACTION" ? "" : (checkOut || ""),
      rooms: activeType === "ATTRACTION" ? 1 : rooms,
      adults,
      children: childrenCount,
      guests: adults + childrenCount,
      page: 1,
    });
  };

  const handleDateChange = (dates) => {
    const nextCheckIn = dates.checkIn !== undefined ? dates.checkIn : checkIn;
    const nextCheckOut = dates.checkOut !== undefined ? dates.checkOut : checkOut;
    const today = getTodayISO();

    // Validate for Attraction: Single date, must not be in past
    if (activeType === "ATTRACTION") {
      if (nextCheckIn && nextCheckIn < today) {
        setSearchError("Ngày tham quan không thể ở trong quá khứ!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
    }

    // Validate dates if hotel
    if (activeType !== "ATTRACTION" && nextCheckIn && nextCheckOut) {
      if (nextCheckOut <= nextCheckIn) {
        setSearchError("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
      const nightsCount = Math.round((new Date(nextCheckOut) - new Date(nextCheckIn)) / (1000 * 60 * 60 * 24));
      if (nightsCount > 30) {
        setSearchError("Thời gian lưu trú tối đa cho phép là 30 đêm!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }
    }

    setSearchError("");
    if (dates.checkIn !== undefined) setCheckIn(dates.checkIn);
    if (dates.checkOut !== undefined) setCheckOut(dates.checkOut);
  };

  const handleRequireDates = (facilityId, facilityType) => {
    const isAttr = facilityType === "ATTRACTION" || (!facilityType && isAttraction);
    const searchBar = document.getElementById("search-top-bar");
    if (searchBar) {
      searchBar.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // If clicked an attraction while in ALL mode, switch to ATTRACTION mode so single date picker opens
    if (isAttr && activeType !== "ATTRACTION") {
      setCheckOut("");
      onFilterChange?.({ type: "ATTRACTION", checkOut: "" });
    }
    setSearchError(
      isAttr
        ? "Vui lòng chọn ngày tham quan để xem giá vé và đặt chỗ!"
        : "Vui lòng chọn ngày nhận phòng và trả phòng để xem giá và tình trạng phòng trống!"
    );
    setTimeout(() => setSearchError(""), 4500);
    setIsCalendarOpen(true);
    setDateHighlight(true);
    setTimeout(() => setDateHighlight(false), 3000);
  };

  const handleRoomGuestChange = (newParams) => {
    if (newParams) {
      const nextRooms = newParams.rooms !== undefined ? newParams.rooms : rooms;
      let nextAdults = newParams.adults !== undefined ? newParams.adults : adults;
      const nextChildren = newParams.childrenCount !== undefined ? newParams.childrenCount : childrenCount;

      // Business rule validation: hotel rooms must have at least 1 adult
      if (activeType !== "ATTRACTION" && nextRooms > nextAdults) {
        nextAdults = nextRooms;
      }

      if (activeType === "ATTRACTION" && nextChildren > 0 && nextAdults < 1) {
        setSearchError("Trẻ em cần ít nhất 1 người lớn đi cùng tại khu vui chơi!");
        setTimeout(() => setSearchError(""), 3500);
        return;
      }

      const nextGuests = nextAdults + nextChildren;
      setRooms(nextRooms);
      setAdults(nextAdults);
      setChildrenCount(nextChildren);
      onFilterChange?.({
        rooms: nextRooms,
        adults: nextAdults,
        children: nextChildren,
        guests: nextGuests,
      });
    }
  };

  const currentAmenitiesList = filters.amenities ? filters.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [];
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
        rooms={rooms}
        setRooms={setRooms}
        adults={adults}
        setAdults={setAdults}
        childrenCount={childrenCount}
        setChildrenCount={setChildrenCount}
        childrenAges={childrenAges}
        setChildrenAges={setChildrenAges}
        onRoomGuestChange={handleRoomGuestChange}
        activeType={activeType}
        onTypeChange={(typeVal) => {
          const nextType = typeVal === "all" ? "" : typeVal;
          if (nextType === "ATTRACTION") {
            setCheckOut("");
            onFilterChange?.({ type: nextType, checkOut: "" });
          } else {
            onFilterChange?.({ type: nextType });
          }
        }}
        activeFilterCount={activeFilterCount}
        showMobileFilter={showMobileFilter}
        setShowMobileFilter={setShowMobileFilter}
        showMap={showMap}
        setShowMap={setShowMap}
        onClearKeyword={() => { setSearchInput(""); onFilterChange?.({ keyword: "" }); }}
        isCalendarOpen={isCalendarOpen}
        setIsCalendarOpen={setIsCalendarOpen}
        dateHighlight={dateHighlight}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-7">
          {!isAttraction && (
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
          )}

          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h1 className="font-heading font-700 text-slate-900 text-lg">
                  {loading ? "Đang tìm kiếm cơ sở phù hợp..." : (
                    <>Tìm thấy{" "}<span className="text-primary-600 font-extrabold">{pagination.total}</span>{" "}kết quả phù hợp</>
                  )}
                </h1>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                  {filters.keyword && (
                    <span>Điểm đến: <strong className="text-slate-800 font-bold">"{filters.keyword}"</strong></span>
                  )}
                  {checkIn && checkOut && activeType !== "ATTRACTION" && (
                    <span>&bull; {formatDateVN(checkIn)} → {formatDateVN(checkOut)} ({Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))} đêm)</span>
                  )}
                  {activeType !== "ATTRACTION" && (
                    <span>&bull; {rooms} phòng, {adults + childrenCount} khách</span>
                  )}
                </div>
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
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-400 mr-1">Đang chọn:</span>
              {checkIn && checkOut && activeType !== "ATTRACTION" && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold">
                  <IconCalendar size={12} className="text-primary-500" />
                  {formatDateVN(checkIn)} → {formatDateVN(checkOut)} ({Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))} đêm)
                </span>
              )}
              {activeType !== "ATTRACTION" && (rooms > 1 || adults + childrenCount > 2) && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold">
                  <IconUsers size={12} className="text-primary-500" />
                  {rooms} phòng, {adults + childrenCount} khách ({adults} lớn{childrenCount > 0 ? `, ${childrenCount} trẻ` : ""})
                </span>
              )}
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
              {activeFilterCount > 0 && (
                <button type="button" onClick={onClearFilters} className="text-primary-600 hover:text-primary-700 font-bold ml-auto cursor-pointer">Xóa bộ lọc</button>
              )}
            </div>

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
            {!loading && !error && facilities.length === 0 && <SearchEmptyState onClearFilters={onClearFilters} filters={filters} />}
            {!loading && !error && facilities.length > 0 && (
              <div className="space-y-4">
                {facilities.map((item) => (
                  <SearchResultCard
                    key={item._id}
                    item={item}
                    filters={{ ...filters, checkIn, checkOut }}
                    onNavigateDetail={onNavigateDetail}
                    onRequireDates={handleRequireDates}
                  />
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
