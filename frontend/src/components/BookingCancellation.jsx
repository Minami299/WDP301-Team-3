import { useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import { cancellationStatus, requestTypeLabel, bookingTime, formatDate } from '../utils/bookingUi';

export default function BookingCancellation({ booking, vendor = false, onUpdated }) {
  const [requestType, setRequestType] = useState('CANCEL');
  const [newDate, setNewDate] = useState('');
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
    if ((!vendor && !reason.trim()) || reason.length > 1000) {
      setError('Vui lòng nhập lý do từ 1 đến 1000 ký tự.');
      return;
    }
    if (!vendor && requestType === 'CHANGE_DATE' && !newDate) {
      setError('Vui lòng chọn ngày mới cần đổi.');
      return;
    }
    sending.current = true; setBusy(true);
    try {
      const result = vendor
        ? await bookingApi.decideCancellation(booking._id, pending._id, { status, reason })
        : await bookingApi.requestCancellation(booking._id, {
            reason,
            type: requestType,
            new_date: requestType === 'CHANGE_DATE' ? newDate : undefined,
            request_id: requestId.current
          });
      onUpdated(result.data);
      setReason('');
      setNewDate('');
      requestId.current = crypto.randomUUID();
      setSuccess(
        vendor
          ? (status === 'APPROVED' ? 'Đã chấp thuận yêu cầu thành công.' : 'Đã từ chối yêu cầu.')
          : 'Đã gửi yêu cầu đến Đối tác.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border rounded-2xl p-5 sm:p-7 mt-5">
      <h2 className="font-bold text-lg">Yêu cầu hủy phòng & đổi ngày</h2>
      {!history.length && <p className="text-sm text-slate-500 mt-3">Chưa có yêu cầu nào.</p>}

      <ol className="space-y-3 mt-4">
        {history.map(r => (
          <li key={r._id} className="rounded-xl bg-slate-50 p-4 text-sm border border-slate-100">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                  {requestTypeLabel(r.type)}
                </span>
                <strong>{cancellationStatus(r.status)}</strong>
              </div>
              <span className="text-xs text-slate-500">{bookingTime(r.requested_at)}</span>
            </div>
            {r.type === 'CHANGE_DATE' && r.new_date && (
              <p className="mt-2 text-sm font-medium text-primary-700">
                Ngày mới yêu cầu: {formatDate(r.new_date)}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">Lý do: {r.reason}</p>
            {r.processed_at && (
              <p className="mt-2 text-xs text-slate-500">Đối tác xử lý: {bookingTime(r.processed_at)}</p>
            )}
            {r.decision_reason && (
              <p className="mt-2 whitespace-pre-wrap break-words text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                Phản hồi của Đối tác: {r.decision_reason}
              </p>
            )}
          </li>
        ))}
      </ol>

      {(vendor ? pending && booking.can_process_cancellation : booking.can_request_cancellation) && (
        <form
          className="mt-6 border-t border-slate-100 pt-5"
          onSubmit={e => {
            e.preventDefault();
            submit(vendor ? 'APPROVED' : undefined);
          }}
        >
          {vendor ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-bold text-amber-900 mb-1">
                Khách đang yêu cầu: {requestTypeLabel(pending?.type)}
              </h3>
              {pending?.type === 'CHANGE_DATE' && pending?.new_date && (
                <p className="text-sm text-amber-800 font-semibold mb-1">
                  Ngày chuyển đổi mong muốn: {formatDate(pending.new_date)}
                </p>
              )}
              <p className="text-sm text-amber-800">
                Lý do từ khách: {pending?.reason}
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              <label className="block text-sm font-semibold">
                Loại yêu cầu *
                <select
                  className={`${inputClass} mt-2`}
                  value={requestType}
                  onChange={e => setRequestType(e.target.value)}
                  disabled={busy}
                >
                  <option value="CANCEL">Yêu cầu hủy phòng / hủy đơn</option>
                  <option value="CHANGE_DATE">Yêu cầu đổi ngày nhận phòng / ngày sử dụng</option>
                </select>
              </label>

              {requestType === 'CHANGE_DATE' && (
                <label className="block text-sm font-semibold">
                  Ngày mới mong muốn đổi sang *
                  <input
                    type="date"
                    className={`${inputClass} mt-2`}
                    required
                    value={newDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setNewDate(e.target.value)}
                    disabled={busy}
                  />
                </label>
              )}
            </div>
          )}

          <label className="block text-sm font-semibold">
            {vendor ? 'Phản hồi / Lý do từ chối (không bắt buộc)' : 'Lý do gửi yêu cầu *'}
            <textarea
              name="cancellation_reason"
              className={`${inputClass} mt-2`}
              rows={3}
              maxLength={1000}
              required={!vendor}
              placeholder={vendor ? 'Nhập phản hồi hoặc lý do từ chối nếu có...' : 'Nhập chi tiết lý do...'}
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={busy}
            />
          </label>

          <div className="flex flex-wrap gap-3 mt-4">
            <button disabled={busy} className={buttonClass}>
              {busy
                ? 'Đang xử lý...'
                : vendor
                ? pending?.type === 'CHANGE_DATE'
                  ? 'Chấp thuận đổi ngày'
                  : 'Chấp thuận hủy phòng'
                : 'Gửi yêu cầu'}
            </button>
            {vendor && (
              <button
                type="button"
                disabled={busy}
                onClick={() => submit('REJECTED')}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                Từ chối yêu cầu
              </button>
            )}
          </div>
        </form>
      )}

      {!vendor && pending && (
        <p className="text-sm text-amber-700 mt-4">
          Đối tác đang xem xét yêu cầu của bạn. Trạng thái đơn sẽ được cập nhật ngay khi được phê duyệt.
        </p>
      )}
      {!vendor && !pending && !booking.can_request_cancellation && booking.status !== 'CANCELLED' && (
        <p className="text-sm text-slate-500 mt-4">
          Đơn này hiện không đủ điều kiện gửi yêu cầu hủy hoặc đổi ngày.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-rose-600 mt-3">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-700 mt-3">{success}</p>}
    </section>
  );
}
