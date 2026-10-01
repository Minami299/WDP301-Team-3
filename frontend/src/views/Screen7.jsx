import { useState } from "react";
import { Sidebar } from "./Screen6";
import { IconAlertTriangle, IconCheck, IconX, IconZap } from "../components/Icons";
const DATES = ["Mon 13", "Tue 14", "Wed 15", "Thu 16", "Fri 17", "Sat 18", "Sun 19", "Mon 20", "Tue 21", "Wed 22", "Thu 23"];
const INITIAL_RATES = {
  "Deluxe Room": {
    "Mon 13": { price: 380, allot: 20, available: 14 },
    "Tue 14": { price: 380, allot: 20, available: 17 },
    "Wed 15": { price: 420, allot: 20, available: 3 },
    "Thu 16": { price: 420, allot: 20, available: 8 },
    "Fri 17": { price: 520, allot: 20, available: 2 },
    "Sat 18": { price: 550, allot: 20, available: 0 },
    "Sun 19": { price: 480, allot: 20, available: 5 },
    "Mon 20": { price: 380, allot: 20, available: 18 },
    "Tue 21": { price: 380, allot: 20, available: 20 },
    "Wed 22": { price: 400, allot: 20, available: 15 },
    "Thu 23": { price: 420, allot: 20, available: 11 }
  },
  "Premier Room": {
    "Mon 13": { price: 580, allot: 15, available: 9 },
    "Tue 14": { price: 580, allot: 15, available: 12 },
    "Wed 15": { price: 620, allot: 15, available: 2 },
    "Thu 16": { price: 620, allot: 15, available: 7 },
    "Fri 17": { price: 780, allot: 15, available: 1 },
    "Sat 18": { price: 820, allot: 15, available: 0 },
    "Sun 19": { price: 720, allot: 15, available: 4 },
    "Mon 20": { price: 580, allot: 15, available: 13 },
    "Tue 21": { price: 580, allot: 15, available: 15 },
    "Wed 22": { price: 600, allot: 15, available: 10 },
    "Thu 23": { price: 620, allot: 15, available: 8 }
  },
  "Club Suite": {
    "Mon 13": { price: 1200, allot: 8, available: 5 },
    "Tue 14": { price: 1200, allot: 8, available: 6 },
    "Wed 15": { price: 1380, allot: 8, available: 1 },
    "Thu 16": { price: 1380, allot: 8, available: 3 },
    "Fri 17": { price: 1680, allot: 8, available: 0 },
    "Sat 18": { price: 1800, allot: 8, available: 0 },
    "Sun 19": { price: 1560, allot: 8, available: 2 },
    "Mon 20": { price: 1200, allot: 8, available: 7 },
    "Tue 21": { price: 1200, allot: 8, available: 8 },
    "Wed 22": { price: 1250, allot: 8, available: 5 },
    "Thu 23": { price: 1300, allot: 8, available: 4 }
  }
};
const TICKET_DATA = {
  "Standard Pass": {
    "Mon 13": { price: 28, allot: 500, available: 312 },
    "Wed 15": { price: 28, allot: 500, available: 45 },
    "Fri 17": { price: 32, allot: 500, available: 8 },
    "Sat 18": { price: 35, allot: 500, available: 0 }
  },
  "Premium Pass": {
    "Mon 13": { price: 56, allot: 300, available: 180 },
    "Wed 15": { price: 56, allot: 300, available: 22 },
    "Fri 17": { price: 64, allot: 300, available: 5 },
    "Sat 18": { price: 68, allot: 300, available: 0 }
  }
};
function AvailBadge({ available, allot }) {
  const pct = allot > 0 ? available / allot : 0;
  if (available === 0) return <span className="text-[10px] font-bold text-danger-600 bg-danger-100 px-1.5 py-0.5 rounded">SOLD OUT</span>;
  if (pct < 0.2) return <span className="text-[10px] font-bold text-secondary-600 bg-secondary-100 px-1.5 py-0.5 rounded">{available} left</span>;
  return <span className="text-[10px] font-medium text-text-primary-400">{available}/{allot}</span>;
}
export default function Screen7({ onNavigate }) {
  const [stopSell, setStopSell] = useState({});
  const [editCell, setEditCell] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [activeTab, setActiveTab] = useState("hotel");
  const [showStopSellConfirm, setShowStopSellConfirm] = useState(null);
  const toggleStopSell = (room) => {
    setStopSell((prev) => ({ ...prev, [room]: !prev[room] }));
    setShowStopSellConfirm(null);
  };
  const matrixData = activeTab === "hotel" ? INITIAL_RATES : TICKET_DATA;
  const rooms = Object.keys(matrixData);
  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={7} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {
    /* Topbar */
  }
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">Inventory & Rate Manager</h1>
            <p className="text-xs text-text-primary-400">Oct 13–23, 2026 · Marina Bay Sands</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-sidebar-100 rounded-lg p-1">
              {["hotel", "attractions"].map((t) => <button
    key={t}
    onClick={() => setActiveTab(t)}
    className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${activeTab === t ? "bg-white text-text-primary shadow-sm" : "text-text-primary-500"}`}
  >
                  {t === "hotel" ? "\u{1F3E8} Rooms" : "\u{1F39F} Tickets"}
                </button>)}
            </div>
            <button className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
              <IconCheck size={13} /> Save All Changes
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5">
          {
    /* Overbooking warnings */
  }
          <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
            {[
    { room: "Premier Room", date: "Fri 17", msg: "1 room left \u2014 at risk" },
    { room: "Club Suite", date: "Sat 18", msg: "Sold out \u2014 no rooms available" },
    { room: "Deluxe Room", date: "Fri 17", msg: "2 rooms left \u2014 high demand" }
  ].map((w, i) => <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2 text-xs">
                <IconAlertTriangle size={13} className="text-warning-500" />
                <span className="font-semibold text-warning-700">{w.room} · {w.date}:</span>
                <span className="text-warning-600">{w.msg}</span>
                <button className="text-warning-700 underline font-semibold hover:no-underline" onClick={() => setShowStopSellConfirm(w.room)}>
                  Stop-Sell
                </button>
              </div>)}
          </div>

          {
    /* Matrix table */
  }
          <div className="bg-white rounded-[12px] border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-sidebar-50">
                    <th className="text-left text-[11px] font-semibold text-text-primary-500 uppercase tracking-wide px-5 py-3 w-44 sticky left-0 bg-sidebar-50 z-10">
                      {activeTab === "hotel" ? "Room Type" : "Pass Type"}
                    </th>
                    {DATES.map((d) => <th key={d} className={`text-center text-[11px] font-semibold px-3 py-3 min-w-[90px] ${d.includes("Sat") || d.includes("Sun") ? "text-secondary-500" : "text-text-primary-500 uppercase tracking-wide"}`}>
                        {d}
                        {(d.includes("Sat") || d.includes("Sun")) && <div className="text-[9px] text-secondary-400 font-normal">Weekend</div>}
                      </th>)}
                    <th className="text-center text-[11px] font-semibold text-text-primary-500 uppercase tracking-wide px-4 py-3 sticky right-0 bg-sidebar-50">
                      Stop-Sell
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => <tr key={room} className={`border-b border-border ${stopSell[room] ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3 sticky left-0 bg-white z-10">
                        <div className="font-semibold text-sm text-text-primary">{room}</div>
                        {stopSell[room] && <div className="text-[10px] text-danger-500 font-semibold flex items-center gap-1 mt-0.5">
                            <IconX size={10} /> All channels blocked
                          </div>}
                      </td>
                      {DATES.map((date) => {
    const cell = matrixData[room][date];
    const isEditing = editCell?.room === room && editCell?.date === date;
    if (!cell) return <td key={date} className="px-3 py-3 text-center">
                            <span className="text-xs text-text-primary-300">—</span>
                          </td>;
    const isSoldOut = cell.available === 0;
    const isLow = cell.available > 0 && cell.available / cell.allot < 0.2;
    return <td key={date} className={`px-2 py-2 text-center ${stopSell[room] ? "pointer-events-none" : ""}`}>
                            <div
      className={`rounded-lg p-2 cursor-pointer border transition-all ${isSoldOut ? "bg-danger-50 border-danger-200" : isLow ? "bg-warning-50 border-warning-200" : isEditing ? "bg-primary-50 border-primary-500" : "bg-sidebar-50 border-border hover:border-primary-300"}`}
      onClick={() => {
        setEditCell({ room, date });
        setEditPrice(String(cell.price));
      }}
    >
                              {isEditing ? <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-text-primary-400">$</span>
                                  <input
      value={editPrice}
      onChange={(e) => setEditPrice(e.target.value)}
      onBlur={() => setEditCell(null)}
      onKeyDown={(e) => e.key === "Enter" && setEditCell(null)}
      autoFocus
      className="w-14 text-xs font-bold text-text-primary text-center bg-transparent border-none outline-none"
    />
                                </div> : <div className="font-mono text-xs font-600 text-text-primary">${cell.price}</div>}
                              <AvailBadge available={cell.available} allot={cell.allot} />
                            </div>
                          </td>;
  })}
                      <td className="px-4 py-3 sticky right-0 bg-white text-center">
                        <button
    onClick={() => stopSell[room] ? toggleStopSell(room) : setShowStopSellConfirm(room)}
    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${stopSell[room] ? "bg-success-500 text-white hover:bg-success-600" : "bg-danger-100 text-danger-600 hover:bg-danger-200 border border-danger-200"}`}
  >
                          {stopSell[room] ? "\u2713 Re-open" : "\u26D4 Stop-Sell"}
                        </button>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>

            {
    /* Legend */
  }
            <div className="border-t border-border px-5 py-3 flex items-center gap-6 text-xs text-text-primary-500">
              <span className="font-semibold">Legend:</span>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sidebar-100 border border-border" /> Available</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-warning-100 border border-warning-200" /> Low ({`<`}20%)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-danger-100 border border-danger-200" /> Sold Out</div>
              <div className="ml-2 text-text-primary-400">Click any cell to edit price. Changes auto-sync across all booking channels.</div>
            </div>
          </div>
        </main>
      </div>

      {
    /* Stop-Sell Confirmation Modal */
  }
      {showStopSellConfirm && <div className="fixed inset-0 bg-sidebar/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
                <IconAlertTriangle size={20} className="text-danger-500" />
              </div>
              <div>
                <h3 className="font-heading font-700 text-text-primary text-base">Activate Stop-Sell?</h3>
                <p className="text-xs text-text-primary-500">{showStopSellConfirm}</p>
              </div>
            </div>
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 mb-5 text-sm text-danger-700">
              <strong>This will immediately block</strong> all new bookings for <em>{showStopSellConfirm}</em> across all connected OTA channels (Travelio, Agoda, Booking.com, Expedia). Existing bookings are unaffected.
            </div>
            <div className="flex gap-3">
              <button
    onClick={() => setShowStopSellConfirm(null)}
    className="flex-1 border border-border text-text-primary-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-sidebar-50"
  >
                Cancel
              </button>
              <button
    onClick={() => toggleStopSell(showStopSellConfirm)}
    className="flex-1 bg-danger-500 hover:bg-danger-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
  >
                <IconZap size={14} /> Activate Stop-Sell Now
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
