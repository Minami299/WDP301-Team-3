import { useState } from "react";
import {
  IconSearch,
  IconMapPin,
  IconHotel,
  IconTicket,
  IconFilter,
  IconMap,
  IconZap,
  IconCheck
} from "../components/Icons";
const HOTELS = [
  {
    id: 1,
    type: "hotel",
    name: "Marina Bay Sands Hotel",
    location: "Bayfront, Singapore",
    stars: 5,
    rating: 4.9,
    reviews: 8204,
    price: 420,
    originalPrice: 580,
    badges: ["Instant Confirm", "Free Cancellation"],
    amenities: ["Pool", "Spa", "WiFi", "Breakfast"],
    img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=500&h=320&fit=crop&auto=format",
    roomLeft: 3
  },
  {
    id: 2,
    type: "hotel",
    name: "The Fullerton Bay Hotel",
    location: "Marina Bay, Singapore",
    stars: 5,
    rating: 4.8,
    reviews: 4512,
    price: 310,
    originalPrice: 420,
    badges: ["Instant Confirm"],
    amenities: ["Pool", "WiFi", "Restaurant"],
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&h=320&fit=crop&auto=format",
    roomLeft: 7
  },
  {
    id: 3,
    type: "hotel",
    name: "Capella Singapore",
    location: "Sentosa Island, Singapore",
    stars: 5,
    rating: 4.9,
    reviews: 3102,
    price: 680,
    originalPrice: 850,
    badges: ["Instant Confirm", "Free Cancellation"],
    amenities: ["Pool", "Spa", "WiFi", "Breakfast", "Private Beach"],
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=320&fit=crop&auto=format",
    roomLeft: 2
  },
  {
    id: 4,
    type: "attraction",
    name: "Universal Studios Singapore",
    location: "Sentosa, Singapore",
    stars: 0,
    rating: 4.8,
    reviews: 22400,
    price: 78,
    originalPrice: 95,
    badges: ["Instant QR Pass"],
    amenities: [],
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=320&fit=crop&auto=format",
    roomLeft: 0
  },
  {
    id: 5,
    type: "hotel",
    name: "Andaz Singapore by Hyatt",
    location: "Duo Galleria, Singapore",
    stars: 5,
    rating: 4.7,
    reviews: 2988,
    price: 260,
    originalPrice: 330,
    badges: ["Free Cancellation"],
    amenities: ["Pool", "WiFi", "Gym"],
    img: "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=500&h=320&fit=crop&auto=format",
    roomLeft: 12
  },
  {
    id: 6,
    type: "attraction",
    name: "Gardens by the Bay \u2013 Flower Dome + Cloud Forest",
    location: "Marina Bay, Singapore",
    stars: 0,
    rating: 4.9,
    reviews: 18700,
    price: 28,
    originalPrice: 35,
    badges: ["Instant QR Pass", "Free Cancellation"],
    amenities: [],
    img: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=500&h=320&fit=crop&auto=format",
    roomLeft: 0
  }
];
function StarRow({ count }) {
  return <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <svg key={i} width={11} height={11} viewBox="0 0 24 24" fill={i <= count ? "#f59e0b" : "#e2e8f0"} className="">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>)}
    </div>;
}
export default function Screen2({ onNavigate }) {
  const [priceRange, setPriceRange] = useState(700);
  const [showMap, setShowMap] = useState(false);
  const [activeFilters, setActiveFilters] = useState(["Instant Confirm"]);
  const [sortBy, setSortBy] = useState("recommended");
  const [activeType, setActiveType] = useState("all");
  const toggleFilter = (f) => setActiveFilters(
    (prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
  );
  const filtered = HOTELS.filter((h) => {
    if (activeType !== "all" && h.type !== activeType) return false;
    if (h.price > priceRange) return false;
    return true;
  });
  return <div className="min-h-screen bg-bg-default font-body">
      {
    /* Sticky top bar */
  }
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 font-heading font-800 text-text-primary text-base">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <IconMapPin size={14} className="text-white" />
            </div>
            travelio
          </div>
          <div className="flex-1 flex items-center gap-2 bg-sidebar-100 rounded-xl px-4 py-2">
            <IconSearch size={15} className="text-text-primary-400" />
            <span className="text-sm text-text-primary font-medium">Singapore</span>
            <span className="text-text-primary-300">·</span>
            <span className="text-sm text-text-primary-600">15–18 Oct 2026</span>
            <span className="text-text-primary-300">·</span>
            <span className="text-sm text-text-primary-600">2 guests</span>
            <button className="ml-2 text-xs text-primary-500 font-semibold">Modify</button>
          </div>
          <div className="flex items-center gap-2">
            {["all", "hotel", "attraction"].map((t) => <button
    key={t}
    onClick={() => setActiveType(t)}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${activeType === t ? "bg-primary-500 text-white" : "bg-sidebar-100 text-text-primary-600 hover:bg-sidebar-200"}`}
  >
                {t === "hotel" && <IconHotel size={13} />}
                {t === "attraction" && <IconTicket size={13} />}
                {t === "all" && <IconFilter size={13} />}
                <span className="capitalize">{t === "all" ? "All Types" : t === "hotel" ? "Stays" : "Attractions"}</span>
              </button>)}
          </div>
          <button
    onClick={() => setShowMap(!showMap)}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${showMap ? "bg-primary-50 border-primary-500 text-primary-600" : "border-border text-text-primary-600 hover:border-border"}`}
  >
            <IconMap size={15} /> {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-6">
        <div className="flex gap-6">
          {
    /* Sticky Filter Sidebar */
  }
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-20 space-y-5">
              <div className="bg-white rounded-[12px] border border-border p-5">
                <h3 className="font-heading font-700 text-text-primary text-sm mb-4 flex items-center justify-between">
                  Filters
                  <button className="text-xs text-primary-500 font-medium">Clear all</button>
                </h3>

                {
    /* Price Range */
  }
                <div className="mb-5">
                  <div className="flex justify-between text-xs font-semibold text-text-primary-600 mb-3">
                    <span>Price per night / ticket</span>
                    <span className="text-primary-500">${priceRange}</span>
                  </div>
                  <input
    type="range"
    min={20}
    max={1e3}
    value={priceRange}
    onChange={(e) => setPriceRange(Number(e.target.value))}
    className="w-full"
  />
                  <div className="flex justify-between text-xs text-text-primary-400 mt-1">
                    <span>$20</span><span>$1,000+</span>
                  </div>
                </div>

                {
    /* Quick Filters */
  }
                <div className="mb-5">
                  <p className="text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-2">Quick Filters</p>
                  <div className="space-y-2">
                    {["Instant Confirm", "Free Cancellation", "Breakfast Included", "Instant QR Pass"].map((f) => <label key={f} className="flex items-center gap-2.5 cursor-pointer group">
                        <div
    onClick={() => toggleFilter(f)}
    className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${activeFilters.includes(f) ? "bg-primary-500 border-primary-500" : "border-border group-hover:border-primary-400"}`}
  >
                          {activeFilters.includes(f) && <IconCheck size={10} className="text-white" />}
                        </div>
                        <span className="text-sm text-text-primary-700">{f}</span>
                      </label>)}
                  </div>
                </div>

                {
    /* Star Rating */
  }
                <div className="mb-5">
                  <p className="text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-2">Hotel Stars</p>
                  <div className="flex gap-1.5">
                    {[3, 4, 5].map((s) => <button key={s} className="flex-1 border border-border hover:border-primary-400 rounded-lg py-1.5 text-xs font-semibold text-text-primary-600 hover:text-primary-500">
                        {s}★
                      </button>)}
                  </div>
                </div>

                {
    /* Guest Rating */
  }
                <div>
                  <p className="text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-2">Guest Rating</p>
                  <div className="space-y-1.5">
                    {[["4.8+", "Exceptional"], ["4.5+", "Excellent"], ["4.0+", "Very Good"]].map(([val, label]) => <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-border hover:border-primary-500" />
                        <span className="text-sm text-text-primary-700">{val}</span>
                        <span className="text-xs text-text-primary-400">{label}</span>
                      </label>)}
                  </div>
                </div>
              </div>

              {
    /* Neighbourhood */
  }
              <div className="bg-white rounded-[12px] border border-border p-4">
                <p className="text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-3">Neighbourhood</p>
                <div className="space-y-1.5">
                  {["Marina Bay", "Orchard Road", "Sentosa", "Bugis / Arab St", "Chinatown"].map((n) => <label key={n} className="flex items-center gap-2 cursor-pointer text-sm text-text-primary-700 hover:text-text-primary">
                      <div className="w-3.5 h-3.5 rounded border border-border" />
                      {n}
                    </label>)}
                </div>
              </div>
            </div>
          </aside>

          {
    /* Results */
  }
          <div className="flex-1">
            {
    /* Sort bar */
  }
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-primary-600">
                <span className="font-semibold text-text-primary">{filtered.length} results</span> for Singapore · 15–18 Oct
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary-600">Sort by:</span>
                <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="text-sm font-semibold text-text-primary border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-500"
  >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>

            {showMap && <div className="bg-sidebar-100 rounded-[12px] h-48 mb-4 overflow-hidden relative border border-border">
                <img
    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1000&h=400&fit=crop&auto=format"
    alt="Map of Singapore"
    className="w-full h-full object-cover opacity-60"
  />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 text-sm font-semibold text-text-primary shadow">
                    <IconMap size={16} className="inline mr-2 text-primary-500" />
                    Interactive map — 6 results in view
                  </div>
                </div>
                {[{ top: "30%", left: "40%", price: "$420" }, { top: "55%", left: "60%", price: "$310" }, { top: "70%", left: "30%", price: "$680" }].map((pin, i) => <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                    <div className="bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">{pin.price}</div>
                  </div>)}
              </div>}

            <div className="space-y-4">
              {filtered.map((item) => <div
    key={item.id}
    className="bg-white rounded-[12px] border border-border overflow-hidden hover:shadow-md flex cursor-pointer group"
    onClick={() => onNavigate?.(3)}
  >
                  <div className="w-64 h-48 flex-shrink-0 overflow-hidden bg-sidebar-100 relative">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {item.type === "attraction" && <div className="absolute top-2 left-2 bg-secondary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <IconTicket size={10} /> Attraction
                      </div>}
                  </div>
                  <div className="flex-1 p-5 flex">
                    <div className="flex-1">
                      {item.type === "hotel" && <StarRow count={item.stars} />}
                      <h3 className="font-heading font-700 text-text-primary text-lg mt-1 mb-0.5">{item.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-text-primary-500 mb-3">
                        <IconMapPin size={12} />{item.location}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.badges.map((b) => <span
    key={b}
    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${b.includes("QR") ? "bg-success-100 text-success-700" : b.includes("Cancel") ? "bg-primary-50 text-primary-600" : "bg-warning-100 text-warning-700"}`}
  >
                            {b.includes("QR") && <IconQR size={10} />}
                            {b.includes("Instant Confirm") && <IconZap size={10} />}
                            {b.includes("Cancel") && <IconCheck size={10} />}
                            {b}
                          </span>)}
                      </div>

                      {item.amenities.length > 0 && <div className="flex flex-wrap gap-2">
                          {item.amenities.map((a) => <span key={a} className="text-xs text-text-primary-500 bg-sidebar-100 px-2 py-0.5 rounded">{a}</span>)}
                        </div>}
                    </div>

                    <div className="text-right flex flex-col items-end justify-between ml-6 min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-primary-500 text-white text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center">{item.rating}</div>
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{item.rating >= 4.8 ? "Exceptional" : item.rating >= 4.5 ? "Excellent" : "Very Good"}</div>
                          <div className="text-[10px] text-text-primary-400">{item.reviews.toLocaleString()} reviews</div>
                        </div>
                      </div>
                      <div>
                        {item.roomLeft > 0 && item.roomLeft <= 5 && <div className="text-secondary-500 text-xs font-semibold mb-1 flex items-center gap-1 justify-end">
                            ⚡ Only {item.roomLeft} left!
                          </div>}
                        <div className="text-xs text-text-primary-400 line-through">${item.originalPrice}</div>
                        <div className="font-heading font-800 text-primary-500 text-2xl">${item.price}</div>
                        <div className="text-xs text-text-primary-400">{item.type === "hotel" ? "per night" : "per person"}</div>
                        <button
    onClick={(e) => {
      e.stopPropagation();
      onNavigate?.(3);
    }}
    className="mt-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg w-full"
  >
                          {item.type === "hotel" ? "View Rooms" : "Get Tickets"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
function IconQR({ size = 16, className = "" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" />
    </svg>;
}
