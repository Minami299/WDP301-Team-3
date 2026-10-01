import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  IconSearch,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconHotel,
  IconTicket,
  IconPackage,
  IconQR,
  IconArrowRight,
  IconStar,
  IconZap,
  IconShield,
  IconPlus,
  IconMinus,
  IconCheck,
  IconX
} from "../components/Icons";
const COMBO_CARDS = [
  {
    id: 1,
    title: "Marina Bay Stay & Garden Rhapsody",
    hotel: "The Ritz-Carlton, Millenia",
    location: "Singapore",
    nights: 2,
    activities: ["Gardens by the Bay", "Singapore River Cruise"],
    price: 748,
    originalPrice: 920,
    rating: 4.9,
    reviews: 312,
    badge: "Best Seller",
    img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&h=400&fit=crop&auto=format"
  },
  {
    id: 2,
    title: "Kyoto Heritage & Arashiyama Trail",
    hotel: "Hoshinoya Kyoto",
    location: "Kyoto, Japan",
    nights: 3,
    activities: ["Fushimi Inari Hike", "Bamboo Grove Tour"],
    price: 1240,
    originalPrice: 1560,
    rating: 4.8,
    reviews: 198,
    badge: "Cultural Pick",
    img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop&auto=format"
  },
  {
    id: 3,
    title: "Bali Cliff Villa & Uluwatu Sunset",
    hotel: "Anantara Uluwatu",
    location: "Bali, Indonesia",
    nights: 4,
    activities: ["Uluwatu Temple Tour", "Blue Point Surf Lesson"],
    price: 892,
    originalPrice: 1150,
    rating: 4.9,
    reviews: 445,
    badge: "Top Rated",
    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop&auto=format"
  }
];
const TRENDING_ACTIVITIES = [
  {
    id: 1,
    name: "Burj Khalifa At The Top",
    city: "Dubai, UAE",
    price: 49,
    rating: 4.7,
    sold: "12k+ sold",
    instant: true,
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop&auto=format"
  },
  {
    id: 2,
    name: "Universal Studios Express Pass",
    city: "Singapore",
    price: 108,
    rating: 4.8,
    sold: "8.3k sold",
    instant: true,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format"
  },
  {
    id: 3,
    name: "Ha Long Bay Overnight Cruise",
    city: "Ha Long, Vietnam",
    price: 185,
    rating: 4.9,
    sold: "5.1k sold",
    instant: false,
    img: "https://images.unsplash.com/photo-1557640647-6dd64af8ceb1?w=400&h=300&fit=crop&auto=format"
  },
  {
    id: 4,
    name: "Tokyo TeamLab Borderless",
    city: "Tokyo, Japan",
    price: 32,
    rating: 4.9,
    sold: "20k+ sold",
    instant: true,
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&auto=format"
  }
];
function StarRating({ rating }) {
  return <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <IconStar key={i} size={12} filled={i <= Math.floor(rating)} className="text-warning-500" />)}
    </div>;
}

export default function Screen1({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("stays");
  const [guests, setGuests] = useState(2);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  return <div className="min-h-screen bg-bg-default font-body">
      <Header />

      {
    /* Hero */
  }
      <section className="relative h-[580px] overflow-hidden">
        <img
    src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1440&h=580&fit=crop&auto=format"
    alt="Aerial travel destination view"
    className="w-full h-full object-cover"
  />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/40 via-dark/30 to-dark/70" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="text-primary-200 font-medium text-sm tracking-widest uppercase mb-3">Your Journey, Seamlessly Booked</p>
            <h1 className="font-heading font-800 text-white text-5xl leading-tight max-w-2xl mx-auto">
              Discover. Book. Experience.
            </h1>
            <p className="text-white/80 mt-3 text-lg">Hotels, attractions & experiences — all in one place.</p>
          </div>

          {
    /* Search Widget */
  }
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            {
    /* Tabs */
  }
            <div className="flex border-b border-border">
              {["stays", "attractions", "bundles"].map((tab) => <button
    key={tab}
    onClick={() => setActiveTab(tab)}
    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${activeTab === tab ? "text-primary-500 border-b-2 border-primary-500 bg-primary-50" : "text-text-primary-600 hover:text-text-primary hover:bg-sidebar-100"}`}
  >
                  {tab === "stays" && <IconHotel size={15} />}
                  {tab === "attractions" && <IconTicket size={15} />}
                  {tab === "bundles" && <IconPackage size={15} />}
                  <span className="capitalize">{tab}</span>
                  {tab === "bundles" && <span className="bg-secondary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Save 20%</span>}
                </button>)}
            </div>

            {
    /* Form */
  }
            <div className="p-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-text-primary-600 mb-1.5 uppercase tracking-wide">
                  {activeTab === "stays" ? "Destination or Hotel" : activeTab === "attractions" ? "City or Venue" : "Destination"}
                </label>
                <div className="relative">
                  <IconMapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary-400" />
                  <input
    type="text"
    placeholder={activeTab === "stays" ? "Singapore, Bali, Tokyo\u2026" : activeTab === "attractions" ? "Dubai, Singapore\u2026" : "Select a destination"}
    defaultValue="Singapore"
    className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary-600 mb-1.5 uppercase tracking-wide">
                  {activeTab === "stays" ? "Check-in" : "Date"}
                </label>
                <div className="relative">
                  <IconCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary-400" />
                  <input
    type="text"
    defaultValue="15 Oct 2026"
    className="pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm w-36 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
  />
                </div>
              </div>
              {activeTab === "stays" && <div>
                  <label className="block text-xs font-semibold text-text-primary-600 mb-1.5 uppercase tracking-wide">Check-out</label>
                  <div className="relative">
                    <IconCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary-400" />
                    <input
    type="text"
    defaultValue="18 Oct 2026"
    className="pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm w-36 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
  />
                  </div>
                </div>}
              <div>
                <label className="block text-xs font-semibold text-text-primary-600 mb-1.5 uppercase tracking-wide">
                  {activeTab === "attractions" ? "Tickets" : "Guests"}
                </label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                  <button
    onClick={() => setGuests((g) => Math.max(1, g - 1))}
    className="text-text-primary-400 hover:text-text-primary"
  >
                    <IconMinus size={14} />
                  </button>
                  <span className="text-sm font-semibold w-4 text-center">{guests}</span>
                  <button
    onClick={() => setGuests((g) => Math.min(10, g + 1))}
    className="text-text-primary-400 hover:text-text-primary"
  >
                    <IconPlus size={14} />
                  </button>
                  <IconUsers size={14} className="text-text-primary-400 ml-1" />
                </div>
              </div>
              <button
    onClick={() => onNavigate?.(2)}
    className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 whitespace-nowrap"
  >
                <IconSearch size={16} />
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {
    /* Trust signals */
  }
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-8 py-3 flex items-center justify-center gap-10 text-xs text-text-primary-600">
          {[
    { icon: <IconShield size={14} className="text-success-500" />, text: "Secure Booking Guarantee" },
    { icon: <IconZap size={14} className="text-warning-500" />, text: "Instant QR Pass Delivery" },
    { icon: <IconQR size={14} className="text-primary-500" />, text: "2.4M+ QR Gates Activated" },
    { icon: <IconStar size={14} className="text-secondary-500" filled />, text: "4.8 avg. platform rating" }
  ].map((item, i) => <div key={i} className="flex items-center gap-1.5 font-medium">
              {item.icon}
              {item.text}
            </div>)}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-12">
        {
    /* Stay+Play Combos */
  }
        <div className="mb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-primary-500 font-semibold text-sm uppercase tracking-widest mb-1">Curated Packages</p>
              <h2 className="font-heading font-700 text-3xl text-text-primary">Stay + Play Combos</h2>
              <p className="text-text-primary-600 mt-1">Bundle your hotel with local experiences and save up to 30%</p>
            </div>
            <button
    onClick={() => onNavigate?.(2)}
    className="flex items-center gap-1.5 text-primary-500 font-semibold text-sm hover:underline"
  >
              View all packages <IconArrowRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {COMBO_CARDS.map((card) => <div
    key={card.id}
    className="bg-white rounded-[12px] overflow-hidden border border-border hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
    onClick={() => onNavigate?.(3)}
  >
                <div className="relative h-48 overflow-hidden bg-sidebar-200">
                  <img src={card.img} alt={card.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-3 left-3 bg-secondary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {card.badge}
                  </span>
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-dark/60 to-transparent" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1 text-xs text-text-primary-600 mb-1.5">
                    <IconMapPin size={12} />
                    {card.location}
                  </div>
                  <h3 className="font-heading font-700 text-text-primary text-base leading-snug mb-1">{card.title}</h3>
                  <p className="text-xs text-text-primary-600 mb-2">{card.hotel} · {card.nights} nights</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {card.activities.map((a) => <span key={a} className="bg-primary-50 text-primary-600 text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <IconTicket size={10} /> {a}
                      </span>)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={card.rating} />
                      <span className="text-xs font-semibold text-text-primary">{card.rating}</span>
                      <span className="text-xs text-text-primary-400">({card.reviews})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-primary-400 line-through">${card.originalPrice}</div>
                      <div className="font-heading font-700 text-primary-500 text-lg">${card.price}</div>
                      <div className="text-[10px] text-text-primary-400">per person</div>
                    </div>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {
    /* Trending Activities */
  }
        <div className="mb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-secondary-500 font-semibold text-sm uppercase tracking-widest mb-1">Trending Now</p>
              <h2 className="font-heading font-700 text-3xl text-text-primary">Popular Experiences</h2>
            </div>
            <button className="flex items-center gap-1.5 text-primary-500 font-semibold text-sm hover:underline">
              View all <IconArrowRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {TRENDING_ACTIVITIES.map((act) => <div
    key={act.id}
    className="bg-white rounded-[12px] overflow-hidden border border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
    onClick={() => onNavigate?.(3)}
  >
                <div className="relative h-40 overflow-hidden bg-sidebar-200">
                  <img src={act.img} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {act.instant && <div className="absolute top-2 right-2 bg-success-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <IconQR size={10} /> Instant QR Pass
                    </div>}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-text-primary-400 mb-1">
                    <IconMapPin size={11} />{act.city}
                  </div>
                  <h3 className="font-heading font-600 text-sm text-text-primary leading-snug mb-2">{act.name}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StarRating rating={act.rating} />
                      <span className="text-[11px] text-text-primary-400 ml-1">{act.sold}</span>
                    </div>
                    <div className="font-heading font-700 text-primary-500 text-base">from ${act.price}</div>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {
    /* Guest Lookup Widget */
  }
        <div className="bg-gradient-to-r from-dark to-dark-800 rounded-2xl p-8 flex items-center gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <IconQR size={20} className="text-primary-400" />
              <span className="text-primary-400 font-semibold text-sm uppercase tracking-widest">No Account Needed</span>
            </div>
            <h2 className="font-heading font-700 text-white text-2xl mb-2">Track Your Booking</h2>
            <p className="text-text-primary-400 text-sm">Enter your booking reference or email to retrieve your QR passes, itinerary, and invoice — no login required.</p>
          </div>
          <div className="flex-1 max-w-lg">
            <div className="bg-sidebar-800 rounded-xl p-5 border border-border">
              <div className="flex gap-3 mb-3">
                <input
    type="text"
    placeholder="Booking ref: TVL-2026-XXXXXX"
    value={lookupCode}
    onChange={(e) => setLookupCode(e.target.value)}
    className="flex-1 bg-sidebar-700 border border-border text-white placeholder-dark-400 px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-primary-500"
  />
                <button
    onClick={() => setLookupResult(lookupCode.length > 5 ? "found" : "not-found")}
    className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
  >
                  Look Up
                </button>
              </div>
              {lookupResult === "found" && <div className="bg-success-500/10 border border-success-500/30 rounded-lg p-3 flex items-center gap-2 text-success-400 text-sm">
                  <IconCheck size={15} /> Booking found! <button onClick={() => onNavigate?.(5)} className="underline ml-1">View itinerary →</button>
                </div>}
              {lookupResult === "not-found" && <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3 flex items-center gap-2 text-danger-400 text-sm">
                  <IconX size={15} /> No booking found. Check your reference or try your email.
                </div>}
              <p className="text-text-primary-500 text-xs mt-2 text-center">Or enter the email address used at checkout</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>;
}
