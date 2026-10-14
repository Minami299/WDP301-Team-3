import { useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import { cancellationStatus, bookingTime } from '../utils/bookingUi';

export default function BookingCancellation({ booking, vendor = false, onUpdated }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const history = booking.cancellation_requests || [];
  const pending = history.find(r => r.status === 'PENDING');
  const submit = async (status) => {
    if (sending.current) return;
    setError(''); setSuccess('');
    if ((!vendor && !reason.trim()) || reason.length > 1000) { setError('Vui lòng nhập lý do từ 1 đến 1000 ký tự.'); return; }
    sending.current = true; setBusy(true);
    try {
      const result = vendor
        ? await bookingApi.decideCancellation(booking._id, pending._id, { status, reason })
        : await bookingApi.requestCancellation(booking._id, { reason, request_id: requestId.current });
      onUpdated(result.data); setReason(''); requestId.current = crypto.randomUUID();
      setSuccess(vendor ? 'Đã xử lý yêu cầu hủy.' : 'Đã gửi yêu cầu hủy đến Vendor.');
    } catch (e) { setError(e.message); }
    finally { sending.current = false; setBusy(false); }
  };
  return <section className="bg-white border rounded-2xl p-5 sm:p-7 mt-5">
    <h2 className="font-bold text-lg">Yêu cầu hủy đơn</h2>
    {!history.length && <p className="text-sm text-slate-500 mt-3">Chưa có yêu cầu hủy.</p>}
    <ol className="space-y-3 mt-4">{history.map(r => <li key={r._id} className="rounded-xl bg-slate-50 p-4 text-sm">
      <div className="flex flex-wrap gap-2 justify-between"><strong>{cancellationStatus(r.status)}</strong><span className="text-xs text-slate-500">{bookingTime(r.requested_at)}</span></div>
      <p className="mt-2 whitespace-pre-wrap break-words">Lý do hủy: {r.reason}</p>
      {r.processed_at && <p className="mt-2 text-xs text-slate-500">Vendor xử lý: {bookingTime(r.processed_at)}</p>}
      {r.decision_reason && <p className="mt-2 whitespace-pre-wrap break-words">Phản hồi của Vendor: {r.decision_reason}</p>}
    </li>)}</ol>
    {(vendor ? pending && booking.can_process_cancellation : booking.can_request_cancellation) && <form className="mt-5" onSubmit={e => { e.preventDefault(); submit(vendor ? 'APPROVED' : undefined); }}>
      <label className="block text-sm font-semibold">{vendor ? 'Phản hồi / lý do từ chối (không bắt buộc)' : 'Lý do hủy đơn *'}<textarea name="cancellation_reason" className={`${inputClass} mt-2`} rows={3} maxLength={1000} required={!vendor} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
      <div className="flex flex-wrap gap-3 mt-3"><button disabled={busy} className={buttonClass}>{busy ? 'Đang xử lý...' : vendor ? 'Chấp thuận hủy' : 'Gửi yêu cầu hủy'}</button>{vendor && <button type="button" disabled={busy} onClick={() => submit('REJECTED')} className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-50">Từ chối yêu cầu</button>}</div>
    </form>}
    {!vendor && pending && <p className="text-sm text-amber-700 mt-4">Vendor đang xem xét yêu cầu của bạn. Đơn vẫn ở trạng thái Pending cho đến khi được chấp thuận.</p>}
    {!vendor && !pending && !booking.can_request_cancellation && booking.status !== 'CANCELLED' && <p className="text-sm text-slate-500 mt-4">Đơn này không đủ điều kiện gửi yêu cầu hủy vé chưa thanh toán.</p>}
    {error && <p role="alert" className="text-sm text-rose-600 mt-3">{error}</p>}
    {success && <p role="status" className="text-sm text-emerald-700 mt-3">{success}</p>}
  </section>;
}
