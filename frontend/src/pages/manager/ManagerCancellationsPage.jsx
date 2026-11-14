import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { bookingApi } from "../../services/api/bookingApi";
import { Dialog, Field, inputClass } from "../admin/adminDialogs";
import { PageHeader, formatDate } from "../admin/adminUi";
import { vnd } from "../../utils/payoutUi";

const TABS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ liên hệ & hoàn tiền" },
  { value: "APPROVED", label: "Đã hoàn tiền" },
  { value: "REJECTED", label: "Từ chối" },
];

const MANAGER_TYPES = ["CANCEL", "REFUND"];
function pickRequest(item) {
  const list = (item.cancellation_requests || []).filter((r) => MANAGER_TYPES.includes(r.type));
  return list.find((r) => r.status === "PENDING") || list[list.length - 1];
}

function CancellationDetailModal({ item, onClose, onUpdated }) {
  const req = pickRequest(item);
  const [reason, setReason] = useState("");
  const [paidReference, setPaidReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (status) => {
    if (saving) return;
    if (status === "REJECTED" && !reason.trim()) {
      setError("Vui lòng nhập lý do từ chối để phản hồi cho khách hàng.");
      return;
    }
    if (status === "APPROVED" && req?.refund_method !== "POINTS" && !paidReference.trim()) {
      setError("Vui lòng nhập mã giao dịch chuyển khoản ngân hàng.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await bookingApi.managerCancellationsDecide(item._id, req._id, {
        status,
        reason: reason.trim(),
        paid_reference: paidReference.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const isPending = req?.status === "PENDING";
  const contactPhone = req?.contact_phone || item.guest_phone;
  const contactName = req?.contact_name || item.guest_name;
  const contactEmail = req?.contact_email || item.guest_email;

  return (
    <Dialog title={`Xử lý hủy phòng đơn ${item.booking_code}`} wide onClose={() => !saving && onClose()}>
      <div className="space-y-4 text-sm">
        {error && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Thông tin khách hàng & liên hệ</h3>
            <p><strong>Khách hàng:</strong> {contactName}</p>
            <p className="flex items-center gap-2">
              <strong>Số điện thoại:</strong>
              <span className="font-bold text-primary-700 text-base">{contactPhone || "—"}</span>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="px-2 py-0.5 rounded bg-primary-100 text-primary-700 text-xs font-semibold hover:bg-primary-200">
                  Gọi điện
                </a>
              )}
            </p>
            <p><strong>Email:</strong> {contactEmail || "—"}</p>
            <p><strong>Khách sạn / Cơ sở:</strong> {item.facility_name || "—"}</p>
            <p><strong>Dịch vụ / Phòng:</strong> {item.details?.map(d => d.service_name || d.ticket_name).filter(Boolean).join(", ")}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Chiết tính tài chính hoàn trả</h3>
            <p><strong>Tổng tiền đơn:</strong> {vnd(item.final_amount)}</p>
            <p><strong>Phí hủy theo chính sách:</strong> <span className="text-rose-600 font-semibold">{vnd(req?.cancellation_fee || 0)}</span></p>
            <p>
              <strong>Số tiền cần hoàn:</strong>
              <span className="font-extrabold text-emerald-700 text-base ml-1">
                {vnd(req?.refund_amount !== undefined ? req.refund_amount : item.final_amount)}
              </span>
            </p>
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <p><strong>Ngân hàng nhận:</strong> {req?.refund_bank_name || "—"}</p>
              <p><strong>Số tài khoản:</strong> <span className="font-mono font-bold text-slate-900">{req?.refund_account_number || "—"}</span></p>
              <p><strong>Chủ tài khoản:</strong> {req?.refund_account_name || "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
          <strong>Lý do từ khách hàng:</strong>
          <p className="mt-1 whitespace-pre-wrap">{req?.reason || "Không có lý do chi tiết."}</p>
        </div>

        {req?.decision_reason && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <strong>Ghi chú / Phản hồi trước đó:</strong>
            <p className="mt-1 whitespace-pre-wrap">{req.decision_reason}</p>
            {req.paid_reference && <p className="mt-1 font-semibold text-primary-700">Mã giao dịch hoàn tiền: {req.paid_reference}</p>}
          </div>
        )}

        {isPending && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <Field label="Mã giao dịch chuyển khoản ngân hàng (bắt buộc khi xác nhận hoàn tiền)">
              <input
                type="text"
                placeholder="VD: FT241114001923..."
                className={inputClass}
                value={paidReference}
                onChange={(e) => setPaidReference(e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field label="Ghi chú xử lý / Lý do phản hồi">
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Ghi chú xác nhận đã liên hệ khách và chuyển khoản..."
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={saving}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => submit("REJECTED")}
                className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 font-semibold hover:bg-rose-50 text-sm disabled:opacity-50"
              >
                Từ chối yêu cầu
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => submit("APPROVED")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm disabled:opacity-50"
              >
                {saving ? "Đang xử lý..." : "Xác nhận đã hoàn tiền cho khách"}
              </button>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="flex justify-end pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
              Đóng
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default function ManagerCancellationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "PENDING";
  const search = params.get("q") || "";
  const [searchText, setSearchText] = useState(search);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    bookingApi
      .managerCancellationsList({ status: status === "ALL" ? undefined : status, q: search || undefined })
      .then((res) => {
        setItems(res.data || []);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = items.filter((b) => pickRequest(b)?.status === "PENDING").length;

  return (
    <>
      <PageHeader title="Yêu cầu hủy phòng & hoàn tiền" />

      <div className="px-8 py-6 space-y-4">
        {/* Bộ lọc Tab & Tìm kiếm */}
        <div className="bg-white p-4 rounded-12 border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex rounded-8 border border-border bg-slate-50 p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={status === t.value}
                onClick={() => update({ status: t.value })}
                className={`px-3.5 py-1.5 rounded-6 text-xs font-bold transition-all ${
                  status === t.value
                    ? "bg-white text-primary-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: searchText.trim() });
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-8 border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-56"
            />
            <button type="submit" className="px-3 py-1.5 rounded-8 bg-primary-600 text-white text-xs font-bold hover:bg-primary-700">
              Tìm
            </button>
          </form>
        </div>

        {error && <p role="alert" className="p-4 bg-danger-100 text-red-700 rounded-8 text-sm">{error}</p>}

        {/* Bảng danh sách */}
        <div className="bg-white border border-border rounded-12 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary bg-slate-50/75 border-b border-border">
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Khách hàng & SĐT</th>
                <th className="px-4 py-3 font-semibold">Cơ sở / Phòng</th>
                <th className="px-4 py-3 font-semibold">Hoàn tiền</th>
                <th className="px-4 py-3 font-semibold">Tài khoản nhận</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const req = pickRequest(b);
                const isPending = req?.status === "PENDING";
                const phone = req?.contact_phone || b.guest_phone;
                const name = req?.contact_name || b.guest_name;
                return (
                  <tr key={b._id} className="border-b border-border last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-primary-700">
                      {b.booking_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{name}</div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-primary-700">{phone || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{b.facility_name}</div>
                      <div className="text-xs text-slate-400">
                        {b.details?.[0]?.check_in_date ? formatDate(b.details[0].check_in_date) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {vnd(req?.refund_amount !== undefined ? req.refund_amount : b.final_amount)}
                      {req?.cancellation_fee > 0 && (
                        <span className="block text-[11px] text-rose-500 font-normal">
                          (Đã trừ phí {vnd(req.cancellation_fee)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{req?.refund_bank_name || "—"}</div>
                      <div className="font-mono text-slate-800 font-semibold">{req?.refund_account_number || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPending
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : req?.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {isPending ? "Chờ xử lý" : req?.status === "APPROVED" ? "Đã hoàn tiền" : "Đã từ chối"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(b)}
                        className={`px-3 py-1.5 rounded-8 text-xs font-bold transition shadow-xs ${
                          isPending
                            ? "bg-primary-600 text-white hover:bg-primary-700"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isPending ? "Gọi & Hoàn tiền" : "Xem chi tiết"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <p className="px-4 py-6 text-sm text-text-secondary text-center">Đang tải danh sách yêu cầu...</p>}
          {!loading && items.length === 0 && (
            <p className="px-4 py-8 text-sm text-text-secondary text-center">
              Không có yêu cầu hủy & hoàn tiền nào phù hợp với bộ lọc hiện tại.
            </p>
          )}
        </div>
      </div>

      {selected && (
        <CancellationDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </>
  );
}
