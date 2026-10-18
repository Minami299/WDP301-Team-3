import { useState, useRef, useEffect } from "react";
import { IconUsers, IconMinus, IconPlus, IconCheck } from "../Icons";

export default function AgodaRoomGuestPicker({
  isOpen = false,
  onToggle,
  onClose,
  onDone,
  rooms = 1,
  setRooms,
  adults = 2,
  setAdults,
  childrenCount = 0,
  setChildrenCount,
  childrenAges = [],
  setChildrenAges,
  activeTab = "stays",
  compact = false,
  align = "right",
  triggerClassName = "",
}) {
  const containerRef = useRef(null);
  const isHotel = activeTab === "stays";

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Adjust children ages array when childrenCount changes
  const handleChildrenCountChange = (newCount) => {
    const validCount = Math.max(0, Math.min(10, newCount));
    setChildrenCount(validCount);

    const updatedAges = [...childrenAges];
    if (validCount > updatedAges.length) {
      for (let i = updatedAges.length; i < validCount; i++) {
        updatedAges.push(5); // default 5 years old
      }
    } else {
      updatedAges.length = validCount;
    }
    setChildrenAges(updatedAges);
  };

  // Business logic helpers
  const minAdultsAllowed = isHotel ? Math.max(1, rooms) : (childrenCount > 0 ? 1 : 1);
  const canDecreaseAdults = adults > minAdultsAllowed;
  const avgGuestsPerRoom = isHotel ? (adults + childrenCount) / (rooms || 1) : 1;
  const isOvercrowded = isHotel && avgGuestsPerRoom > 4;
  const totalTickets = !isHotel ? adults + childrenCount : 0;

  const handleAgeChange = (index, age) => {
    const updated = [...childrenAges];
    updated[index] = Number(age);
    setChildrenAges(updated);
  };

  const handleRoomsIncrease = () => {
    const nextRooms = Math.min(8, rooms + 1);
    setRooms(nextRooms);
    // Business rule: Each room requires at least 1 adult (rooms <= adults)
    if (nextRooms > adults) {
      setAdults(nextRooms);
    }
  };

  const handleRoomsDecrease = () => {
    setRooms(Math.max(1, rooms - 1));
  };

  const handleAdultsIncrease = () => {
    const maxAdults = isHotel ? 24 : 30;
    setAdults(Math.min(maxAdults, adults + 1));
  };

  const handleAdultsDecrease = () => {
    if (canDecreaseAdults) {
      setAdults(adults - 1);
    }
  };

  // Label for trigger button
  const triggerLabel = isHotel ? (
    <div className="flex flex-col text-left">
      <span className="text-xs font-bold text-slate-800 leading-tight">
        {adults} người lớn{childrenCount > 0 ? `, ${childrenCount} trẻ em` : ""}
      </span>
      <span className="text-[11px] text-slate-500 font-medium">
        {rooms} phòng
      </span>
    </div>
  ) : (
    <div className="flex flex-col text-left">
      <span className="text-xs font-bold text-slate-800 leading-tight">
        {adults} người lớn{childrenCount > 0 ? `, ${childrenCount} trẻ em` : ""}
      </span>
      <span className="text-[11px] text-slate-500 font-medium">
        {adults + childrenCount} vé
      </span>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${compact ? "inline-block" : "w-full"}`}>
      {/* Trigger Button */}
      {compact ? (
        <div
          onClick={onToggle}
          className={
            triggerClassName ||
            `flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition ${
              isOpen ? "border-primary-500 ring-2 ring-primary-100 bg-white" : ""
            }`
          }
        >
          <IconUsers size={14} className="text-primary-500 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {isHotel
              ? `${rooms} phòng, ${adults + childrenCount} khách`
              : `${adults + childrenCount} vé`}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary-500" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      ) : (
        <div
          onClick={onToggle}
          className={`h-[46px] bg-slate-50 hover:bg-slate-100/70 border rounded-xl px-3 flex items-center justify-between gap-2 transition cursor-pointer ${
            isOpen
              ? "border-primary-500 ring-4 ring-primary-100 bg-white"
              : "border-slate-200 hover:border-primary-400"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconUsers size={18} className="text-primary-500 flex-shrink-0" />
            {triggerLabel}
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary-500" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      )}

      {/* Popover Dropdown Card (Matches Agoda's exact screenshots) */}
      {isOpen && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-2 w-[330px] sm:w-[360px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-slate-200 z-50 p-5 animate-in fade-in-50 slide-in-from-top-1 duration-150 select-none`}>
          <div className="space-y-4">
            {/* 1. ROOMS ROW (Only for hotels) */}
            {isHotel && (
              <div className="flex items-center justify-between gap-3 relative">
                <div>
                  <div className="text-sm font-bold text-slate-900">Phòng</div>
                  <div className="text-[11px] text-slate-400">Số phòng cần đặt</div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={rooms <= 1}
                    onClick={handleRoomsDecrease}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                      rooms <= 1
                        ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 active:scale-95 shadow-2xs"
                    }`}
                  >
                    <IconMinus size={14} />
                  </button>
                  <span className="w-5 text-center text-sm font-black text-slate-900">
                    {rooms}
                  </span>
                  <button
                    type="button"
                    disabled={rooms >= 8}
                    onClick={handleRoomsIncrease}
                    title={rooms >= 8 ? "Tối đa 8 phòng trực tuyến. Đoàn lớn hơn vui lòng liên hệ CSKH" : "Thêm phòng"}
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. ADULTS ROW */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {isHotel ? "Người lớn" : "Vé người lớn"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isHotel ? "18 tuổi trở lên" : "Cao từ 1m4 hoặc >= 18 tuổi"}
                </div>
                {isHotel && rooms > 1 && adults === rooms && (
                  <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                    *1 người lớn / phòng
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!canDecreaseAdults}
                  onClick={handleAdultsDecrease}
                  title={!canDecreaseAdults ? (isHotel ? "Số người lớn không thể ít hơn số phòng (mỗi phòng cần ít nhất 1 người lớn bảo hộ)" : "Trẻ em bắt buộc phải có ít nhất 1 người lớn đi kèm") : "Giảm người lớn"}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                    !canDecreaseAdults
                      ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 active:scale-95 shadow-2xs"
                  }`}
                >
                  <IconMinus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-black text-slate-900">
                  {adults}
                </span>
                <button
                  type="button"
                  disabled={adults >= (isHotel ? 24 : 30)}
                  onClick={handleAdultsIncrease}
                  className="w-8 h-8 rounded-full border border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  <IconPlus size={14} />
                </button>
              </div>
            </div>

            {/* 3. CHILDREN ROW */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {isHotel ? "Trẻ em" : "Vé trẻ em"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isHotel ? "0-17 tuổi" : "Cao dưới 1m4 hoặc < 18 tuổi"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={childrenCount <= 0}
                  onClick={() => handleChildrenCountChange(childrenCount - 1)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                    childrenCount <= 0
                      ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 active:scale-95 shadow-2xs"
                  }`}
                >
                  <IconMinus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-black text-slate-900">
                  {childrenCount}
                </span>
                <button
                  type="button"
                  disabled={childrenCount >= 10}
                  onClick={() => handleChildrenCountChange(childrenCount + 1)}
                  className="w-8 h-8 rounded-full border border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50 text-primary-600 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  <IconPlus size={14} />
                </button>
              </div>
            </div>

            {/* Business Logic Warning Badges */}
            {isOvercrowded && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">⚠️</span>
                <span>
                  Trung bình <strong>{avgGuestsPerRoom.toFixed(1)} khách/phòng</strong>. Đa số phòng khách sạn chỉ tiêu chuẩn cho 2-4 khách. Bạn nên cân nhắc đặt thêm phòng.
                </span>
              </div>
            )}

            {!isHotel && childrenCount > 0 && adults === 1 && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-700 flex items-center gap-1.5">
                <span className="text-blue-500 font-bold shrink-0">ℹ️</span>
                <span>Quy định khu vui chơi: Bắt buộc có người lớn đi cùng bảo hộ trẻ em.</span>
              </div>
            )}

            {/* 4. CHILDREN AGES SELECTOR (Screenshot 2 exact layout) */}
            {childrenCount > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Để xem chính xác giá phòng, hãy đảm bảo nhập đúng tuổi của trẻ.
                </p>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {Array.from({ length: childrenCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-300 hover:border-primary-500 rounded-xl px-3 py-1.5 bg-white relative transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100"
                    >
                      <label className="block text-[10px] font-bold text-primary-600 uppercase tracking-tight">
                        Tuổi của Trẻ {idx + 1} (Bắt buộc)
                      </label>
                      <select
                        value={childrenAges[idx] !== undefined ? childrenAges[idx] : 5}
                        onChange={(e) => handleAgeChange(idx, e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-0.5"
                      >
                        <option value={0}>Dưới 1 tuổi (&lt; 1 tuổi)</option>
                        {Array.from({ length: 17 }).map((__, ageIdx) => {
                          const age = ageIdx + 1;
                          return (
                            <option key={age} value={age}>
                              {age} tuổi
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. FINISH BUTTON */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onDone?.({ rooms, adults, childrenCount, childrenAges });
                  onClose?.();
                }}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20 active:scale-98"
              >
                <IconCheck size={14} />
                <span>{isHotel ? "Áp dụng & Xem khách sạn" : "Áp dụng & Xem khu vui chơi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
