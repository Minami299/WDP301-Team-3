import { useState } from "react";
import { IconCheck, IconCreditCard, IconSmartphone, IconShield, IconQR, IconDownload, IconArrowRight, IconUser } from "../components/Icons";
const ORDER_SUMMARY = {
  hotel: "Premier Room, Marina Bay Sands",
  checkIn: "15 Oct 2026",
  checkOut: "18 Oct 2026",
  nights: 3,
  guests: 2,
  experience: "Premium QR Pass \u2013 Gardens by the Bay",
  roomRate: 608,
  totalRoom: 1824,
  ticketRate: 56,
  totalTickets: 112,
  subtotal: 1936,
  tax: 175,
  total: 2111,
  saved: 374
};
function QRCodeVisual() {
  const cells = Array.from(
    { length: 21 },
    (_, row) => Array.from({ length: 21 }, (_2, col) => {
      if (row < 7 && col < 7 || row < 7 && col > 13 || row > 13 && col < 7) return true;
      return Math.random() > 0.5;
    })
  );
  return <div className="inline-grid gap-[1px] p-3 bg-white rounded-xl border-2 border-border">
      {cells.map((row, r) => <div key={r} className="flex gap-[1px]">
          {row.map((cell, c) => <div key={c} className={`w-2 h-2 rounded-[1px] ${cell ? "bg-sidebar" : "bg-white"}`} />)}
        </div>)}
    </div>;
}
export default function Screen4({ onNavigate }) {
  const [step, setStep] = useState("details");
  const [createAccount, setCreateAccount] = useState(false);
  const [payMethod, setPayMethod] = useState("card");
  const [agreed, setAgreed] = useState(false);
  if (step === "confirmation") {
    return <div className="min-h-screen bg-bg-default font-body flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {
      /* Success banner */
    }
          <div className="bg-success-500 rounded-t-2xl px-8 py-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconCheck size={28} className="text-white" />
            </div>
            <h1 className="font-heading font-800 text-white text-2xl mb-1">Booking Confirmed!</h1>
            <p className="text-white/80 text-sm">Your QR passes have been sent to wei.chen@email.com</p>
          </div>

          {
      /* Confirmation card */
    }
          <div className="bg-white rounded-b-2xl border border-border shadow-xl overflow-hidden">
            {
      /* Ref */
    }
            <div className="px-8 py-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-text-primary-400 uppercase tracking-wide mb-1">Booking Reference</div>
                <div className="font-mono font-500 text-2xl text-text-primary tracking-widest">TVL-2026-MBS847</div>
              </div>
              <button
      onClick={() => onNavigate?.(5)}
      className="bg-primary-50 hover:bg-primary-100 text-primary-600 font-semibold text-sm px-4 py-2 rounded-lg flex items-center gap-2"
    >
                View My Trips <IconArrowRight size={14} />
              </button>
            </div>

            <div className="px-8 py-6 grid grid-cols-2 gap-8">
              {
      /* Details */
    }
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-text-primary-400 uppercase tracking-wide mb-2">Stay</div>
                  <div className="font-semibold text-text-primary text-sm">Marina Bay Sands Hotel</div>
                  <div className="text-sm text-text-primary-600">Premier Room · {ORDER_SUMMARY.nights} nights</div>
                  <div className="text-sm text-text-primary-500">{ORDER_SUMMARY.checkIn} → {ORDER_SUMMARY.checkOut}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary-400 uppercase tracking-wide mb-2">Experience</div>
                  <div className="text-sm font-semibold text-text-primary">Gardens by the Bay</div>
                  <div className="text-sm text-text-primary-500">Premium QR Pass · 2 guests</div>
                  <div className="inline-flex items-center gap-1 bg-success-100 text-success-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                    <IconQR size={10} /> QR Pass Issued
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary-400 uppercase tracking-wide mb-2">Order Total</div>
                  <div className="font-heading font-700 text-primary-500 text-2xl">SGD {ORDER_SUMMARY.total.toLocaleString()}</div>
                  <div className="text-xs text-success-600 font-medium mt-0.5">You saved SGD {ORDER_SUMMARY.saved}!</div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 border border-border rounded-lg py-2 text-xs font-semibold text-text-primary-700 flex items-center justify-center gap-1.5 hover:bg-sidebar-50">
                    <IconDownload size={13} /> Download Invoice
                  </button>
                  <button className="flex-1 border border-border rounded-lg py-2 text-xs font-semibold text-text-primary-700 flex items-center justify-center gap-1.5 hover:bg-sidebar-50">
                    <IconDownload size={13} /> QR Pass PDF
                  </button>
                </div>
              </div>

              {
      /* QR Code */
    }
              <div className="flex flex-col items-center">
                <div className="text-xs font-semibold text-text-primary-400 uppercase tracking-wide mb-3 self-start">Dynamic Entry QR Pass</div>
                <QRCodeVisual />
                <div className="mt-3 text-center">
                  <div className="font-mono text-sm font-500 text-text-primary tracking-widest">QR-MBS-847-VIP</div>
                  <div className="text-xs text-text-primary-400 mt-1">Valid for Gardens by the Bay · 15–18 Oct 2026</div>
                  <div className="mt-2 flex items-center gap-1.5 justify-center">
                    <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                    <span className="text-xs font-semibold text-success-600">Active · Not yet redeemed</span>
                  </div>
                </div>
                <div className="mt-4 bg-primary-50 border border-primary-200 rounded-xl p-3 text-xs text-primary-700 text-center">
                  🔒 QR refreshes every 30 seconds for security.<br />Present at the attraction gate for scanning.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-bg-default font-body">
      {
    /* Progress bar */
  }
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="font-heading font-800 text-text-primary text-base">travelio</span>
            <div className="flex-1 flex items-center gap-2">
              {["details", "payment", "confirmation"].map((s, i) => <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-12 ${step === "payment" && i === 2 ? "bg-sidebar-200" : i <= ["details", "payment", "confirmation"].indexOf(step) ? "bg-primary-500" : "bg-sidebar-200"}`} />}
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${step === s ? "text-primary-500" : i < ["details", "payment", "confirmation"].indexOf(step) ? "text-success-600" : "text-text-primary-400"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-primary-500 text-white" : i < ["details", "payment", "confirmation"].indexOf(step) ? "bg-success-500 text-white" : "bg-sidebar-200 text-text-primary-500"}`}>
                      {i < ["details", "payment", "confirmation"].indexOf(step) ? "\u2713" : i + 1}
                    </div>
                    <span className="capitalize">{s}</span>
                  </div>
                </div>)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-primary-500">
              <IconShield size={14} className="text-success-500" /> Secure checkout
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="flex gap-8">
          {
    /* Form */
  }
          <div className="flex-1">
            {step === "details" && <div className="space-y-5">
                <h1 className="font-heading font-800 text-2xl text-text-primary">Guest Details</h1>

                <div className="bg-white rounded-[12px] border border-border p-6">
                  <h2 className="font-heading font-700 text-base text-text-primary mb-4 flex items-center gap-2">
                    <IconUser size={16} className="text-primary-500" /> Primary Guest
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">First Name *</label>
                      <input defaultValue="Wei" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Last Name *</label>
                      <input defaultValue="Chen" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Email *</label>
                      <input type="email" defaultValue="wei.chen@email.com" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Phone *</label>
                      <div className="flex">
                        <span className="border border-r-0 border-border rounded-l-lg px-3 py-2.5 text-sm bg-sidebar-50 text-text-primary-600">+65</span>
                        <input defaultValue="9123 4567" className="flex-1 border border-border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Nationality</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500">
                        <option>Singapore</option>
                        <option>Malaysia</option>
                        <option>China</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Special Requests</label>
                      <input placeholder="Early check-in, high floor…" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
                    </div>
                  </div>

                  {
    /* Account creation toggle */
  }
                  <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-primary-800">Save your details for faster checkout</div>
                      <div className="text-xs text-primary-600 mt-0.5">Create a free Travelio account to access your QR passes anytime</div>
                    </div>
                    <button
    onClick={() => setCreateAccount(!createAccount)}
    className={`w-12 h-6 rounded-full transition-colors ${createAccount ? "bg-primary-500" : "bg-sidebar-300"} relative`}
  >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${createAccount ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {createAccount && <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Password</label>
                        <input type="password" placeholder="Min. 8 characters" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Confirm Password</label>
                        <input type="password" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>}
                </div>

                <button
    onClick={() => setStep("payment")}
    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-heading font-700 py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
  >
                  Continue to Payment <IconArrowRight size={16} />
                </button>
              </div>}

            {step === "payment" && <div className="space-y-5">
                <h1 className="font-heading font-800 text-2xl text-text-primary">Payment</h1>

                {
    /* Payment methods */
  }
                <div className="bg-white rounded-[12px] border border-border p-6">
                  <h2 className="font-heading font-700 text-base text-text-primary mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    {[
    { id: "card", icon: <IconCreditCard size={18} />, label: "Credit / Debit Card", sub: "Visa, Mastercard, Amex" },
    { id: "paynow", icon: <IconSmartphone size={18} />, label: "PayNow / Instant Bank Transfer", sub: "Singapore only" },
    { id: "ewallet", icon: "\u{1F4B3}", label: "E-Wallet", sub: "GrabPay, GoPay, TrueMoney" }
  ].map((m) => <label
    key={m.id}
    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${payMethod === m.id ? "border-primary-500 bg-primary-50" : "border-border hover:border-primary-300"}`}
    onClick={() => setPayMethod(m.id)}
  >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === m.id ? "border-primary-500" : "border-border"}`}>
                          {payMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                        </div>
                        <span className="text-xl">{typeof m.icon === "string" ? m.icon : m.icon}</span>
                        <div>
                          <div className="font-semibold text-sm text-text-primary">{m.label}</div>
                          <div className="text-xs text-text-primary-400">{m.sub}</div>
                        </div>
                      </label>)}
                  </div>

                  {payMethod === "card" && <div className="mt-5 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Card Number</label>
                        <input defaultValue="4242 4242 4242 4242" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Expiry Date</label>
                          <input defaultValue="12/28" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">CVV</label>
                          <input defaultValue="•••" type="password" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-primary-600 uppercase tracking-wide mb-1.5">Name on Card</label>
                        <input defaultValue="Wei Chen" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <div
    onClick={() => setAgreed(!agreed)}
    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${agreed ? "bg-primary-500 border-primary-500" : "border-border"}`}
  >
                    {agreed && <IconCheck size={10} className="text-white" />}
                  </div>
                  <span className="text-sm text-text-primary-600">I agree to the <a href="#" className="text-primary-500 underline">Terms & Conditions</a> and <a href="#" className="text-primary-500 underline">Cancellation Policy</a></span>
                </label>

                <button
    onClick={() => setStep("confirmation")}
    disabled={!agreed}
    className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-700 py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
  >
                  Pay SGD {ORDER_SUMMARY.total.toLocaleString()} Securely <IconShield size={16} />
                </button>
              </div>}
          </div>

          {
    /* Order Summary */
  }
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-[12px] border border-border overflow-hidden">
              <div className="px-5 py-4 bg-sidebar-800">
                <h3 className="font-heading font-700 text-white text-sm">Order Summary</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
    src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=150&fit=crop&auto=format"
    alt="Marina Bay Sands"
    className="w-full h-28 object-cover"
  />
                  <div className="p-3">
                    <div className="font-semibold text-sm text-text-primary">Marina Bay Sands Hotel</div>
                    <div className="text-xs text-text-primary-500 mt-0.5">Premier Room · {ORDER_SUMMARY.checkIn} – {ORDER_SUMMARY.checkOut}</div>
                  </div>
                </div>

                <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-success-700 text-xs font-semibold mb-0.5">
                    <IconQR size={12} /> QR Pass Included
                  </div>
                  <div className="text-xs text-success-600">{ORDER_SUMMARY.experience}</div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-primary-600">
                    <span>Room × {ORDER_SUMMARY.nights} nights</span>
                    <span>SGD {ORDER_SUMMARY.totalRoom.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-text-primary-600">
                    <span>Experience passes × 2</span>
                    <span>SGD {ORDER_SUMMARY.totalTickets}</span>
                  </div>
                  <div className="flex justify-between text-success-600 font-medium">
                    <span>Bundle discount</span>
                    <span>−SGD {ORDER_SUMMARY.saved}</span>
                  </div>
                  <div className="flex justify-between text-text-primary-600">
                    <span>Taxes & fees</span>
                    <span>SGD {ORDER_SUMMARY.tax}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-heading font-700 text-text-primary text-base">
                    <span>Total</span>
                    <span className="text-primary-500">SGD {ORDER_SUMMARY.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-text-primary-400">
                  <IconShield size={12} className="text-success-500" />
                  256-bit SSL encrypted payment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
