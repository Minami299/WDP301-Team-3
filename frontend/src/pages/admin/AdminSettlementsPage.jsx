import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { adminApi } from "../../services/api/adminApi";
import { Dialog, Field } from "../../components/common/Dialog";
import PayoutDetailView, { PayoutStatusBadge } from "../../components/PayoutDetailView";
import { PAYOUT_STATUS, dateTime, periodLabel, requestCode, vnd } from "../../utils/payoutUi";
import { inputClass } from "./adminDialogs";
import { PageHeader } from "./adminUi";

const TABS = ["PENDING", "APPROVED", "PAID", "REJECTED"];
const TAB_LABELS = { PENDING: "Chờ duyệt", APPROVED: "Chờ chuyển khoản", PAID: "Đã chi trả", REJECTED: "Từ chối" };

function emailNotice(result) {
  return result.emailSent ? "Đã cập nhật yêu cầu và gửi email cho đối tác." : "Đã cập nhật yêu cầu nhưng chưa gửi được email (kiểm tra cấu hình SMTP).";
}

function ReviewDialog({ id, onClose, onChanged }) {
  const [state, setState] = useState({ id: null });
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi.getPayout(id)
      .then((response) => active && setState({ id, payout: response.data }))
      .catch((requestError) => active && setState({ id, error: requestError.message }));
    return () => { active = false; };
  }, [id]);

  const ready = state.id === id;
  const payout = ready ? state.payout : null;

  const decide = async (status) => {
    if (saving) return;
    if (status === "REJECTED" && !reason.trim()) { setError("Vui lòng nhập lý do từ chối"); return; }
    if (status === "PAID" && !reference.trim()) { setError("Vui lòng nhập mã giao dịch chuyển khoản"); return; }
    setSaving(true);
    setError("");
    try {
      const response = await adminApi.decidePayout(id, { status, reason: reason.trim(), paid_reference: reference.trim() });
      onChanged(emailNotice(response.data));
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Yêu cầu quyết toán ${requestCode(id)}`} wide onClose={() => !saving && onClose()}>
      {!ready && <p className="text-sm text-slate-500">Đang tải chi tiết...</p>}
      {ready && state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {payout && <PayoutDetailView payout={payout} />}
      {payout?.status === "PENDING" && (
        <div className="mt-4">
          <Field label="Lý do từ chối (bắt buộc khi từ chối)">
            <textarea aria-label="Lý do từ chối" maxLength={1000} rows={3} className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving} />
          </Field>
        </div>
      )}
      {payout?.status === "APPROVED" && (
        <div className="mt-4">
          <Field label="Mã giao dịch chuyển khoản (bắt buộc)">
            <input aria-label="Mã giao dịch" maxLength={100} className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} placeholder="Mã tham chiếu trên sao kê ngân hàng" />
          </Field>
          <p className="mt-2 text-xs text-slate-500">Hãy chuyển {vnd(payout.amount)} vào tài khoản của đối tác, sau đó nhập mã giao dịch và xác nhận.</p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-8 border border-border px-4 py-2 text-sm font-semibold hover:bg-slate-50">Đóng</button>
        {payout?.status === "PENDING" && <>
          <button type="button" disabled={saving} onClick={() => decide("REJECTED")} className="rounded-8 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Từ chối</button>
          <button type="button" disabled={saving} onClick={() => decide("APPROVED")} className="rounded-8 bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">Duyệt yêu cầu</button>
        </>}
        {payout?.status === "APPROVED" && <button type="button" disabled={saving} onClick={() => decide("PAID")} className="rounded-8 bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">Xác nhận đã chuyển khoản</button>}
      </div>
    </Dialog>
  );
}

function RulesPanel({ canEdit }) {
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState({ commission_rate: "", hold_days: "" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi.getSettlementSettings()
      .then((response) => {
        if (!active) return;
        setRules(response.data);
        setForm({ commission_rate: String(response.data.commission_rate), hold_days: String(response.data.hold_days) });
      })
      .catch((requestError) => active && setMessage({ type: "error", text: requestError.message }));
    return () => { active = false; };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await adminApi.updateSettlementSettings({ commission_rate: Number(form.commission_rate), hold_days: Number(form.hold_days) });
      setRules(response.data);
      setMessage({ type: "ok", text: "Đã lưu. Mức mới áp dụng cho các đơn hoàn tất từ bây giờ; đơn đã hoàn tất giữ mức cũ." });
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-8 border border-border bg-white p-5" aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="font-heading font-700 text-base">Quy tắc quyết toán</h2>
      <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-4">
        <Field label="Hoa hồng sàn (%)">
          <input type="number" min={0} max={100} step="0.1" required disabled={!canEdit || !rules} className={`${inputClass} w-36`} value={form.commission_rate} onChange={(event) => setForm({ ...form, commission_rate: event.target.value })} />
        </Field>
        <Field label="Ngày chờ sau khi sử dụng dịch vụ">
          <input type="number" min={0} max={60} step={1} required disabled={!canEdit || !rules} className={`${inputClass} w-44`} value={form.hold_days} onChange={(event) => setForm({ ...form, hold_days: event.target.value })} />
        </Field>
        {canEdit
          ? <button type="submit" disabled={saving || !rules} className="rounded-8 bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu quy tắc"}</button>
          : <p className="pb-2 text-xs text-slate-500">Chỉ Admin được thay đổi quy tắc.</p>}
      </form>
      {message.text && <p role={message.type === "error" ? "alert" : "status"} className={`mt-3 text-sm ${message.type === "error" ? "text-red-700" : "text-emerald-800"}`}>{message.text}</p>}
    </section>
  );
}

export default function AdminSettlementsPage() {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get("status")) ? params.get("status") : "PENDING";
  const search = params.get("search") || "";
  const page = Number(params.get("page")) || 1;
  const [searchText, setSearchText] = useState(search);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  const update = useCallback((changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  }, [params, setParams]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listPayouts({ status, search: search || undefined, page, limit: 15 })
      .then((response) => { setResult(response.data); setError(""); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [status, search, page]);

  useEffect(load, [load]);

  useEffect(() => {
    const timer = setTimeout(() => { if (searchText !== search) update({ search: searchText.trim() }); }, 350);
    return () => clearTimeout(timer);
  }, [searchText, search, update]);

  return (
    <>
      <PageHeader title="Partner settlements" />
      <div className="space-y-4 px-8 py-6">
        <RulesPanel canEdit={currentUser?.role === "ADMIN"} />

        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex overflow-hidden rounded-8 border border-border bg-white">
            {TABS.map((tab) => (
              <button key={tab} role="tab" aria-selected={status === tab} onClick={() => update({ status: tab })} className={`px-4 py-2 text-sm font-semibold ${status === tab ? "bg-primary-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <input aria-label="Tìm đối tác" className={`${inputClass} max-w-xs`} placeholder="Tìm theo tên hoặc email đối tác" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </div>

        {notice && <p role="status" className="rounded-8 bg-success-100 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-8 bg-danger-100 px-4 py-3 text-sm text-red-700">Không tải được yêu cầu: {error}</p>}

        <div className="overflow-x-auto rounded-8 border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                {["Đối tác", "Kỳ", "Số đơn", "Thực nhận", "Gửi lúc", "Trạng thái", ""].map((heading, index) => <th key={index} className="px-4 py-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {result?.items.map((payout) => (
                <tr key={payout.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{payout.partner?.full_name || "Tài khoản đã xóa"}</div>
                    <div className="text-xs text-text-secondary">{payout.partner?.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{periodLabel(payout.period_start, payout.period_end)}</td>
                  <td className="px-4 py-3">{payout.line_count}</td>
                  <td className="px-4 py-3 font-semibold">{vnd(payout.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">{dateTime(payout.created_at)}</td>
                  <td className="px-4 py-3"><PayoutStatusBadge status={payout.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setNotice(""); setSelected(payout.id); }} className="rounded-8 px-3 py-1 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                      {["PENDING", "APPROVED"].includes(payout.status) ? "Xử lý" : "Xem"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && !result && <p className="px-4 py-6 text-sm text-text-secondary">Đang tải yêu cầu...</p>}
          {result && result.items.length === 0 && <p className="px-4 py-8 text-sm text-text-secondary">{search ? "Không có yêu cầu khớp với từ khóa. Xóa ô tìm kiếm để xem tất cả." : `Không có yêu cầu nào ở mục "${PAYOUT_STATUS[status].label}".`}</p>}
        </div>

        {result && (
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>{result.total} yêu cầu</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="rounded-8 border border-border px-3 py-1 disabled:opacity-40">Trước</button>
              <span>Trang {result.page} / {result.pages}</span>
              <button disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })} className="rounded-8 border border-border px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </div>
      {selected && <ReviewDialog id={selected} onClose={() => setSelected(null)} onChanged={(message) => { setSelected(null); setNotice(message); load(); }} />}
    </>
  );
}
