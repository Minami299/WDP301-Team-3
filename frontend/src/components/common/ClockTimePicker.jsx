import { useState, useRef, useEffect, useMemo } from "react";
import { IconClock, IconChevronDown, IconX } from "../Icons";

/**
 * ClockTimePicker - Interactive Analog & Digital Clock Picker for Hotel & Attraction Check-in Time
 * Clean, minimalistic, no distracting emojis or verbose banners.
 */
export default function ClockTimePicker({
  value = "Tôi chưa biết",
  onChange,
  isAttraction = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial value
  const isUnknown = value === "Tôi chưa biết" || !value;

  // Extract hour from value like "14:00 - 15:00" or "14:00"
  const parsedHour = useMemo(() => {
    if (isUnknown) return 14; // Default to 14:00 (standard hotel check-in)
    const match = String(value).match(/^(\d{1,2}):/);
    if (match) {
      const h = parseInt(match[1], 10);
      return isNaN(h) ? 14 : h;
    }
    return 14;
  }, [value, isUnknown]);

  // Selected state inside picker
  const [selectedHour, setSelectedHour] = useState(parsedHour);
  const [isUnknownSelected, setIsUnknownSelected] = useState(isUnknown);

  // Period: 'PM' (12-23) or 'AM' (0-11)
  const isPM = selectedHour >= 12;
  const [period, setPeriod] = useState(isPM ? "PM" : "AM");

  // Keep internal state synced when value prop changes
  useEffect(() => {
    setIsUnknownSelected(isUnknown);
    if (!isUnknown) {
      setSelectedHour(parsedHour);
      setPeriod(parsedHour >= 12 ? "PM" : "AM");
    }
  }, [value, isUnknown, parsedHour]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Compute 12 positions on the clock face
  // 12 is at the top (angle 0 / -90 deg in standard polar)
  const hoursOnClock = useMemo(() => {
    const list = [];
    const baseHour = period === "PM" ? 12 : 0;
    for (let i = 1; i <= 12; i++) {
      const displayHour = i === 12 ? (period === "PM" ? 12 : 0) : baseHour + i;
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 72; // Radius inside 200x200 viewBox
      const cx = 100;
      const cy = 100;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      list.push({
        index: i,
        hour: displayHour,
        label: String(displayHour).padStart(2, "0") + ":00",
        hourNumber: displayHour,
        x,
        y,
      });
    }
    return list;
  }, [period]);

  // Hand coordinates
  const activePosition = useMemo(() => {
    const found = hoursOnClock.find((h) => h.hourNumber === selectedHour);
    if (found) return { x: found.x, y: found.y };
    return { x: 100, y: 28 };
  }, [hoursOnClock, selectedHour]);

  // Handle selecting an hour on the clock
  const handleSelectHour = (hour) => {
    setSelectedHour(hour);
    setIsUnknownSelected(false);
    const nextH = (hour + 1) % 24;
    const formattedSlot = `${String(hour).padStart(2, "0")}:00 - ${String(
      nextH
    ).padStart(2, "0")}:00`;
    onChange?.(formattedSlot);
  };

  // Toggle "Tôi chưa biết"
  const handleSelectUnknown = () => {
    setIsUnknownSelected(true);
    onChange?.("Tôi chưa biết");
  };

  // Switch period between AM and PM
  const handleTogglePeriod = (newPeriod) => {
    setPeriod(newPeriod);
    let newH = selectedHour;
    if (newPeriod === "PM" && selectedHour < 12) {
      newH = selectedHour + 12;
    } else if (newPeriod === "AM" && selectedHour >= 12) {
      newH = selectedHour - 12;
    }
    setSelectedHour(newH);
    if (!isUnknownSelected) {
      const nextH = (newH + 1) % 24;
      const formattedSlot = `${String(newH).padStart(2, "0")}:00 - ${String(
        nextH
      ).padStart(2, "0")}:00`;
      onChange?.(formattedSlot);
    }
  };

  // Quick preset chips (Includes "Tôi chưa biết")
  const QUICK_PRESETS = [
    { label: "Tôi chưa biết", isUnknown: true },
    { label: "14:00 (Tiêu chuẩn)", hour: 14 },
    { label: "15:00", hour: 15 },
    { label: "16:00", hour: 16 },
    { label: "18:00 (Đến muộn)", hour: 18 },
    { label: "20:00 (Tối)", hour: 20 },
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* TRIGGER BUTTON (INPUT DISPLAY) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left rounded-xl border transition-all duration-200 flex items-center justify-between p-3 cursor-pointer bg-white ${
          isOpen
            ? "border-primary-500 ring-2 ring-primary-100 shadow-xs"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <IconClock size={18} className="text-slate-500 shrink-0" />
          <div>
            <div className="text-xs text-slate-500 font-medium">
              {isAttraction
                ? "Khoảng thời gian trải nghiệm"
                : "Giờ nhận phòng dự kiến"}
            </div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">
              {isUnknownSelected ? (
                <span className="text-slate-600 font-normal">Tôi chưa biết</span>
              ) : (
                <span className="text-primary-700 font-bold">{value}</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-slate-400 pl-2">
          <IconChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary-600" : ""
            }`}
          />
        </div>
      </button>

      {/* CLOCK POPOVER MODAL */}
      {isOpen && (
        <div className="absolute z-40 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-[350px] bg-white rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-sm text-slate-900">
              {isAttraction ? "Chọn giờ trải nghiệm" : "Chọn giờ nhận phòng"}
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Period Selector Tabs (Sáng / Chiều & Tối) - Clean, no emojis */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTogglePeriod("AM")}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                period === "AM" && !isUnknownSelected
                  ? "bg-white text-primary-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sáng (00:00 - 11:00)
            </button>
            <button
              type="button"
              onClick={() => handleTogglePeriod("PM")}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                period === "PM" && !isUnknownSelected
                  ? "bg-white text-primary-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chiều & Tối (12:00 - 23:00)
            </button>
          </div>

          {/* CIRCULAR CLOCK FACE */}
          <div className="flex flex-col items-center justify-center my-2">
            <div className="relative w-[210px] h-[210px]">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full select-none"
              >
                {/* Clock Face Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  className="fill-slate-50/70 stroke-slate-200"
                  strokeWidth="2"
                />

                {/* Inner decorative tick marks */}
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  className="fill-none stroke-slate-100"
                  strokeWidth="1"
                  strokeDasharray="2, 6"
                />

                {/* Clock Hand line (visible only when not unknown) */}
                {!isUnknownSelected && (
                  <line
                    x1="100"
                    y1="100"
                    x2={activePosition.x}
                    y2={activePosition.y}
                    className="stroke-primary-500 transition-all duration-200 ease-out"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Center Pivot Point */}
                <circle
                  cx="100"
                  cy="100"
                  r="4"
                  className={
                    !isUnknownSelected
                      ? "fill-primary-600"
                      : "fill-slate-400"
                  }
                />

                {/* Clock Hour Numbers and Hit Areas */}
                {hoursOnClock.map((item) => {
                  const isSelected =
                    !isUnknownSelected && item.hourNumber === selectedHour;
                  return (
                    <g
                      key={item.hourNumber}
                      onClick={() => handleSelectHour(item.hourNumber)}
                      className="cursor-pointer transition-transform duration-150 hover:scale-110 origin-center"
                      style={{
                        transformOrigin: `${item.x}px ${item.y}px`,
                      }}
                    >
                      {/* Transparent click circle */}
                      <circle
                        cx={item.x}
                        cy={item.y}
                        r="14"
                        className={
                          isSelected
                            ? "fill-primary-600 transition-all duration-200 shadow-md"
                            : "fill-transparent hover:fill-slate-200/60"
                        }
                      />

                      {/* Number Text */}
                      <text
                        x={item.x}
                        y={item.y + 4}
                        textAnchor="middle"
                        className={`text-[11px] font-sans select-none pointer-events-none transition-colors duration-150 ${
                          isSelected
                            ? "fill-white font-bold"
                            : "fill-slate-700 font-semibold"
                        }`}
                      >
                        {String(item.hourNumber).padStart(2, "0")}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Currently Selected Digital Banner */}
            {!isUnknownSelected && (
              <div className="mt-2 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  Khung giờ:
                </span>{" "}
                <strong className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                  {value}
                </strong>
              </div>
            )}
          </div>

          {/* Quick presets (Includes "Tôi chưa biết") */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
              Gợi ý mốc phổ biến:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((p) => {
                const isMatch = p.isUnknown
                  ? isUnknownSelected
                  : !isUnknownSelected && selectedHour === p.hour;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (p.isUnknown) {
                        handleSelectUnknown();
                      } else {
                        setPeriod("PM");
                        handleSelectHour(p.hour);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isMatch
                        ? "bg-primary-600 text-white shadow-xs font-bold"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
