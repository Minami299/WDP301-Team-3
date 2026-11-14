import { useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import { cancellationStatus, requestTypeLabel, bookingTime, formatDate } from '../utils/bookingUi';

export default function BookingCancellation({ booking, vendor = false, onUpdated }) {
  const [requestType, setRequestType] = useState('CANCEL');
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('BANK_TRANSFER');
  const [contactName, setContactName] = useState(booking.guest_name || '');
  const [contactPhone, setContactPhone] = useState(booking.guest_phone || '');
  const [contactEmail, setContactEmail] = useState(booking.guest_email || '');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const history = booking.cancellation_requests || [];
  const pending = history.find(r => r.status === 'PENDING');
  const policy = booking.cancellation_policy;

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
    if (!vendor && (requestType === 'CANCEL' || requestType === 'REFUND')) {
      if (policy && policy.cancellable === false) {
        setError('Đơn còn dưới 24 giờ trước ngày sử dụng nên không thể hủy hoặc hoàn tiền theo chính sách.');
        return;
      }
      if (!contactPhone.trim()) {
        setError('Vui lòng nhập số điện thoại liên hệ trực tiếp để Manager liên hệ hoàn tiền.');
        return;
      }
      if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
        setError('Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản nhận hoàn tiền.');
        return;
      }
    }
    sending.current = true; setBusy(true);
    try {
      const result = vendor
        ? await bookingApi.decideCancellation(booking._id, pending._id, { status, reason })
        : await bookingApi.requestCancellation(booking._id, {
            reason,
            type: requestType,
            new_date: requestType === 'CHANGE_DATE' ? newDate : undefined,
            refund_method: refundMethod,
            refund_bank_name: bankName.trim(),
            refund_account_number: accountNumber.trim(),
            refund_account_name: accountName.trim().toUpperCase(),
            contact_name: contactName.trim(),
            contact_phone: contactPhone.trim(),
            contact_email: contactEmail.trim(),
            request_id: requestId.current
          });
      onUpdated(result.data);
      setReason('');
      setNewDate('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      requestId.current = crypto.randomUUID();
      setSuccess(
        vendor
          ? (status === 'APPROVED' ? 'Đã chấp thuận yêu cầu thành công.' : 'Đã từ chối yêu cầu.')
          : 'Đã gửi yêu cầu đến Bộ phận Quản lý (Manager) để liên hệ trực tiếp hoàn tiền.'
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
      <h2 className="font-bold text-lg">Yêu cầu hủy dịch vụ, đổi ngày & hoàn tiền</h2>
      {!history.length && <p className="text-sm text-slate-500 mt-3">Chưa có yêu cầu nào.</p>}

      <ol className="space-y-3 mt-4">
        {history.map(r => (
          <li key={r._id} className="rounded-xl bg-slate-50 p-4 text-sm border border-slate-100">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.type === 'REFUND' ? 'bg-emerald-100 text-emerald-800' : r.type === 'CHANGE_DATE' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'}`}>
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
            {(r.type === 'REFUND' || r.type === 'CANCEL') && (r.refund_bank_name || r.refund_method) && (
              <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div>
                  Hình thức hoàn tiền: <strong>{r.refund_method === 'POINTS' ? 'Quy đổi Điểm thưởng thành viên' : 'Chuyển khoản Ngân hàng'}</strong>
                  {r.refund_points_amount > 0 && <span className="ml-1 text-emerald-600 font-semibold">(Đã cộng +{r.refund_points_amount} điểm)</span>}
                </div>
                {r.refund_amount !== undefined && r.policy_applied && (
                  <div>Số tiền hoàn dự kiến: <strong>{(r.refund_amount || 0).toLocaleString('vi-VN')} đ</strong> (phí hủy {(r.cancellation_fee || 0).toLocaleString('vi-VN')} đ)</div>
                )}
                {r.refund_method === 'BANK_TRANSFER' && r.refund_bank_name && (
                  <div className="text-slate-500">
                    Ngân hàng: {r.refund_bank_name} | STK: <span className="font-mono text-slate-800 font-semibold">{r.refund_account_number}</span> | Chủ TK: {r.refund_account_name}
                  </div>
                )}
                {r.paid_reference && <div>Mã giao dịch hoàn tiền: <strong>{r.paid_reference}</strong></div>}
              </div>
            )}
            {r.processed_at && (
              <p className="mt-2 text-xs text-slate-500">{r.assigned_to === 'VENDOR' ? 'Đối tác' : 'Manager'} xử lý: {bookingTime(r.processed_at)}</p>
            )}
            {r.decision_reason && (
              <p className="mt-2 whitespace-pre-wrap break-words text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                Phản hồi của {r.assigned_to === 'VENDOR' ? 'Đối tác' : 'Manager'}: {r.decision_reason}
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
              {pending?.type === 'REFUND' && (
                <div className="mt-2 pt-2 border-t border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                  <div>
                    <strong>Hình thức hoàn tiền khách chọn: </strong>
                    <span className="font-bold text-primary-700">
                      {pending?.refund_method === 'POINTS' ? 'Quy đổi Điểm thưởng thành viên' : 'Chuyển khoản Ngân hàng'}
                    </span>
                  </div>
                  {pending?.refund_method === 'POINTS' ? (
                    <p className="text-slate-600">
                      Hệ thống sẽ <strong>tự động tính và cộng điểm thưởng</strong> trực tiếp vào tài khoản của khách ngay khi bạn nhấn "Chấp thuận hoàn tiền".
                    </p>
                  ) : (
                    <div className="bg-white p-2.5 rounded-lg border border-amber-200 mt-1 space-y-1">
                      <div>Ngân hàng: <strong>{pending?.refund_bank_name || 'Chưa cung cấp'}</strong></div>
                      <div>Số tài khoản: <strong className="font-mono text-sm">{pending?.refund_account_number || 'Chưa cung cấp'}</strong></div>
                      <div>Chủ tài khoản: <strong>{pending?.refund_account_name || 'Chưa cung cấp'}</strong></div>
                      <div>Số tiền cần hoàn: <strong className="text-rose-600">{(booking.final_amount || 0).toLocaleString('vi-VN')} đ</strong></div>
                      <p className="text-[11px] text-slate-500 pt-1 border-t">
                        Vui lòng chuyển khoản cho khách theo thông tin trên trước hoặc sau khi duyệt hoàn tiền.
                      </p>
                    </div>
              )}

                </div>
              )}
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
                  <option value="CANCEL">Yêu cầu hủy phòng & hoàn tiền</option>
                  <option value="CHANGE_DATE">Yêu cầu đổi ngày nhận phòng</option>
                  <option value="REFUND">Yêu cầu hoàn tiền theo quy định</option>
                </select>
              </label>

              {(requestType === 'CANCEL' || requestType === 'REFUND') && (
                <div className="space-y-4">
                  {policy && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Chiết tính hoàn tiền</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          {policy.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Tổng tiền phòng</span>
                          <span className="font-bold text-sm text-slate-900 block mt-0.5">
                            {(booking.final_amount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-rose-500 block">Phí hủy ({policy.feePercent}%)</span>
                          <span className="font-bold text-sm text-rose-600 block mt-0.5">
                            -{(policy.feeAmount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-[11px] text-emerald-700 block font-semibold">Tiền hoàn dự kiến</span>
                          <span className="font-extrabold text-sm text-emerald-700 block mt-0.5">
                            {(policy.refundAmount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {policy.cancellable === false
                          ? '* Đơn còn dưới 24 giờ trước ngày sử dụng nên không thể hủy hoặc hoàn tiền. Bạn vẫn có thể gửi yêu cầu đổi ngày.'
                          : <>* Đơn này sẽ được chuyển đến <strong>Bộ phận Quản lý (Manager)</strong> để liên hệ trực tiếp qua số điện thoại của bạn và hoàn trả số tiền trên vào tài khoản ngân hàng.</>}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Thông tin liên hệ trực tiếp & nhận hoàn tiền</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Họ và tên người liên hệ *
                        <input
                          type="text"
                          required
                          className={`${inputClass} mt-1`}
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Số điện thoại liên hệ trực tiếp *
                        <input
                          type="tel"
                          required
                          placeholder="Số điện thoại Manager sẽ gọi để xác nhận"
                          className={`${inputClass} mt-1`}
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                    </div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Email liên hệ
                      <input
                        type="email"
                        className={`${inputClass} mt-1`}
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Tên ngân hàng *
                        <input
                          type="text"
                          required
                          placeholder="VD: Vietcombank, MB..."
                          className={`${inputClass} mt-1`}
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Số tài khoản ngân hàng *
                        <input
                          type="text"
                          required
                          placeholder="Số tài khoản"
                          className={`${inputClass} mt-1 font-mono`}
                          value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Tên chủ tài khoản (in hoa) *
                        <input
                          type="text"
                          required
                          placeholder="VD: NGUYEN VAN A"
                          className={`${inputClass} mt-1 uppercase`}
                          value={accountName}
                          onChange={e => setAccountName(e.target.value.toUpperCase())}
                          disabled={busy}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

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
                  : pending?.type === 'REFUND'
                  ? 'Chấp thuận hoàn tiền'
                  : 'Chấp thuận hủy dịch vụ'
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
          {pending.assigned_to === 'VENDOR' ? 'Đối tác' : 'Bộ phận Quản lý (Manager)'} đang xem xét yêu cầu của bạn. Trạng thái đơn sẽ được cập nhật ngay khi được xử lý.
        </p>
      )}
      {!vendor && !pending && !booking.can_request_cancellation && booking.status !== 'CANCELLED' && booking.status !== 'REFUNDED' && (
        <p className="text-sm text-slate-500 mt-4">
          Đơn này hiện không đủ điều kiện gửi yêu cầu hủy, đổi ngày hoặc hoàn tiền.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-rose-600 mt-3">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-700 mt-3">{success}</p>}
    </section>
  );
}
