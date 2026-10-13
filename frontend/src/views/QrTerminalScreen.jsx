import { useState } from "react";
import { Sidebar } from "./VendorDashboardScreen";
import { IconQR, IconCheck, IconX, IconRefreshCw, IconAlertTriangle } from "../components/Icons";
import useQrScans from "../hooks/useQrScans";
import { qrApi } from "../services/api/qrApi";
function ResultDisplay({ result, data }) {
  if (!result) return null;
  const config = {
    VALID: {
      bg: "bg-success-500",
      icon: <IconCheck size={40} className="text-white" />,
      title: "VALID PASS",
      sub: "Grant Entry",
      textColor: "text-white"
    },
    ALREADY_REDEEMED: {
      bg: "bg-warning-500",
      icon: <IconAlertTriangle size={40} className="text-white" />,
      title: "ALREADY REDEEMED",
      sub: "Deny Entry",
      textColor: "text-white"
    },
    INVALID: {
      bg: "bg-danger-500",
      icon: <IconX size={40} className="text-white" />,
      title: "INVALID PASS",
      sub: "Deny Entry \u2014 Contact Supervisor",
      textColor: "text-white"
    },
    NOT_YOURS: {
      bg: "bg-danger-500",
      icon: <IconX size={40} className="text-white" />,
      title: "NOT YOUR FACILITY",
      sub: "Deny Entry",
      textColor: "text-white"
    }
  };
  const c = config[result] || config.INVALID;
  return <div className={`${c.bg} rounded-2xl p-6 text-center mt-4 animate-in fade-in duration-300`}>
      <div className="flex justify-center mb-3">{c.icon}</div>
      <div className={`font-heading font-800 text-2xl ${c.textColor} mb-1`}>{c.title}</div>
      <div className={`${c.textColor} opacity-90 text-sm font-semibold mb-4`}>{c.sub}</div>
        {data && result !== "INVALID" && <div className="bg-white/20 rounded-xl p-3 text-left space-y-1">
          <div className="text-white text-sm"><span className="opacity-70">Guest:</span> <span className="font-semibold">{data.guest_name || "Unknown guest"}</span></div>
          <div className="text-white text-sm"><span className="opacity-70">Service:</span> <span className="font-semibold">{data.service_name || "Unknown service"}</span></div>
          <div className="text-white text-sm"><span className="opacity-70">Booking:</span> <span className="font-semibold">{data.booking_code || "Unknown booking"}</span></div>
        </div>}
    </div>;
}
export default function Screen8({ onNavigate }) {
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const { report, loading, error, refresh } = useQrScans();
  const reset = () => {
    setScanResult(null);
    setScanData(null);
    setManualCode("");
    setRequestError("");
  };
  const handleManual = async () => {
    if (!manualCode.trim()) return;
    setSubmitting(true);
    setRequestError("");
    try {
      const response = await qrApi.verify(manualCode.trim());
      setScanResult(response.data.result);
      setScanData(response.data);
      refresh();
    } catch (requestFailure) {
      setRequestError(requestFailure.message);
    } finally {
      setSubmitting(false);
    }
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
            <p className="text-xs text-text-primary-400">Manual verification · QR passes validated by Travelio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-success-50 border border-success-200 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs font-semibold text-success-700">API verification</span>
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
                <h2 className="font-heading font-700 text-text-primary text-lg mb-5 text-center">Verify a QR pass</h2>
                <div className="flex gap-2">
                  <input
    value={manualCode}
    onChange={(e) => setManualCode(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleManual()}
    placeholder="Enter QR code"
    className="flex-1 border-2 border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 uppercase"
  />
                  <button
    onClick={handleManual}
    disabled={submitting || !manualCode.trim()}
    className="bg-sidebar-800 hover:bg-sidebar disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-1.5"
  >
                    <IconQR size={15} /> {submitting ? "Verifying…" : "Verify"}
                  </button>
                </div>
                {requestError && <p className="mt-3 text-sm text-danger-600">{requestError}</p>}
                {scanResult && <ResultDisplay result={scanResult} data={scanData} />}
                {scanResult && <button onClick={reset} className="mt-3 w-full border border-border hover:bg-sidebar-50 text-text-primary-700 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"><IconRefreshCw size={15} /> Verify next pass</button>}
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
                <button onClick={refresh} className="text-xs text-primary-600 font-semibold">Refresh</button>
              </div>

              {
    /* Stats bar */
  }
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
    { label: "Valid", value: report?.stats?.valid || 0, color: "emerald" },
    { label: "Already Used", value: report?.stats?.already_redeemed || 0, color: "amber" },
    { label: "Rejected", value: report?.stats?.invalid || 0, color: "red" }
  ].map((s) => <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-3 text-center`}>
                    <div className={`font-heading font-800 text-xl text-${s.color}-600`}>{loading ? "…" : s.value.toLocaleString("vi-VN")}</div>
                    <div className={`text-xs text-${s.color}-500 font-medium`}>{s.label}</div>
                  </div>)}
              </div>

              {
    /* Scan log */
  }
              <div className="space-y-2">
                {(report?.data || []).map((scan) => <div
    key={scan._id}
    className={`flex items-center gap-3 p-3 rounded-xl border ${scan.result === "VALID" ? "bg-success-50 border-success-200" : scan.result === "ALREADY_REDEEMED" ? "bg-warning-50 border-warning-200" : "bg-danger-50 border-danger-200"}`}
  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${scan.result === "VALID" ? "bg-success-500" : scan.result === "ALREADY_REDEEMED" ? "bg-warning-500" : "bg-danger-500"}`}>
                      {scan.result === "VALID" ? <IconCheck size={14} className="text-white" /> : scan.result === "ALREADY_REDEEMED" ? <IconAlertTriangle size={14} className="text-white" /> : <IconX size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-text-primary truncate">{scan.booking_detail_id?.booking_id?.guest_name || "Unknown guest"}</div>
                      <div className="text-xs text-text-primary-500 truncate">{scan.facility_id?.name || "Facility unavailable"}</div>
                      <div className="font-mono text-[10px] text-text-primary-400">{scan.qr_code}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs text-text-primary-500">{new Date(scan.scanned_at).toLocaleTimeString()}</div>
                      <div className={`text-[10px] font-bold ${scan.result === "VALID" ? "text-success-600" : scan.result === "ALREADY_REDEEMED" ? "text-warning-600" : "text-danger-500"}`}>
                        {scan.result.replaceAll("_", " ")}
                      </div>
                    </div>
                  </div>)}
                {error && <p className="py-4 text-sm text-danger-600">{error}</p>}
                {!loading && !error && !(report?.data || []).length && <p className="py-8 text-center text-sm text-text-primary-500">No scans recorded for this period.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>;
}
