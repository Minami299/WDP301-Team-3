import { useState } from "react";
import Screen1 from "./views/Screen1";
import Screen2 from "./views/Screen2";
import Screen3 from "./views/Screen3";
import Screen4 from "./views/Screen4";
import Screen5 from "./views/Screen5";
import Screen6 from "./views/Screen6";
import Screen7 from "./views/Screen7";
import Screen8 from "./views/Screen8";
import Screen9 from "./views/Screen9";
const SCREENS = [
  { id: 1, label: "Homepage", short: "1", group: "traveler", desc: "Hero & Booking Widget" },
  { id: 2, label: "Search Results", short: "2", group: "traveler", desc: "Listings & Filters" },
  { id: 3, label: "Product Detail", short: "3", group: "traveler", desc: "Booking Flow" },
  { id: 4, label: "Checkout", short: "4", group: "traveler", desc: "Payment & QR Pass" },
  { id: 5, label: "My Trips", short: "5", group: "traveler", desc: "Itinerary & Tickets" },
  { id: 6, label: "Vendor Dashboard", short: "6", group: "partner", desc: "Overview & KPIs" },
  { id: 7, label: "Inventory Manager", short: "7", group: "partner", desc: "Rates & Stop-Sell" },
  { id: 8, label: "QR Terminal", short: "8", group: "partner", desc: "Gate Redemption" },
  { id: 9, label: "Settlements", short: "9", group: "partner", desc: "Payouts & Finance" }
];
export default function App() {
  const [active, setActive] = useState(1);
  const current = SCREENS.find((s) => s.id === active);
  return <div className="h-screen flex flex-col overflow-hidden bg-sidebar font-body">
      {
    /* Navigation Bar */
  }
      <div className="bg-sidebar border-b border-border flex-shrink-0 z-50">
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {
    /* Brand */
  }
          <div className="flex items-center gap-1.5 pr-3 border-r border-border flex-shrink-0">
            <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="text-white font-heading font-700 text-sm">travelio</span>
          </div>

          {
    /* Group labels + screen tabs */
  }
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Traveler</span>
            {SCREENS.filter((s) => s.group === "traveler").map((s) => <button
    key={s.id}
    onClick={() => setActive(s.id)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${active === s.id ? "bg-primary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"}`}
  >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${active === s.id ? "bg-white/20" : "bg-sidebar-700"}`}>{s.short}</span>
                {s.label}
              </button>)}
          </div>

          <div className="w-px h-5 bg-sidebar-700 flex-shrink-0 mx-1" />

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Partner</span>
            {SCREENS.filter((s) => s.group === "partner").map((s) => <button
    key={s.id}
    onClick={() => setActive(s.id)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${active === s.id ? "bg-secondary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"}`}
  >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${active === s.id ? "bg-white/20" : "bg-sidebar-700"}`}>{s.short}</span>
                {s.label}
              </button>)}
          </div>

          <div className="ml-auto flex-shrink-0 flex items-center gap-2 pl-3 border-l border-border">
            <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${current.group === "traveler" ? "bg-primary-500/20 text-primary-400" : "bg-secondary-500/20 text-secondary-400"}`}>
              {current.group === "traveler" ? "Traveler Portal" : "Partner Portal"}
            </div>
            <span className="text-text-primary-400 text-[10px]">{current.desc}</span>
          </div>
        </div>
      </div>

      {
    /* Screen Content */
  }
      <div className="flex-1 overflow-hidden">
        {active === 1 && <div className="h-full overflow-y-auto"><Screen1 onNavigate={setActive} /></div>}
        {active === 2 && <div className="h-full overflow-y-auto"><Screen2 onNavigate={setActive} /></div>}
        {active === 3 && <div className="h-full overflow-y-auto"><Screen3 onNavigate={setActive} /></div>}
        {active === 4 && <div className="h-full overflow-y-auto"><Screen4 onNavigate={setActive} /></div>}
        {active === 5 && <div className="h-full overflow-y-auto"><Screen5 onNavigate={setActive} /></div>}
        {active === 6 && <Screen6 onNavigate={setActive} />}
        {active === 7 && <Screen7 onNavigate={setActive} />}
        {active === 8 && <Screen8 onNavigate={setActive} />}
        {active === 9 && <Screen9 onNavigate={setActive} />}
      </div>
    </div>;
}
