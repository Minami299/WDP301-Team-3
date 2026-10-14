import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

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

export default function AgodaDatePicker({
  checkIn,
  checkOut,
  onChange,
  isOpen,
  onClose,
  singleDateMode = false,
  align = "left",
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selectionStep, setSelectionStep] = useState(null); // null | 'checkOut'

  // Sync view when opened
  useEffect(() => {
    if (isOpen && checkIn) {
      const d = new Date(checkIn);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectionStep(null);
      setHoverDate(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Window mouseup listener for drag release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging]);

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
  const currentPreviewEnd = isDragging || selectionStep === "checkOut" ? hoverDate : checkOut;

  // Normalize effective start and end for highlighting
  let effectiveStart = currentStart;
  let effectiveEnd = currentPreviewEnd;
  if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
    const temp = effectiveStart;
    effectiveStart = effectiveEnd;
    effectiveEnd = temp;
  }

  // Handle Drag / Click Start
  const handleDateMouseDown = (dateStr) => {
    if (dateStr < todayStr) return;

    if (singleDateMode) {
      onChange?.({ checkIn: dateStr, checkOut: "" });
      onClose?.();
      return;
    }

    setIsDragging(true);
    setDragStart(dateStr);
    setHoverDate(dateStr);
    setSelectionStep("checkOut");
    onChange?.({ checkIn: dateStr, checkOut: "" });
  };

  // Handle Drag Over / Hover
  const handleDateMouseEnter = (dateStr) => {
    if (dateStr < todayStr) return;
    if (isDragging || selectionStep === "checkOut") {
      setHoverDate(dateStr);
    }
  };

  // Handle Mouse Up (Drag release)
  const handleDateMouseUp = (dateStr) => {
    if (dateStr < todayStr) return;
    if (singleDateMode) return;

    if (isDragging && dragStart) {
      setIsDragging(false);
      if (dateStr !== dragStart) {
        const start = dateStr < dragStart ? dateStr : dragStart;
        const end = dateStr > dragStart ? dateStr : dragStart;
        onChange?.({ checkIn: start, checkOut: end });
        setSelectionStep(null);
        setDragStart(null);
        setHoverDate(null);
        onClose?.();
      }
    }
  };

  // Handle Click (Standard 2-click range select)
  const handleDateClick = (dateStr) => {
    if (dateStr < todayStr) return;

    if (singleDateMode) {
      onChange?.({ checkIn: dateStr, checkOut: "" });
      onClose?.();
      return;
    }

    if (!selectionStep || selectionStep !== "checkOut" || !dragStart) {
      // Step 1: Click start date
      setDragStart(dateStr);
      setSelectionStep("checkOut");
      setHoverDate(dateStr);
      onChange?.({ checkIn: dateStr, checkOut: "" });
    } else {
      // Step 2: Click end date
      if (dateStr === dragStart) {
        return;
      }
      const start = dateStr < dragStart ? dateStr : dragStart;
      const end = dateStr > dragStart ? dateStr : dragStart;
      onChange?.({ checkIn: start, checkOut: end });
      setSelectionStep(null);
      setDragStart(null);
      setHoverDate(null);
      onClose?.();
    }
  };

  const isSelectedStart = (dateStr) => effectiveStart && dateStr === effectiveStart;
  const isSelectedEnd = (dateStr) => effectiveEnd && dateStr === effectiveEnd && effectiveEnd !== effectiveStart;
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
          const isHovered = hoverDate === dateStr && !isStart && !isEnd;

          // Strip background for range in-between
          let stripClass = "";
          if (inRange) {
            stripClass = "bg-[#eaf2fd]";
          } else if (isStart && effectiveEnd && effectiveEnd !== effectiveStart) {
            stripClass = "bg-gradient-to-r from-transparent via-[#eaf2fd] to-[#eaf2fd]";
          } else if (isEnd) {
            stripClass = "bg-gradient-to-l from-transparent via-[#eaf2fd] to-[#eaf2fd]";
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
              className={`relative h-10 flex items-center justify-center transition-all ${
                isPast ? "cursor-not-allowed" : "cursor-pointer"
              } ${stripClass}`}
              onMouseDown={() => handleDateMouseDown(dateStr)}
              onMouseEnter={() => handleDateMouseEnter(dateStr)}
              onMouseUp={() => handleDateMouseUp(dateStr)}
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

  return (
    <div
      ref={containerRef}
      className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-3 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 ${
        singleDateMode ? "w-[340px] max-w-[92vw]" : "w-[96vw] max-w-[720px]"
      } animate-in fade-in zoom-in-95 duration-150 font-body text-slate-800 select-none`}
      style={{ boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)" }}
    >
      {/* Top Tabs */}
      {!singleDateMode && (
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`pb-3 px-6 font-bold text-sm transition relative cursor-pointer ${
              activeTab === "calendar"
                ? "text-[#0b63e5] border-b-2 border-[#0b63e5]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Lịch ngày
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("flexible")}
            className={`pb-3 px-6 font-bold text-sm transition cursor-pointer ${
              activeTab === "flexible"
                ? "text-[#0b63e5] border-b-2 border-[#0b63e5]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tôi linh hoạt
          </button>
        </div>
      )}

      {/* Month Navigation Arrows */}
      <div className="relative mb-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="absolute -top-3 left-0 w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer z-20"
          title="Tháng trước"
        >
          <span className="text-lg font-bold leading-none mb-0.5">‹</span>
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="absolute -top-3 right-0 w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer z-20"
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
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          {effectiveStart && effectiveEnd ? (
            <span className="text-slate-700 font-medium">
              Từ <strong className="text-[#0b63e5]">{effectiveStart}</strong> đến{" "}
              <strong className="text-[#0b63e5]">{effectiveEnd}</strong> (
              {Math.max(
                1,
                Math.round(
                  (new Date(effectiveEnd) - new Date(effectiveStart)) /
                    (1000 * 60 * 60 * 24)
                )
              )}{" "}
              đêm)
            </span>
          ) : effectiveStart ? (
            <span className="text-slate-700 font-medium">
              Ngày đã chọn: <strong className="text-[#0b63e5]">{effectiveStart}</strong>
            </span>
          ) : (
            <span className="text-slate-400">Chọn ngày nhận và trả phòng</span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="bg-[#0b63e5] hover:bg-[#0952c4] text-white font-bold px-6 py-2 rounded-xl transition cursor-pointer text-xs shadow-sm"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}
