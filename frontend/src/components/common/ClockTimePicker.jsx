import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown, IconClock, IconX } from "../Icons";

const UNKNOWN = "Tôi chưa biết";
// Khi khách sạn chưa cấu hình giờ cố định, cho phép khách chọn đủ 24 giờ
// (bao gồm cả nhận phòng đêm/sáng sớm). Nếu có timeSlots thật thì dùng đúng danh sách đó.
const HOTEL_SLOTS = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
const ATTRACTION_SLOTS = HOTEL_SLOTS;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const slotStart = (slot) => {
  if (slot === "ALL_DAY" || slot === "Cả ngày") return "Cả ngày";
  const match = String(slot || "").match(/^(\d{1,2}:\d{2})/);
  return match && TIME_RE.test(match[1].padStart(5, "0")) ? match[1].padStart(5, "0") : null;
};

const slotLabel = (slot) => (slot === "Cả ngày" ? "Cả ngày" : `${slot} - ${String((Number(slot.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`);

export default function ClockTimePicker({
  value = UNKNOWN,
  onChange,
  isAttraction = false,
  timeSlots = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(() => slotStart(value) || "");
  const containerRef = useRef(null);

  const configuredSlots = useMemo(
    () => [...new Set((Array.isArray(timeSlots) ? timeSlots : []).map(slotStart).filter((slot) => slot && slot !== "Cả ngày"))],
    [timeSlots],
  );
  const slots = useMemo(
    () => (configuredSlots.length ? configuredSlots : isAttraction ? ATTRACTION_SLOTS : HOTEL_SLOTS),
    [configuredSlots, isAttraction],
  );
  const hasConfiguredSlots = configuredSlots.length > 0;

  const isUnknown = !value || value === UNKNOWN;
  const selected = slots.includes(selectedSlot) ? selectedSlot : slots[0];
  const selectedHour = selected && selected !== "Cả ngày" ? Number(selected.slice(0, 2)) : 14;
  const period = selectedHour >= 12 ? "PM" : "AM";
  const hoursForPeriod = useMemo(
    () => slots.filter((slot) => slot !== "Cả ngày" && (period === "PM" ? Number(slot.slice(0, 2)) >= 12 : Number(slot.slice(0, 2)) < 12)),
    [period, slots],
  );

  useEffect(() => {
    const next = slotStart(value);
    setSelectedSlot(next && slots.includes(next) ? next : "");
  }, [slots, value]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    onChange?.(slot === "Cả ngày" ? slot : slotLabel(slot));
  };

  const clockHours = useMemo(() => {
    const result = [];
    for (let index = 1; index <= 12; index += 1) {
      const hour = period === "PM" ? (index === 12 ? 12 : index + 12) : index === 12 ? 0 : index;
      const angle = (index * 30 - 90) * (Math.PI / 180);
    result.push({
        hour,
        label: String(hour % 12 || 12),
        x: 100 + 72 * Math.cos(angle),
        y: 100 + 72 * Math.sin(angle),
        enabled: hoursForPeriod.some((slot) => Number(slot.slice(0, 2)) === hour),
      });
    }
    return result;
  }, [hoursForPeriod, period]);

  const displayValue = isUnknown ? UNKNOWN : value === "Cả ngày" ? "Cả ngày" : value;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} className={`w-full rounded-xl border bg-white p-3 text-left flex items-center justify-between ${isOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-slate-300 hover:border-slate-400"}`}>
        <span className="flex items-center gap-3"><IconClock size={18} className="text-slate-500" /><span><span className="block text-xs font-medium text-slate-500">{isAttraction ? "Khung giờ tham quan" : "Giờ nhận phòng dự kiến"}</span><span className={`block mt-0.5 text-sm font-semibold ${isUnknown ? "text-slate-600" : "text-primary-700"}`}>{displayValue}</span></span></span>
        <IconChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180 text-primary-600" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-[350px] z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="text-sm font-bold text-slate-900">{isAttraction ? "Chọn khung giờ tham quan" : "Chọn giờ nhận phòng"}</h3><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><IconX size={16} /></button></div>

          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {[['AM', 'Buổi sáng'], ['PM', 'Buổi chiều / tối']].map(([key, label]) => {
              const enabled = slots.some((slot) => slot !== "Cả ngày" && (key === "PM" ? Number(slot.slice(0, 2)) >= 12 : Number(slot.slice(0, 2)) < 12));
              return <button key={key} type="button" disabled={!enabled} onClick={() => { const first = slots.find((slot) => slot !== "Cả ngày" && (key === "PM" ? Number(slot.slice(0, 2)) >= 12 : Number(slot.slice(0, 2)) < 12)); if (first) selectSlot(first); }} className={`rounded-lg py-1.5 ${period === key && !isUnknown ? "bg-white text-primary-700 shadow-sm" : "text-slate-600"} disabled:cursor-not-allowed disabled:opacity-40`}>{label}</button>;
            })}
          </div>

          <div className="my-2 flex justify-center"><div className="relative h-[210px] w-[210px]"><svg viewBox="0 0 200 200" className="h-full w-full"><circle cx="100" cy="100" r="92" className="fill-slate-50 stroke-slate-200" strokeWidth="2" /><circle cx="100" cy="100" r="86" className="fill-none stroke-slate-100" strokeWidth="1" strokeDasharray="2,6" />{!isUnknown && <line x1="100" y1="100" x2={clockHours.find((item) => item.hour === selectedHour)?.x || 100} y2={clockHours.find((item) => item.hour === selectedHour)?.y || 28} className="stroke-primary-500" strokeWidth="2.5" strokeLinecap="round" />}<circle cx="100" cy="100" r="4" className="fill-primary-600" />{clockHours.map((item) => <g key={item.hour} onClick={() => { if (item.enabled) selectSlot(slots.find((slot) => Number(slot.slice(0, 2)) === item.hour)); }} className={item.enabled ? "cursor-pointer" : "cursor-not-allowed"} aria-disabled={!item.enabled}><circle cx={item.x} cy={item.y} r="15" className={item.hour === selectedHour && !isUnknown ? "fill-primary-600" : "fill-transparent hover:fill-slate-200/70"} /><text x={item.x} y={item.y + 4} textAnchor="middle" className={`text-[12px] font-semibold ${item.hour === selectedHour && !isUnknown ? "fill-white" : item.enabled ? "fill-slate-700" : "fill-slate-400"}`}>{item.label}</text></g>)}</svg></div></div>

          <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-[11px] font-semibold text-slate-500">{hasConfiguredSlots ? "Khung giờ đã được cơ sở cấu hình:" : isAttraction ? "Chọn trực tiếp giờ tham quan:" : "Chọn trực tiếp giờ nhận phòng:"}</p>{hasConfiguredSlots ? <div className="flex flex-wrap gap-1.5">{slots.map((slot) => <button key={slot} type="button" onClick={() => selectSlot(slot)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${selected === slot && !isUnknown ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{slotLabel(slot)}</button>)}<button type="button" onClick={() => { setSelectedSlot(""); onChange?.(UNKNOWN); }} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${isUnknown ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{UNKNOWN}</button></div> : <><p className="text-xs text-slate-500">Tất cả các giờ trong ngày đều có thể chọn trên đồng hồ.</p><button type="button" onClick={() => { setSelectedSlot(""); onChange?.(UNKNOWN); }} className={`mt-2 rounded-lg px-2.5 py-1 text-xs font-semibold ${isUnknown ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{UNKNOWN}</button></>}</div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => setIsOpen(false)} className="w-full rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">Xác nhận</button></div>
        </div>
      )}
    </div>
  );
}
