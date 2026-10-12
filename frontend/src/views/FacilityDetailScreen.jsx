import { useState } from "react";
import {
  IconMapPin,
  IconAlertTriangle,
  IconCheck,
  IconArrowRight
} from "../components/Icons";
const GALLERY = [
  "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&h=250&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=250&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=400&h=250&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=250&fit=crop&auto=format"
];
const ROOM_TIERS = [
  { name: "Deluxe Room", view: "City View", size: "48 sqm", maxGuests: 2 },
  { name: "Premier Room", view: "Marina Bay View", size: "56 sqm", maxGuests: 2 },
  { name: "Club Suite", view: "Panoramic Bay View", size: "92 sqm", maxGuests: 3 }
];
const TICKET_TIERS = [
  { name: "Standard", description: "General admission, all conservatories", qr: true },
  { name: "Premium", description: "+ OCBC Skyway & Supertree Observatory", qr: true },
  { name: "VIP", description: "+ Private guided tour & priority entry", qr: true }
];
const PRICE_MATRIX = {
  "Deluxe Room": { Standard: 448, Premium: 498, VIP: 580 },
  "Premier Room": { Standard: 558, Premium: 608, VIP: 690 },
  "Club Suite": { Standard: 780, Premium: 840, VIP: 930 }
};
const ALLOTMENT = {
  "Deluxe Room": 3,
  "Premier Room": 7,
  "Club Suite": 2
};
const REVIEWS = [
  {
    name: "Sophie L.",
    avatar: "SL",
    country: "France \u{1F1EB}\u{1F1F7}",
    rating: 5,
    date: "Sep 2026",
    text: "The infinity pool view at sunrise was absolutely breathtaking. The bundle package made everything seamless \u2014 QR passes delivered instantly and worked perfectly at every gate.",
    helpful: 24
  },
  {
    name: "Marcus T.",
    avatar: "MT",
    country: "Germany \u{1F1E9}\u{1F1EA}",
    rating: 5,
    date: "Aug 2026",
    text: "Best hotel in Singapore by far. Travelio's bundle saved us SGD 380 compared to booking separately. The QR code checkout was a brilliant touch.",
    helpful: 18
  },
  {
    name: "Priya K.",
    avatar: "PK",
    country: "India \u{1F1EE}\u{1F1F3}",
    rating: 4,
    date: "Aug 2026",
    text: "Wonderful stay overall. Room service could be faster but the Marina Bay view more than compensated. Will definitely use Travelio again.",
    helpful: 11
  }
];
function StarRating({ rating }) {
  return <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <svg key={i} width={13} height={13} viewBox="0 0 24 24" fill={i <= rating ? "#f59e0b" : "#e2e8f0"}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>)}
    </div>;
}
export default function Screen3({ onNavigate }) {
  const [selectedRoom, setSelectedRoom] = useState("Premier Room");
  const [selectedTicket, setSelectedTicket] = useState("Premium");
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(2);
  const [galleryActive, setGalleryActive] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const totalPrice = (PRICE_MATRIX[selectedRoom]?.[selectedTicket] ?? 0) * nights;
  return <div className="min-h-screen bg-bg-default font-body">
      {
    /* Breadcrumb */
  }
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-8 py-3 flex items-center gap-2 text-xs text-text-primary-500">
          <span className="font-heading font-700 text-text-primary text-sm mr-1">travelio</span>
          <span>›</span><span>Singapore</span>
          <span>›</span><span>Hotels</span>
          <span>›</span><span className="text-text-primary font-medium">Marina Bay Sands</span>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="flex gap-8">
          {
    /* Main content */
  }
          <div className="flex-1 min-w-0">
            {
    /* Header */
  }
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 text-xs text-text-primary-500 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => <svg key={i} width={14} height={14} viewBox="0 0 24 24" fill="#f59e0b">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>)}
                  <span className="ml-1">5-Star Resort</span>
                </div>
                <h1 className="font-heading font-800 text-3xl text-text-primary mb-2">Marina Bay Sands Hotel & Experiences</h1>
                <div className="flex items-center gap-4 text-sm text-text-primary-600">
                  <span className="flex items-center gap-1"><IconMapPin size={14} /> 10 Bayfront Ave, Marina Bay, Singapore</span>
                  <span className="flex items-center gap-1 text-success-600 font-semibold">✓ Free cancellation</span>
                  <span className="flex items-center gap-1 text-warning-600 font-semibold">⚡ Instant confirmation</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl border border-border px-4 py-2.5">
                <div className="bg-primary-500 text-white font-bold text-lg w-10 h-10 rounded-lg flex items-center justify-center">4.9</div>
                <div>
                  <div className="font-semibold text-text-primary text-sm">Exceptional</div>
                  <div className="text-xs text-text-primary-400">8,204 reviews</div>
                </div>
              </div>
            </div>

            {
    /* Gallery */
  }
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-80 mb-8 rounded-[12px] overflow-hidden">
              <div
    className="col-span-2 row-span-2 cursor-pointer overflow-hidden bg-sidebar-200"
    onClick={() => setGalleryActive(0)}
  >
                <img src={GALLERY[0]} alt="Main view" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              {GALLERY.slice(1).map((img, i) => <div key={i} className="cursor-pointer overflow-hidden bg-sidebar-200 relative">
                  <img src={img} alt={`View ${i + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  {i === 3 && <div className="absolute inset-0 bg-sidebar/50 flex items-center justify-center text-white font-semibold text-sm">
                      +12 photos
                    </div>}
                </div>)}
            </div>

            {
    /* Package Selector Matrix */
  }
            <div className="bg-white rounded-[12px] border border-border p-6 mb-6">
              <h2 className="font-heading font-700 text-xl text-text-primary mb-1">Select Your Package</h2>
              <p className="text-sm text-text-primary-500 mb-5">Choose a room tier and experience add-on to see bundled pricing</p>

              {
    /* Matrix table */
  }
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-text-primary-400 uppercase tracking-wide pb-3 pr-4 w-44">Room Tier</th>
                      {TICKET_TIERS.map((t) => <th key={t.name} className="pb-3 px-2">
                          <div
    className={`rounded-xl p-3 text-center cursor-pointer border-2 transition-all ${selectedTicket === t.name ? "border-primary-500 bg-primary-50" : "border-border hover:border-primary-300"}`}
    onClick={() => setSelectedTicket(t.name)}
  >
                            <div className="font-heading font-700 text-sm text-text-primary">{t.name}</div>
                            <div className="text-[11px] text-text-primary-500 mt-0.5">{t.description}</div>
                            {t.qr && <div className="mt-1.5 text-[10px] bg-success-100 text-success-700 px-2 py-0.5 rounded-full font-semibold inline-block">
                                QR Pass included
                              </div>}
                          </div>
                        </th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ROOM_TIERS.map((room) => <tr key={room.name} className="border-t border-border">
                        <td className="py-3 pr-4">
                          <div
    className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedRoom === room.name ? "border-primary-500 bg-primary-50" : "border-transparent hover:border-primary-200"}`}
    onClick={() => setSelectedRoom(room.name)}
  >
                            <div className="font-semibold text-sm text-text-primary">{room.name}</div>
                            <div className="text-xs text-text-primary-400">{room.size} · {room.view}</div>
                            {ALLOTMENT[room.name] <= 3 && <div className="flex items-center gap-1 text-secondary-500 text-[10px] font-semibold mt-1">
                                <IconAlertTriangle size={10} /> Only {ALLOTMENT[room.name]} left!
                              </div>}
                          </div>
                        </td>
                        {TICKET_TIERS.map((ticket) => {
    const price = PRICE_MATRIX[room.name][ticket.name];
    const isSelected = selectedRoom === room.name && selectedTicket === ticket.name;
    return <td key={ticket.name} className="py-3 px-2 text-center">
                              <div
      className={`rounded-xl p-3 cursor-pointer border-2 transition-all ${isSelected ? "border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-200" : selectedRoom === room.name && selectedTicket === ticket.name ? "border-primary-200" : "border-border hover:border-primary-300"}`}
      onClick={() => {
        setSelectedRoom(room.name);
        setSelectedTicket(ticket.name);
      }}
    >
                                <div className={`font-heading font-700 text-lg ${isSelected ? "text-white" : "text-primary-500"}`}>
                                  ${price}
                                </div>
                                <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-text-primary-400"}`}>per night</div>
                              </div>
                            </td>;
  })}
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            {
    /* Amenities */
  }
            <div className="bg-white rounded-[12px] border border-border p-6 mb-6">
              <h2 className="font-heading font-700 text-lg text-text-primary mb-4">What's included</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
    { icon: "\u{1F3CA}", label: "Infinity Pool (57F)" },
    { icon: "\u{1F310}", label: "High-Speed WiFi" },
    { icon: "\u{1F373}", label: "Breakfast Buffet" },
    { icon: "\u{1F9D6}", label: "Spa Access" },
    { icon: "\u{1F6CE}", label: "Concierge Service" },
    { icon: "\u{1F697}", label: "Valet Parking" }
  ].map((a) => <div key={a.label} className="flex items-center gap-2.5 p-3 bg-sidebar-50 rounded-lg">
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-sm font-medium text-text-primary-700">{a.label}</span>
                  </div>)}
              </div>
            </div>

            {
    /* Reviews */
  }
            <div className="bg-white rounded-[12px] border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading font-700 text-lg text-text-primary mb-1">Guest Reviews</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => <svg key={i} width={15} height={15} viewBox="0 0 24 24" fill="#f59e0b">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>)}
                    </div>
                    <span className="font-bold text-text-primary">4.9</span>
                    <span className="text-text-primary-400 text-sm">· 8,204 reviews</span>
                  </div>
                </div>
                <button
    onClick={() => setShowAllReviews(!showAllReviews)}
    className="text-primary-500 font-semibold text-sm hover:underline"
  >
                  {showAllReviews ? "Show less" : "View all reviews"}
                </button>
              </div>
              <div className="space-y-4">
                {REVIEWS.slice(0, showAllReviews ? 3 : 2).map((r) => <div key={r.name} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                          {r.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-text-primary">{r.name}</div>
                          <div className="text-xs text-text-primary-400">{r.country} · {r.date}</div>
                        </div>
                      </div>
                      <StarRating rating={r.rating} />
                    </div>
                    <p className="text-sm text-text-primary-700 leading-relaxed">{r.text}</p>
                    <div className="mt-2 text-xs text-text-primary-400">👍 {r.helpful} found helpful</div>
                  </div>)}
              </div>
            </div>
          </div>

          {
    /* Sticky Pricing Drawer */
  }
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-[12px] border border-border shadow-lg overflow-hidden">
              <div className="bg-primary-500 px-5 py-4">
                <div className="text-white/80 text-xs font-medium mb-0.5">Bundle Price from</div>
                <div className="font-heading font-800 text-white text-3xl">${PRICE_MATRIX[selectedRoom]?.[selectedTicket] ?? 0}</div>
                <div className="text-white/80 text-xs">per night · incl. {selectedTicket} experience</div>
              </div>

              <div className="p-5 space-y-4">
                {
    /* Dates */
  }
                <div>
                  <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Stay Dates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-border rounded-lg px-3 py-2 text-sm">
                      <div className="text-[10px] text-text-primary-400">Check-in</div>
                      <div className="font-semibold text-text-primary">15 Oct 2026</div>
                    </div>
                    <div className="border border-border rounded-lg px-3 py-2 text-sm">
                      <div className="text-[10px] text-text-primary-400">Check-out</div>
                      <div className="font-semibold text-text-primary">18 Oct 2026</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Nights</label>
                    <select
    value={nights}
    onChange={(e) => setNights(Number(e.target.value))}
    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
  >
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} night{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Guests</label>
                    <select
    value={guests}
    onChange={(e) => setGuests(Number(e.target.value))}
    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
  >
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                </div>

                {
    /* Selection summary */
  }
                <div className="bg-sidebar-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-primary-600">Room:</span>
                    <span className="font-medium text-text-primary">{selectedRoom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-primary-600">Experience:</span>
                    <span className="font-medium text-text-primary">{selectedTicket} Pass</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-primary-600">{nights} nights × ${PRICE_MATRIX[selectedRoom]?.[selectedTicket]}</span>
                    <span className="font-medium text-text-primary">${totalPrice}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
                    <span className="text-text-primary">Total before taxes</span>
                    <span className="text-primary-500 font-heading font-700">${totalPrice}</span>
                  </div>
                </div>

                {ALLOTMENT[selectedRoom] <= 5 && <div className="flex items-center gap-2 bg-secondary-50 border border-secondary-200 rounded-lg p-3 text-sm text-secondary-600">
                    <IconAlertTriangle size={14} />
                    <span className="font-medium">Only {ALLOTMENT[selectedRoom]} rooms left at this rate!</span>
                  </div>}

                <button
    onClick={() => onNavigate?.(4)}
    className="w-full bg-secondary-500 hover:bg-secondary-600 text-white font-heading font-700 py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
  >
                  Book Now <IconArrowRight size={16} />
                </button>

                <div className="flex items-center gap-2 text-xs text-text-primary-400 justify-center">
                  <IconCheck size={12} className="text-success-500" />
                  Free cancellation until 13 Oct 2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
