import { useState } from "react";
import { IconQR, IconDownload, IconCalendar, IconX, IconCheck, IconTicket, IconHotel } from "../components/Icons";
const TRIPS = [
  {
    id: "TVL-2026-MBS847",
    status: "upcoming",
    type: "bundle",
    destination: "Singapore",
    hotel: {
      name: "Marina Bay Sands Hotel",
      room: "Premier Room",
      checkIn: "Thu, 15 Oct 2026",
      checkOut: "Sun, 18 Oct 2026",
      nights: 3,
      img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=250&fit=crop&auto=format"
    },
    activities: [
      {
        name: "Gardens by the Bay \u2013 Premium Pass",
        date: "16 Oct 2026",
        qrCode: "QR-MBS-847-GBTB",
        redeemed: false
      }
    ],
    total: 2111,
    countdown: { days: 16, hours: 8, mins: 44 }
  },
  {
    id: "TVL-2026-KYO201",
    status: "completed",
    type: "hotel",
    destination: "Kyoto, Japan",
    hotel: {
      name: "Hoshinoya Kyoto",
      room: "Deluxe Riverside Room",
      checkIn: "Mon, 01 Sep 2026",
      checkOut: "Thu, 04 Sep 2026",
      nights: 3,
      img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=250&fit=crop&auto=format"
    },
    activities: [
      { name: "Arashiyama Bamboo Grove Tour", date: "02 Sep 2026", qrCode: "QR-KYO-201-ARG", redeemed: true },
      { name: "Fushimi Inari Night Hike", date: "03 Sep 2026", qrCode: "QR-KYO-201-FIN", redeemed: true }
    ],
    total: 1640,
    countdown: null
  }
];
function Countdown({ days, hours, mins }) {
  return <div className="flex items-center gap-2">
      {[{ val: days, label: "Days" }, { val: hours, label: "Hrs" }, { val: mins, label: "Min" }].map(({ val, label }) => <div key={label} className="text-center">
          <div className="bg-primary-500 text-white font-heading font-700 text-xl w-12 h-12 rounded-lg flex items-center justify-center font-mono">
            {String(val).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-text-primary-400 mt-0.5 uppercase tracking-wide">{label}</div>
        </div>)}
    </div>;
}
function QRPass({ code, redeemed }) {
  return <div className={`rounded-2xl border-2 ${redeemed ? "border-border opacity-60" : "border-primary-500"} p-5 flex flex-col items-center gap-3`}>
      <div className={`text-xs font-semibold uppercase tracking-widest ${redeemed ? "text-text-primary-400" : "text-primary-500"}`}>
        {redeemed ? "Redeemed" : "Entry Pass"}
      </div>
      <div className="inline-grid gap-[1.5px] bg-white">
        {Array.from({ length: 15 }, (_, r) => <div key={r} className="flex gap-[1.5px]">
            {Array.from({ length: 15 }, (_2, c) => {
    const isCorner = r < 4 && c < 4 || r < 4 && c > 10 || r > 10 && c < 4;
    const isActive = isCorner || Math.sin(r * 3.7 + c * 1.9) > 0.1;
    return <div key={c} className={`w-2.5 h-2.5 rounded-[1px] ${isActive ? redeemed ? "bg-sidebar-400" : "bg-sidebar" : "bg-white"}`} />;
  })}
          </div>)}
      </div>
      <div className={`font-mono text-xs font-500 tracking-widest ${redeemed ? "text-text-primary-400" : "text-text-primary"}`}>{code}</div>
      {redeemed && <div className="flex items-center gap-1.5 bg-sidebar-100 text-text-primary-500 text-xs font-semibold px-3 py-1 rounded-full">
          <IconCheck size={11} /> Redeemed
        </div>}
      {!redeemed && <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-xs text-success-600 font-semibold">Active</span>
        </div>}
    </div>;
}
export default function Screen5({ onNavigate }) {
  const [activeTrip, setActiveTrip] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const filteredTrips = TRIPS.filter((t) => filter === "all" || t.status === filter);
  const activeDetails = TRIPS.find((t) => t.id === (activeTrip ?? TRIPS[0].id));
  return <div className="min-h-screen bg-bg-default font-body">
      {
    /* Navbar */
  }
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-heading font-800 text-text-primary text-base">travelio</span>
            <span className="text-text-primary-400">›</span>
            <span className="text-sm font-semibold text-text-primary">My Trips</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">WC</div>
            <span className="text-sm font-medium text-text-primary">Wei Chen</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-heading font-800 text-3xl text-text-primary mb-1">My Trips</h1>
            <p className="text-text-primary-500 text-sm">{TRIPS.length} trips · {TRIPS.filter((t) => t.status === "upcoming").length} upcoming</p>
          </div>
          <div className="flex gap-1 bg-sidebar-100 rounded-xl p-1">
            {["all", "upcoming", "completed"].map((f) => <button
    key={f}
    onClick={() => setFilter(f)}
    className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? "bg-white text-text-primary shadow-sm" : "text-text-primary-500 hover:text-text-primary"}`}
  >
                {f}
              </button>)}
          </div>
        </div>

        <div className="flex gap-6">
          {
    /* Trip list */
  }
          <div className="w-80 flex-shrink-0 space-y-3">
            {filteredTrips.map((trip) => <div
    key={trip.id}
    className={`bg-white rounded-[12px] border-2 cursor-pointer transition-all overflow-hidden ${(activeTrip ?? TRIPS[0].id) === trip.id ? "border-primary-500 shadow-md" : "border-border hover:border-primary-300"}`}
    onClick={() => setActiveTrip(trip.id)}
  >
                <div className="relative h-28 overflow-hidden bg-sidebar-200">
                  <img src={trip.hotel.img} alt={trip.destination} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark/60 to-transparent" />
                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.status === "upcoming" ? "bg-success-500 text-white" : "bg-sidebar-600 text-white"}`}>
                    {trip.status === "upcoming" ? "\u2708 Upcoming" : "\u2713 Completed"}
                  </div>
                  <div className="absolute bottom-2 left-3 text-white font-heading font-700 text-sm">{trip.destination}</div>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-sm text-text-primary mb-0.5">{trip.hotel.name}</div>
                  <div className="text-xs text-text-primary-500 flex items-center gap-1">
                    <IconCalendar size={11} /> {trip.hotel.checkIn}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-[11px] text-text-primary-400">{trip.id}</span>
                    <span className="font-heading font-700 text-primary-500 text-sm">SGD {trip.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>)}
          </div>

          {
    /* Trip detail */
  }
          {activeDetails && <div className="flex-1 space-y-5">
              {
    /* Countdown for upcoming */
  }
              {activeDetails.status === "upcoming" && activeDetails.countdown && <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-[12px] p-6 flex items-center justify-between">
                  <div>
                    <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Check-in countdown</div>
                    <h2 className="font-heading font-700 text-white text-xl">{activeDetails.destination} 🌴</h2>
                    <div className="text-white/80 text-sm mt-0.5">{activeDetails.hotel.checkIn}</div>
                  </div>
                  <Countdown {...activeDetails.countdown} />
                </div>}

              {
    /* Hotel card */
  }
              <div className="bg-white rounded-[12px] border border-border overflow-hidden">
                <div className="flex">
                  <div className="w-40 h-36 flex-shrink-0 overflow-hidden bg-sidebar-200">
                    <img src={activeDetails.hotel.img} alt={activeDetails.hotel.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-primary-500 font-semibold mb-1">
                          <IconHotel size={12} /> Stay
                        </div>
                        <h3 className="font-heading font-700 text-text-primary text-lg">{activeDetails.hotel.name}</h3>
                        <div className="text-sm text-text-primary-500 mt-0.5">{activeDetails.hotel.room}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 text-xs text-text-primary-600 hover:text-text-primary border border-border rounded-lg px-3 py-1.5">
                          <IconDownload size={12} /> Invoice
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-xs text-text-primary-400">Check-in</div>
                        <div className="font-semibold text-text-primary">{activeDetails.hotel.checkIn}</div>
                      </div>
                      <div className="border-l border-border pl-4">
                        <div className="text-xs text-text-primary-400">Check-out</div>
                        <div className="font-semibold text-text-primary">{activeDetails.hotel.checkOut}</div>
                      </div>
                      <div className="border-l border-border pl-4">
                        <div className="text-xs text-text-primary-400">Duration</div>
                        <div className="font-semibold text-text-primary">{activeDetails.hotel.nights} nights</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {
    /* Activity QR passes */
  }
              <div className="bg-white rounded-[12px] border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IconTicket size={16} className="text-secondary-500" />
                    <h3 className="font-heading font-700 text-text-primary text-base">Experience QR Passes</h3>
                  </div>
                  <button className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1">
                    <IconDownload size={12} /> Download all passes
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {activeDetails.activities.map((act) => <div key={act.qrCode} className={`border rounded-xl p-4 ${act.redeemed ? "border-border bg-sidebar-50" : "border-success-200 bg-success-50"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-sm text-text-primary leading-snug">{act.name}</div>
                          <div className="text-xs text-text-primary-400 mt-0.5 flex items-center gap-1">
                            <IconCalendar size={11} /> {act.date}
                          </div>
                        </div>
                        {act.redeemed ? <span className="bg-sidebar-200 text-text-primary-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Redeemed</span> : <span className="bg-success-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>}
                      </div>
                      <button
    onClick={() => setQrModal({ actName: act.name, code: act.qrCode, redeemed: act.redeemed })}
    className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${act.redeemed ? "bg-sidebar-200 text-text-primary-500 hover:bg-sidebar-300" : "bg-success-500 hover:bg-success-600 text-white"}`}
  >
                        <IconQR size={12} /> {act.redeemed ? "View QR (used)" : "Show QR Pass"}
                      </button>
                    </div>)}
                </div>
              </div>

              {
    /* Financial summary */
  }
              <div className="bg-white rounded-[12px] border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-700 text-text-primary text-base">Booking Summary</h3>
                  <button className="flex items-center gap-1.5 text-sm text-primary-500 font-semibold hover:underline">
                    <IconDownload size={14} /> Tax Invoice (PDF)
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-primary-600">
                    <span>Room charges</span>
                    <span>SGD 1,824</span>
                  </div>
                  <div className="flex justify-between text-text-primary-600">
                    <span>Experience passes</span>
                    <span>SGD 112</span>
                  </div>
                  <div className="flex justify-between text-success-600">
                    <span>Bundle savings</span>
                    <span>−SGD 374</span>
                  </div>
                  <div className="flex justify-between text-text-primary-600">
                    <span>GST & Tourism Levy</span>
                    <span>SGD 175</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-heading font-700 text-text-primary">
                    <span>Total Paid</span>
                    <span className="text-primary-500">SGD {activeDetails.total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-text-primary-400 font-mono">Ref: {activeDetails.id} · Paid via Visa ····4242</div>
              </div>
            </div>}
        </div>
      </div>

      {
    /* QR Modal */
  }
      {qrModal && <div className="fixed inset-0 bg-sidebar/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`px-6 py-4 flex items-center justify-between ${qrModal.redeemed ? "bg-sidebar-700" : "bg-primary-500"}`}>
              <div>
                <div className={`text-xs font-semibold uppercase tracking-widest ${qrModal.redeemed ? "text-text-primary-400" : "text-white/70"}`}>
                  Travelio QR Gate Pass
                </div>
                <div className={`font-heading font-700 text-base mt-0.5 ${qrModal.redeemed ? "text-white" : "text-white"}`}>
                  {qrModal.actName}
                </div>
              </div>
              <button onClick={() => setQrModal(null)} className="text-white/80 hover:text-white">
                <IconX size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <QRPass code={qrModal.code} redeemed={qrModal.redeemed} />
              <div className="mt-4 flex gap-2 w-full">
                <button className="flex-1 border border-border py-2 rounded-lg text-sm font-semibold text-text-primary-700 flex items-center justify-center gap-1.5 hover:bg-sidebar-50">
                  <IconDownload size={14} /> Save
                </button>
                <button onClick={() => setQrModal(null)} className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg text-sm font-semibold">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>}
    </div>;
}
