import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import useVendorDashboard from "../hooks/useVendorDashboard";
import useVendorSettlements from "../hooks/useVendorSettlements";
import { vendorApi } from "../services/api/vendorApi";
import { Dialog } from "./common/Dialog";
import PayoutDetailView, { PayoutStatusBadge } from "./PayoutDetailView";
import { dateTime, periodLabel, requestCode, vnd } from "../utils/payoutUi";
import { buttonClass, inputClass } from "../utils/attractionUi";

const EMPTY_BANK = { bank_name: "", account_number: "", account_name: "" };

function Stat({ label, value, detail, loading }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="font-heading font-800 text-xl text-slate-900">{loading ? "…" : vnd(value)}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{label}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

function RequestDialog({ overview, period, onClose, onSent }) {
  const [bank, setBank] = useState(overview.last_bank_account || EMPTY_BANK);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (event) => setBank({ ...bank, [key]: event.target.value });
  const { available } = overview;

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await vendorApi.createSettlement({ period_start: period.from || undefined, period_end: period.to || undefined, bank_account: bank, note: note.trim() || undefined });
      onSent();
    } catch (requestError) {
      setError(requestError.message);
      setSending(false);
    }
  };

  return (
    <Dialog title="Gửi yêu cầu quyết toán" onClose={() => !sending && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <dl className="grid grid-cols-[140px_1fr] gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          <dt className="text-slate-500">Số đơn</dt><dd className="font-medium">{available.line_count}</dd>
          <dt className="text-slate-500">Doanh thu</dt><dd className="font-medium">{vnd(available.gross)}</dd>
          <dt className="text-slate-500">Hoa hồng sàn</dt><dd className="font-medium">{vnd(available.commission)}</dd>
          <dt className="text-slate-500">Thực nhận</dt><dd className="font-bold text-primary-700">{vnd(available.amount)}</dd>
        </dl>
        <label className="block text-sm font-medium">Ngân hàng
          <input required maxLength={100} className={`${inputClass} mt-1`} value={bank.bank_name} onChange={set("bank_name")} placeholder="Ví dụ: Vietcombank" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Số tài khoản
            <input required inputMode="numeric" maxLength={20} className={`${inputClass} mt-1`} value={bank.account_number} onChange={set("account_number")} />
          </label>
          <label className="block text-sm font-medium">Chủ tài khoản
            <input required maxLength={100} className={`${inputClass} mt-1`} value={bank.account_name} onChange={set("account_name")} />
          </label>
        </div>
        <label className="block text-sm font-medium">Ghi chú (không bắt buộc)
          <textarea maxLength={500} rows={2} className={`${inputClass} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <p className="text-xs text-slate-500">Tiền sẽ được chuyển vào tài khoản trên sau khi yêu cầu được duyệt. Hãy kiểm tra kỹ số tài khoản.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={sending} onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Hủy</button>
          <button type="submit" disabled={sending} className={buttonClass}>{sending ? "Đang gửi..." : "Gửi yêu cầu"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function DetailDialog({ id, onClose }) {
  const [state, setState] = useState({ id: null });
  useEffect(() => {
    let active = true;
    vendorApi.getSettlement(id)
      .then((response) => active && setState({ id, payout: response.data }))
      .catch((requestError) => active && setState({ id, error: requestError.message }));
    return () => { active = false; };
  }, [id]);
  const ready = state.id === id;
  return (
    <Dialog title={`Yêu cầu quyết toán ${requestCode(id)}`} wide onClose={onClose}>
      {!ready && <p className="text-sm text-slate-500">Đang tải chi tiết...</p>}
      {ready && state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {ready && state.payout && <PayoutDetailView payout={state.payout} />}
      <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Đóng</button></div>
    </Dialog>
  );
}

export default function SettlementsPanel() {
  const { currentUser } = useAuth();
  const isHotel = currentUser?.role === "HOTEL_OWNER";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notice, setNotice] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const params = { from: from || undefined, to: to || undefined };
  const { settlements: overview, loading, error, refresh } = useVendorSettlements(params);
  const { report, loading: reportLoading } = useVendorDashboard(params);
  const rules = overview?.rules;
  const available = overview?.available;
  const history = overview?.history || [];

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Không tải được dữ liệu quyết toán: {error}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4">
        <label className="text-xs font-semibold text-slate-600">Từ ngày
          <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Đến ngày
          <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm" />
        </label>
        <p className="pb-2 text-xs text-slate-500">Báo cáo và số dư tính theo ngày thanh toán của đơn. Để trống để xem toàn bộ.</p>
      </div>

      <section aria-labelledby="report-heading">
        <h2 id="report-heading" className="mb-3 font-heading font-700 text-base text-slate-900">Báo cáo doanh thu</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={isHotel ? "Doanh thu phòng" : "Doanh thu vé"} value={report?.total_revenue} loading={reportLoading} detail={isHotel ? `${report?.rooms_sold ?? 0} phòng đã bán` : `${report?.tickets_sold ?? 0} vé đã bán`} />
          <Stat label="Hoa hồng phải trả sàn" value={report?.platform_commission} loading={reportLoading} detail={rules ? `Mức hiện hành ${rules.commission_rate}%` : undefined} />
          <Stat label="Thực nhận" value={report?.vendor_net} loading={reportLoading} detail="Sau khi trừ hoa hồng" />
        </div>
      </section>

      <section aria-labelledby="payout-heading">
        <h2 id="payout-heading" className="mb-3 font-heading font-700 text-base text-slate-900">Quyết toán</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Có thể rút" value={available?.amount} loading={loading} detail={available ? `${available.line_count} đơn đủ điều kiện` : undefined} />
          <Stat label="Đang chờ xử lý" value={overview?.in_review_amount} loading={loading} detail="Chờ duyệt hoặc chờ chuyển khoản" />
          <Stat label="Đã nhận" value={overview?.paid_amount} loading={loading} detail="Admin đã chuyển khoản" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-5">
          <p className="max-w-xl text-sm text-slate-600">
            {available?.line_count
              ? `Bạn có ${available.line_count} đơn đủ điều kiện, thực nhận ${vnd(available.amount)}.`
              : `Chưa có đơn nào đủ điều kiện. Đơn được tính sau ${rules?.hold_days ?? "…"} ngày kể từ ngày ${isHotel ? "trả phòng" : "tham quan"}.`}
          </p>
          <button type="button" disabled={!available?.line_count} onClick={() => { setNotice(""); setRequesting(true); }} className={buttonClass}>Gửi yêu cầu quyết toán</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white" aria-labelledby="history-heading">
        <h2 id="history-heading" className="border-b border-border px-5 py-4 font-heading font-700 text-base text-slate-900">Lịch sử yêu cầu</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-xs text-slate-500">
                {["Mã", "Kỳ", "Số đơn", "Thực nhận", "Gửi lúc", "Trạng thái", ""].map((heading, index) => <th key={index} className="px-4 py-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {history.map((payout) => (
                <tr key={payout.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{requestCode(payout.id)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{periodLabel(payout.period_start, payout.period_end)}</td>
                  <td className="px-4 py-3">{payout.line_count}</td>
                  <td className="px-4 py-3 font-semibold">{vnd(payout.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{dateTime(payout.created_at)}</td>
                  <td className="px-4 py-3"><PayoutStatusBadge status={payout.status} /></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setDetailId(payout.id)} className="text-sm font-semibold text-primary-600 hover:underline">Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-4 py-6 text-sm text-slate-500">Đang tải lịch sử...</p>}
        {!loading && !error && history.length === 0 && <p className="px-4 py-8 text-sm text-slate-500">Bạn chưa gửi yêu cầu nào. Khi có đơn đủ điều kiện, bấm "Gửi yêu cầu quyết toán" ở trên.</p>}
      </section>

      {requesting && overview && (
        <RequestDialog
          overview={overview}
          period={{ from, to }}
          onClose={() => setRequesting(false)}
          onSent={() => { setRequesting(false); setNotice("Đã gửi yêu cầu. Quản trị viên sẽ duyệt và chuyển khoản vào tài khoản bạn đã nhập."); refresh(); }}
        />
      )}
      {detailId && <DetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
