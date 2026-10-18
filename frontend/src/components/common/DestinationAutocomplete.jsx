import { useState, useEffect, useRef } from "react";
import { IconMapPin, IconSearch, IconStar, IconX, IconHotel, IconTicket } from "../Icons";
import { locationService, normalizeText } from "../../services/locationService";

/**
 * Clock Icon for Recent Searches
 */
function IconClock({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * Helper to highlight matched query in text
 * Example: if text="Đà Lạt, Việt Nam" and query="d", highlights "Đ" in bold
 */
function HighlightedText({ text = "", query = "" }) {
  if (!query || !query.trim()) return <span>{text}</span>;

  const normQuery = normalizeText(query);
  const normText = normalizeText(text);

  const idx = normText.indexOf(normQuery);
  if (idx === -1) return <span>{text}</span>;

  const start = text.substring(0, idx);
  const match = text.substring(idx, idx + query.length);
  const end = text.substring(idx + query.length);

  return (
    <span>
      {start}
      <strong className="font-extrabold text-slate-900 underline decoration-primary-400 decoration-2 underline-offset-2">
        {match}
      </strong>
      {end}
    </span>
  );
}

export default function DestinationAutocomplete({
  value = "",
  onChange,
  onSelect,
  onEnterPress,
  placeholder = "Nhập địa điểm du lịch hoặc tên khách sạn...",
  error = "",
  activeTab = "stays",
  inputRef,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const internalInputRef = useRef(null);
  const resolvedRef = inputRef || internalInputRef;

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(locationService.getRecentSearches());
  }, []);

  // Fetch suggestions with debounce when value changes
  useEffect(() => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await locationService.searchLocations(trimmed, activeTab);
        if (active) {
          setSuggestions(results);
          setHighlightedIndex(-1);
          // Only open if there are actually matching results
          setIsOpen(results.length > 0);
        }
      } catch (err) {
        console.warn("Lỗi khi tìm địa điểm:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (item) => {
    const selectedName = item.name;
    onChange(selectedName);
    locationService.saveRecentSearch(item);
    setRecentSearches(locationService.getRecentSearches());
    setIsOpen(false);
    onSelect?.(item);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    resolvedRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        if (suggestions.length > 0) setIsOpen(true);
      }
      return;
    }

    const totalItems = suggestions.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < totalItems) {
        e.preventDefault();
        handleSelectItem(suggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
        onEnterPress?.();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const hasTypedQuery = Boolean(value && value.trim());
  const shouldShowDropdown = isOpen && hasTypedQuery && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative">
        <IconSearch
          size={18}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition ${
            error
              ? "text-rose-500"
              : shouldShowDropdown
              ? "text-primary-500"
              : "text-slate-400"
          }`}
        />
        <input
          ref={resolvedRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            // Only open on focus if user has already entered text and has results
            if (value && value.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            if (!val.trim()) {
              setIsOpen(false);
              setSuggestions([]);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
          className={`w-full h-[46px] pl-10 pr-9 rounded-xl text-sm font-semibold transition focus:outline-none ${
            error
              ? "bg-rose-50/50 border-2 border-rose-500 ring-2 ring-rose-100 text-slate-900 placeholder:text-rose-400"
              : shouldShowDropdown
              ? "bg-white border-2 border-primary-500 ring-4 ring-primary-100 text-slate-900"
              : "bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-900"
          }`}
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Xóa tìm kiếm"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <IconX size={12} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown - ONLY shows when user has typed and there are matching provinces */}
      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            <div className="py-2">
              <div className="px-4 py-1.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Địa điểm & Cơ sở phù hợp</span>
                {isLoading && (
                  <span className="text-[11px] text-primary-500 font-semibold animate-pulse">
                    Đang tìm...
                  </span>
                )}
              </div>

              {suggestions.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={item.id || `${item.name}-${index}`}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-2.5 flex items-center gap-3.5 transition cursor-pointer ${
                      isHighlighted ? "bg-slate-100/90" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Left Icon */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                      {item.isFacility ? (
                        item.type === "HOTEL" ? (
                          <IconHotel size={16} className="text-primary-600" />
                        ) : (
                          <IconTicket size={16} className="text-secondary-500" />
                        )
                      ) : item.isPopular ? (
                        <IconStar
                          size={16}
                          className="text-slate-800 fill-slate-800"
                          filled
                        />
                      ) : (
                        <IconMapPin size={16} className="text-slate-700" />
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          <HighlightedText
                            text={item.fullTitle || item.name}
                            query={value}
                          />
                        </span>

                        {/* Badges */}
                        {item.isFacility ? (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap ${
                            item.type === "HOTEL" ? "bg-primary-50 text-primary-700 border border-primary-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {item.type === "HOTEL" ? "Khách sạn" : "Khu vui chơi"}
                          </span>
                        ) : item.isPopular ? (
                          <span className="bg-[#0071ce] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                            Phổ biến
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {item.sub || (item.type === "CITY" ? "Thành phố" : "Tỉnh thành")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom helper tip */}
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Dùng phím ↑ ↓ để chọn, Enter để xác nhận</span>
            <span className="text-primary-600 font-bold">Khách sạn & Điểm du lịch</span>
          </div>
        </div>
      )}
    </div>
  );
}

