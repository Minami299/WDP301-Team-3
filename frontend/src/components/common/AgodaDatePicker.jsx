import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

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
    const dayShort = d.getDay() === 0 ? "cn" : `t${d.getDay() + 1}`;
    return {
      main: `${day} tháng ${month} ${year}`,
      sub: dayOfWeek,
      short: `${dayShort}, ${day} tháng ${month} ${year}`,
    };
  } catch {
    return null;
  }
};

export default function AgodaDatePicker({
  checkIn,
  checkOut,
  onChange,
  onComplete,
  isOpen,
  onClose,
  singleDateMode = false,
  align = "left",
  asModal = false,
}) {
  const containerRef = useRef(null);

  // Month navigation: view starts on checkIn month or current date
  const [viewDate, setViewDate] = useState(() => {
    if (checkIn) {
      const d = new Date(checkIn);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [activeTab, setActiveTab] = useState("calendar"); // 'calendar' | 'flexible'
  const [hoverDate, setHoverDate] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [selectionStep, setSelectionStep] = useState(null); // null | 'checkOut'

  // Sync view when opened
  useEffect(() => {
    if (isOpen && checkIn) {
      const d = new Date(checkIn);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectionStep(null);
      setHoverDate(null);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  // Month 1 & Month 2
  const month1Year = viewDate.getFullYear();
  const month1Month = viewDate.getMonth();

  const nextMonthObj = new Date(month1Year, month1Month + 1, 1);
  const month2Year = nextMonthObj.getFullYear();
  const month2Month = nextMonthObj.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(month1Year, month1Month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(month1Year, month1Month + 1, 1));
  };

  // Helper to generate day grid for a given year & month (Monday start)
  const getMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        dateStr,
      });
    }
    return days;
  };

  const month1Days = getMonthDays(month1Year, month1Month);
  const month2Days = getMonthDays(month2Year, month2Month);

  const todayStr = new Date().toISOString().split("T")[0];

  // Determine current active range
  const currentStart = selectionStep === "checkOut" && dragStart ? dragStart : checkIn;
  const currentPreviewEnd = singleDateMode
    ? null
    : selectionStep === "checkOut"
      ? hoverDate
      : checkOut;

  // Normalize effective start and end for highlighting
  let effectiveStart = currentStart;
  let effectiveEnd = singleDateMode ? null : currentPreviewEnd;
  if (!singleDateMode && effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
    const temp = effectiveStart;
    effectiveStart = effectiveEnd;
    effectiveEnd = temp;
  }

  // Handle Hover for range preview
  const handleDateMouseEnter = (dateStr) => {
    if (singleDateMode || dateStr < todayStr) return;
    if (selectionStep === "checkOut" && dragStart) {
      setHoverDate(dateStr);
    }
  };

  // Handle Click (Standard 2-click range select)
  const handleDateClick = (dateStr) => {
    if (dateStr < todayStr) return;

    if (singleDateMode) {
      onChange?.({ checkIn: dateStr, checkOut: "" });
      onComplete?.({ checkIn: dateStr, checkOut: "" });
      onClose?.();
      return;
    }

    if (!selectionStep || selectionStep !== "checkOut" || !dragStart) {
      // Step 1: Click start date
      setDragStart(dateStr);
      setSelectionStep("checkOut");
      setHoverDate(null);
      onChange?.({ checkIn: dateStr, checkOut: "" });
    } else {
      // Step 2: Click end date
      if (dateStr <= dragStart) {
        // User clicked same date or earlier date -> make it the new check-in date
        setDragStart(dateStr);
        setSelectionStep("checkOut");
        setHoverDate(null);
        onChange?.({ checkIn: dateStr, checkOut: "" });
        return;
      }
      const start = dragStart;
      const end = dateStr;
      onChange?.({ checkIn: start, checkOut: end });
      onComplete?.({ checkIn: start, checkOut: end });
      setSelectionStep(null);
      setDragStart(null);
      setHoverDate(null);
      onClose?.();
    }
  };

  const isSelectedStart = (dateStr) => effectiveStart && dateStr === effectiveStart;
  const isSelectedEnd = (dateStr) => !singleDateMode && effectiveEnd && dateStr === effectiveEnd && effectiveEnd !== effectiveStart;
  const isInRange = (dateStr) => {
    if (singleDateMode) return false;
    if (!effectiveStart || !effectiveEnd || effectiveStart === effectiveEnd) return false;
    return dateStr > effectiveStart && dateStr < effectiveEnd;
  };

  const renderMonth = (monthTitle, days) => (
    <div className="flex-1 min-w-[300px] select-none">
      <div className="text-center font-heading font-700 text-slate-800 text-base mb-4">
        {monthTitle}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((item, idx) => {
          if (!item) {
            return <div key={`empty-${idx}`} className="h-10" />;
          }

          const { day, dateStr } = item;
          const isPast = dateStr < todayStr;
          const isStart = isSelectedStart(dateStr);
          const isEnd = isSelectedEnd(dateStr);
          const inRange = isInRange(dateStr);
          const isToday = dateStr === todayStr;
          const isHovered = !singleDateMode && hoverDate === dateStr && !isStart && !isEnd;

          // Strip background for range in-between
          let stripClass = "";
          if (!singleDateMode) {
            if (inRange) {
              stripClass = "bg-[#eaf2fd]";
            } else if (isStart && effectiveEnd && effectiveEnd !== effectiveStart) {
              stripClass = "bg-gradient-to-r from-transparent via-[#eaf2fd] to-[#eaf2fd]";
            } else if (isEnd) {
              stripClass = "bg-gradient-to-l from-transparent via-[#eaf2fd] to-[#eaf2fd]";
            }
          }

          // Button circle styling
          let circleClass = "hover:bg-slate-100 text-slate-800 font-medium";
          if (isPast) {
            circleClass = "text-slate-300 cursor-not-allowed font-normal";
          } else if (isStart || isEnd) {
            circleClass = "bg-[#0b63e5] text-white shadow-sm font-bold z-10 scale-105";
          } else if (inRange) {
            circleClass = "text-[#0b63e5] font-bold";
          } else if (isHovered) {
            circleClass = "border-2 border-[#0b63e5] bg-blue-50/50 text-[#0b63e5] font-bold";
          } else if (isToday) {
            circleClass = "border-2 border-slate-400 font-bold text-slate-900";
          }

          return (
            <div
              key={dateStr}
              id={`agoda-date-${dateStr}`}
              data-date={dateStr}
              className={`relative h-10 flex items-center justify-center transition-all ${
                isPast ? "cursor-not-allowed" : "cursor-pointer"
              } ${stripClass}`}
              onMouseEnter={() => handleDateMouseEnter(dateStr)}
              onClick={() => handleDateClick(dateStr)}
            >
              <div
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-100 ${circleClass}`}
              >
                <span className="text-[13px] leading-none">{day}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const pickerContent = (
    <div
      ref={containerRef}
      className={`${
        asModal
          ? "relative"
          : `absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-3`
      } z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 ${
        singleDateMode ? "w-[340px] max-w-[92vw]" : "w-[96vw] max-w-[720px]"
      } animate-in fade-in zoom-in-95 duration-150 font-body text-slate-800 select-none`}
      style={{ boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)" }}
    >
      {/* Nút đóng nếu hiển thị dạng Modal */}
      {asModal && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer z-30"
          title="Đóng lịch"
        >
          <span className="text-base font-bold leading-none">✕</span>
        </button>
      )}

      {/* Pointer arrow pointing up to the trigger button in top bar */}
      {!asModal && (
        <div className="absolute -top-1.5 left-[180px] w-3.5 h-3.5 bg-white border-t border-l border-slate-200 rotate-45 z-20" />
      )}

      {/* Month Navigation Arrows */}
      <div className="relative mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="absolute -top-1 left-0 w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer z-20 shadow-2xs"
          title="Tháng trước"
        >
          <span className="text-lg font-bold leading-none mb-0.5">‹</span>
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="absolute -top-1 right-0 w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer z-20 shadow-2xs"
          title="Tháng sau"
        >
          <span className="text-lg font-bold leading-none mb-0.5">›</span>
        </button>
      </div>

      {/* Months */}
      <div className={`flex flex-col ${singleDateMode ? "" : "md:flex-row gap-8"} pt-1`}>
        {renderMonth(
          `${MONTH_NAMES[month1Month]} ${month1Year}`,
          month1Days
        )}
        {!singleDateMode &&
          renderMonth(
            `${MONTH_NAMES[month2Month]} ${month2Year}`,
            month2Days
          )}
      </div>

      {/* Footer / Summary */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          {singleDateMode ? (
            effectiveStart ? (
              <span className="text-slate-700 font-medium">
                Ngày sử dụng: <strong className="text-blue-600 font-bold">{formatDateVN(effectiveStart)}</strong>
              </span>
            ) : (
              <span className="text-slate-400">Chọn ngày sử dụng vé vui chơi</span>
            )
          ) : effectiveStart && effectiveEnd && effectiveStart !== effectiveEnd ? (
            <span className="text-slate-700 font-medium flex items-center gap-1.5">
              <span>Từ <strong className="text-slate-900 font-bold">{formatDateVN(effectiveStart)}</strong> đến <strong className="text-slate-900 font-bold">{formatDateVN(effectiveEnd)}</strong></span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-extrabold border border-blue-100 text-[11px]">
                {Math.max(
                  1,
                  Math.round(
                    (new Date(effectiveEnd) - new Date(effectiveStart)) /
                      (1000 * 60 * 60 * 24)
                  )
                )}{" "}
                đêm
              </span>
            </span>
          ) : effectiveStart ? (
            <span className="text-slate-600 font-medium">
              Nhận phòng: <strong className="text-blue-600 font-bold">{formatDateVN(effectiveStart)}</strong> &bull; <span className="text-slate-400">Chọn ngày trả phòng</span>
            </span>
          ) : (
            <span className="text-slate-400">Chọn ngày nhận phòng và ngày trả phòng</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (effectiveStart) {
              onComplete?.({
                checkIn: effectiveStart,
                checkOut: effectiveEnd || (singleDateMode ? "" : effectiveStart),
              });
            }
            onClose?.();
          }}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer text-xs shadow-xs"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        {pickerContent}
      </div>
    );
  }

  return pickerContent;
}
