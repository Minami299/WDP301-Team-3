import { useState, useRef } from "react";
import { Sidebar } from "./Screen6";
import { IconQR, IconCheck, IconX, IconCamera, IconRefreshCw, IconAlertTriangle } from "../components/Icons";
const MOCK_CODES = {
  "QR-MBS-847-GBTB": {
    status: "valid",
    guest: "Wei Chen",
    pass: "Gardens by the Bay \u2013 Premium Pass",
    date: "15 Oct 2026"
  },
  "QR-KYO-201-ARG": {
    status: "already-redeemed",
    guest: "Aiko Tanaka",
    pass: "Arashiyama Bamboo Tour",
    date: "02 Sep 2026"
  },
  "QR-INVALID-000": {
    status: "invalid",
    guest: "Unknown",
    pass: "Unknown",
    date: ""
  },
  "QR-MBS-821-USSG": {
    status: "valid",
    guest: "Rahul Sharma",
    pass: "Universal Studios Singapore",
    date: "17 Oct 2026"
  }
};
const RECENT_SCANS = [
  { code: "QR-MBS-847-VIP", guest: "Marcus Tan", result: "valid", time: "09:41:23", pass: "Gardens by the Bay \u2013 VIP" },
  { code: "QR-MBS-831-STD", guest: "Emma Wilson", result: "already-redeemed", time: "09:38:51", pass: "Gardens by the Bay \u2013 Standard" },
  { code: "QR-MBS-819-PREM", guest: "Sophie Laurent", result: "valid", time: "09:35:07", pass: "Gardens by the Bay \u2013 Premium" },
  { code: "QR-FAKE-001", guest: "Unknown", result: "invalid", time: "09:32:14", pass: "\u2014" },
  { code: "QR-MBS-808-STD", guest: "Liam Park", result: "valid", time: "09:28:43", pass: "Gardens by the Bay \u2013 Standard" }
];
function ScannerViewfinder({ scanning }) {
  return <div className="relative w-72 h-72 mx-auto">
      {
    /* Camera feed simulation */
  }
      <div className="w-full h-full rounded-2xl overflow-hidden bg-sidebar-800 relative">
        <div className={`w-full h-full ${scanning ? "opacity-100" : "opacity-40"} transition-opacity`}>
          {
    /* Fake camera image */
  }
          <div className="w-full h-full bg-gradient-to-br from-dark-700 via-dark-800 to-dark-900 flex items-center justify-center">
            <IconCamera size={48} className="text-text-primary-600" />
          </div>
        </div>

        {
    /* Corner markers */
  }
        {[
    "top-3 left-3 border-t-2 border-l-2",
    "top-3 right-3 border-t-2 border-r-2",
    "bottom-3 left-3 border-b-2 border-l-2",
    "bottom-3 right-3 border-b-2 border-r-2"
  ].map((pos, i) => <div
    key={i}
    className={`absolute w-8 h-8 ${pos} ${scanning ? "border-primary-400" : "border-border"} transition-colors`}
  />)}

        {
    /* Scan line animation */
  }
        {scanning && <div className="absolute inset-x-3 h-0.5 bg-primary-400 opacity-80 animate-bounce" style={{ top: "50%" }} />}

        {
    /* Target center */
  }
        <div className={`absolute inset-16 border ${scanning ? "border-primary-400/40" : "border-border"} rounded-lg`} />
      </div>

      {scanning && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-primary-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Scanning...
          </div>
        </div>}
    </div>;
}
function ResultDisplay({ result, data }) {
  if (!result) return null;
  const config = {
    valid: {
      bg: "bg-success-500",
      icon: <IconCheck size={40} className="text-white" />,
      title: "VALID PASS",
      sub: "Grant Entry",
      textColor: "text-white"
    },
    "already-redeemed": {
      bg: "bg-warning-500",
      icon: <IconAlertTriangle size={40} className="text-white" />,
      title: "ALREADY REDEEMED",
      sub: "Deny Entry",
      textColor: "text-white"
    },
    invalid: {
      bg: "bg-danger-500",
      icon: <IconX size={40} className="text-white" />,
      title: "INVALID PASS",
      sub: "Deny Entry \u2014 Contact Supervisor",
      textColor: "text-white"
    },
    expired: {
      bg: "bg-danger-500",
      icon: <IconX size={40} className="text-white" />,
      title: "EXPIRED PASS",
      sub: "Deny Entry",
      textColor: "text-white"
    }
  };
  const c = config[result];
  return <div className={`${c.bg} rounded-2xl p-6 text-center mt-4 animate-in fade-in duration-300`}>
      <div className="flex justify-center mb-3">{c.icon}</div>
      <div className={`font-heading font-800 text-2xl ${c.textColor} mb-1`}>{c.title}</div>
      <div className={`${c.textColor} opacity-90 text-sm font-semibold mb-4`}>{c.sub}</div>
      {data && result !== "invalid" && <div className="bg-white/20 rounded-xl p-3 text-left space-y-1">
          <div className="text-white text-sm"><span className="opacity-70">Guest:</span> <span className="font-semibold">{data.guest}</span></div>
          <div className="text-white text-sm"><span className="opacity-70">Pass:</span> <span className="font-semibold">{data.pass}</span></div>
          <div className="text-white text-sm"><span className="opacity-70">Valid Date:</span> <span className="font-semibold">{data.date}</span></div>
        </div>}
    </div>;
}
export default function Screen8({ onNavigate }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanData, setScanData] = useState();
  const [autoDemo, setAutoDemo] = useState(false);
  const timerRef = useRef(null);
  const lookup = (code) => {
    const found = MOCK_CODES[code.trim().toUpperCase()];
    if (found) {
      setScanResult(found.status);
      setScanData({ guest: found.guest, pass: found.pass, date: found.date });
    } else {
      setScanResult("invalid");
      setScanData(void 0);
    }
  };
  const startScan = () => {
    setScanning(true);
    setScanResult(null);
    timerRef.current = setTimeout(() => {
      setScanning(false);
      lookup("QR-MBS-847-GBTB");
    }, 2200);
  };
  const reset = () => {
    setScanResult(null);
    setScanData(void 0);
    setManualCode("");
    setScanning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const handleManual = () => {
    if (!manualCode.trim()) return;
    lookup(manualCode);
  };
  return <div className="flex h-screen bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={8} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {
    /* Topbar */
  }
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">QR Gate Redemption Terminal</h1>
            <p className="text-xs text-text-primary-400">Gardens by the Bay – Flower Dome · Operator: Gate 3</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-success-50 border border-success-200 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs font-semibold text-success-700">System Online</span>
            </div>
            <div className="text-xs text-text-primary-500 font-mono">09:42:17</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {
    /* Scanner panel */
  }
            <div className="flex-1 flex flex-col p-6 items-center justify-start max-w-lg">
              <div className="w-full">
                <h2 className="font-heading font-700 text-text-primary text-lg mb-6 text-center">Scan or Enter Pass</h2>

                <ScannerViewfinder scanning={scanning} />

                {scanResult && <ResultDisplay result={scanResult} data={scanData} />}

                <div className="flex gap-3 mt-6">
                  {!scanResult ? <button
    onClick={startScan}
    disabled={scanning}
    className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-heading font-700 py-3.5 rounded-xl flex items-center justify-center gap-2"
  >
                      <IconCamera size={18} />
                      {scanning ? "Scanning\u2026" : "Start Camera Scan"}
                    </button> : <button
    onClick={reset}
    className="flex-1 bg-sidebar-700 hover:bg-sidebar-600 text-white font-heading font-700 py-3.5 rounded-xl flex items-center justify-center gap-2"
  >
                      <IconRefreshCw size={16} />
                      Scan Next Pass
                    </button>}
                </div>

                {
    /* Divider */
  }
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-text-primary-400 font-semibold uppercase">OR ENTER MANUALLY</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {
    /* Manual entry */
  }
                <div className="flex gap-2">
                  <input
    value={manualCode}
    onChange={(e) => setManualCode(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleManual()}
    placeholder="QR-MBS-XXX-XXXX"
    className="flex-1 border-2 border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 uppercase"
  />
                  <button
    onClick={handleManual}
    className="bg-sidebar-800 hover:bg-sidebar text-white font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-1.5"
  >
                    <IconQR size={15} /> Verify
                  </button>
                </div>

                {
    /* Demo codes */
  }
                <div className="mt-4 bg-sidebar-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-wide mb-2">Try these demo codes:</p>
                  <div className="space-y-1">
                    {Object.entries(MOCK_CODES).map(([code, d]) => <button
    key={code}
    onClick={() => {
      setManualCode(code);
      lookup(code);
    }}
    className={`w-full text-left text-xs font-mono px-2.5 py-1.5 rounded-lg hover:bg-sidebar-100 flex items-center justify-between ${d.status === "valid" ? "text-success-600" : d.status === "already-redeemed" ? "text-warning-600" : "text-danger-500"}`}
  >
                        {code}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.status === "valid" ? "bg-success-100" : d.status === "already-redeemed" ? "bg-warning-100" : "bg-danger-100"}`}>
                          {d.status === "already-redeemed" ? "Redeemed" : d.status}
                        </span>
                      </button>)}
                  </div>
                </div>
              </div>
            </div>

            {
    /* Divider */
  }
            <div className="border-l border-border" />

            {
    /* Recent scans */
  }
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-700 text-text-primary text-base">Recent Scans</h2>
                <div className="text-xs text-text-primary-400 font-mono">Live · refreshing</div>
              </div>

              {
    /* Stats bar */
  }
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
    { label: "Valid Today", value: "1,241", color: "emerald" },
    { label: "Already Used", value: "6", color: "amber" },
    { label: "Invalid", value: "2", color: "red" }
  ].map((s) => <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-3 text-center`}>
                    <div className={`font-heading font-800 text-xl text-${s.color}-600`}>{s.value}</div>
                    <div className={`text-xs text-${s.color}-500 font-medium`}>{s.label}</div>
                  </div>)}
              </div>

              {
    /* Scan log */
  }
              <div className="space-y-2">
                {RECENT_SCANS.map((scan, i) => <div
    key={i}
    className={`flex items-center gap-3 p-3 rounded-xl border ${scan.result === "valid" ? "bg-success-50 border-success-200" : scan.result === "already-redeemed" ? "bg-warning-50 border-warning-200" : "bg-danger-50 border-danger-200"}`}
  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${scan.result === "valid" ? "bg-success-500" : scan.result === "already-redeemed" ? "bg-warning-500" : "bg-danger-500"}`}>
                      {scan.result === "valid" ? <IconCheck size={14} className="text-white" /> : scan.result === "already-redeemed" ? <IconAlertTriangle size={14} className="text-white" /> : <IconX size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-text-primary truncate">{scan.guest}</div>
                      <div className="text-xs text-text-primary-500 truncate">{scan.pass}</div>
                      <div className="font-mono text-[10px] text-text-primary-400">{scan.code}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs text-text-primary-500">{scan.time}</div>
                      <div className={`text-[10px] font-bold ${scan.result === "valid" ? "text-success-600" : scan.result === "already-redeemed" ? "text-warning-600" : "text-danger-500"}`}>
                        {scan.result === "valid" ? "GRANTED" : scan.result === "already-redeemed" ? "DENIED (USED)" : "DENIED (INVALID)"}
                      </div>
                    </div>
                  </div>)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>;
}
