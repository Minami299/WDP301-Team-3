import { useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import {
  cancellationStatus,
  cancellationStatusBadgeClass,
  requestTypeLabel,
  bookingTime,
  formatDate
} from '../utils/bookingUi';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

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
  const isRoomBooking = booking.details?.some(
    d => d.service_type === 'ROOM' || d.facility_type === 'HOTEL' || Boolean(d.check_in_date)
  ) ?? true;
  const estimatedRefundAmount = policy?.refundAmount !== undefined ? policy.refundAmount : (booking.final_amount || 0);
  const estimatedRefundPoints = Math.floor((estimatedRefundAmount || 0) / 1000) + (booking.points_redeemed || 0);

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
        setError('Vui lòng nhập số điện thoại liên hệ trực tiếp để xác nhận hoàn tiền.');
        return;
      }
      if (refundMethod === 'BANK_TRANSFER' && (!bankName.trim() || !accountNumber.trim() || !accountName.trim())) {
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
            refund_bank_name: refundMethod === 'BANK_TRANSFER' ? bankName.trim() : undefined,
            refund_account_number: refundMethod === 'BANK_TRANSFER' ? accountNumber.trim() : undefined,
            refund_account_name: refundMethod === 'BANK_TRANSFER' ? accountName.trim().toUpperCase() : undefined,
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
          : requestType === 'CHANGE_DATE'
          ? 'Đã gửi yêu cầu đổi ngày đến Đối tác cung cấp dịch vụ.'
          : 'Đã gửi yêu cầu đến Bộ phận Quản lý (Manager) để xử lý hoàn tiền.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const currentServiceDate = booking.details?.[0]?.check_in_date || booking.details?.[0]?.visit_date;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 mt-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-lg text-slate-900">
            {isRoomBooking ? 'Yêu cầu hủy phòng, đổi ngày & hoàn tiền' : 'Yêu cầu hủy vé, đổi ngày & hoàn tiền'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi lịch sử xử lý hoặc gửi yêu cầu thay đổi cho đơn đặt chỗ này.
          </p>
        </div>
        {policy && !vendor && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            policy.policy === 'FREE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : policy.policy === 'PARTIAL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {policy.label}
          </span>
        )}
      </div>

      {!history.length && (
        <p className="text-sm text-slate-500 mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
          Chưa có yêu cầu hủy, đổi ngày hoặc hoàn tiền nào được gửi cho đơn này.
        </p>
      )}

      {history.length > 0 && (
        <ol className="space-y-3 mt-4">
          {history.map(r => (
            <li key={r._id} className="rounded-xl bg-slate-50/80 p-4 text-sm border border-slate-200/80">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    r.type === 'REFUND'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.type === 'CHANGE_DATE'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {requestTypeLabel(r.type, isRoomBooking)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cancellationStatusBadgeClass(r.status)}`}>
                    {cancellationStatus(r.status)}
                  </span>
                  <span className="text-xs text-slate-500">
                    · Phụ trách: <strong>{r.assigned_to === 'VENDOR' ? 'Đối tác cơ sở' : 'Bộ phận Quản lý (Manager)'}</strong>
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{bookingTime(r.requested_at)}</span>
              </div>

              {r.type === 'CHANGE_DATE' && r.new_date && (
                <div className="mt-2.5 inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  {currentServiceDate && (
                    <>
                      <span>Ngày cũ: {formatDate(currentServiceDate)}</span>
                      <span>→</span>
                    </>
                  )}
                  <span className="text-primary-700 font-bold">Ngày mới yêu cầu: {formatDate(r.new_date)}</span>
                </div>
              )}

              <p className="mt-2.5 whitespace-pre-wrap break-words text-slate-700">
                <span className="font-semibold text-slate-900">Lý do:</span> {r.reason}
              </p>

              {(r.type === 'REFUND' || r.type === 'CANCEL') && (r.refund_bank_name || r.refund_method) && (
                <div className="mt-3 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      Hình thức hoàn tiền: <strong>{r.refund_method === 'POINTS' ? 'Quy đổi Điểm thưởng thành viên' : 'Chuyển khoản Ngân hàng'}</strong>
                    </div>
                    {r.refund_points_amount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                        Đã cộng +{r.refund_points_amount.toLocaleString('vi-VN')} điểm
                      </span>
                    )}
                  </div>
                  {r.refund_amount !== undefined && r.policy_applied && (
                    <div>
                      Số tiền hoàn theo chính sách: <strong className="text-emerald-700">{(r.refund_amount || 0).toLocaleString('vi-VN')} đ</strong>
                      {' '}(phí hủy <span className="text-rose-600 font-semibold">{(r.cancellation_fee || 0).toLocaleString('vi-VN')} đ</span>)
                    </div>
                  )}
                  {r.refund_method === 'BANK_TRANSFER' && r.refund_bank_name && (
                    <div className="text-slate-600 pt-1 border-t border-slate-100">
                      Ngân hàng: <strong>{r.refund_bank_name}</strong> · STK: <span className="font-mono text-slate-900 font-bold">{r.refund_account_number}</span> · Chủ TK: <strong>{r.refund_account_name}</strong>
                    </div>
                  )}
                  {r.paid_reference && (
                    <div className="pt-1 border-t border-slate-100 text-primary-700">
                      Mã giao dịch hoàn tiền: <strong className="font-mono">{r.paid_reference}</strong>
                    </div>
                  )}
                </div>
              )}

              {(r.processed_at || r.decision_reason) && (
                <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  {r.processed_at && (
                    <p className="text-xs text-slate-500">
                      {r.assigned_to === 'VENDOR' ? 'Đối tác' : 'Manager'} đã xử lý lúc <span className="font-mono">{bookingTime(r.processed_at)}</span>
                    </p>
                  )}
                  {r.decision_reason && (
                    <p className="text-xs whitespace-pre-wrap break-words text-slate-800">
                      <span className="font-semibold">Phản hồi:</span> {r.decision_reason}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {(vendor ? pending && booking.can_process_cancellation : booking.can_request_cancellation) && (
        <form
          className="mt-6 border-t border-slate-100 pt-6"
          onSubmit={e => {
            e.preventDefault();
            submit(vendor ? 'APPROVED' : undefined);
          }}
        >
          {vendor ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-amber-950">
                  Yêu cầu đang chờ duyệt: {requestTypeLabel(pending?.type, isRoomBooking)}
                </h3>
                <span className="text-xs font-mono text-amber-800">
                  Gửi lúc: {bookingTime(pending?.requested_at)}
                </span>
              </div>

              {pending?.type === 'CHANGE_DATE' && pending?.new_date && (
                <div className="grid sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Ngày sử dụng hiện tại</span>
                    <strong className="text-sm text-slate-800">
                      {currentServiceDate ? formatDate(currentServiceDate) : 'Chưa xác định'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-primary-600 font-semibold block">Ngày mới khách muốn đổi sang</span>
                    <strong className="text-sm text-primary-700">
                      {formatDate(pending.new_date)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="text-sm text-amber-900 bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <span className="font-semibold">Lý do khách hàng: </span>
                {pending?.reason}
              </div>

              {(pending?.type === 'REFUND' || pending?.type === 'CANCEL') && (
                <div className="pt-2 border-t border-amber-200/80 text-xs text-amber-900 space-y-2">
                  <div>
                    <strong>Hình thức hoàn tiền khách chọn: </strong>
                    <span className="font-bold text-primary-700">
                      {pending?.refund_method === 'POINTS' ? 'Quy đổi Điểm thưởng thành viên' : 'Chuyển khoản Ngân hàng'}
                    </span>
                  </div>
                  {pending?.refund_method === 'POINTS' ? (
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-amber-200">
                      Hệ thống sẽ <strong>tự động tính và cộng điểm thưởng</strong> trực tiếp vào tài khoản của khách ngay khi bạn nhấn chấp thuận.
                    </p>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
                      <div>Ngân hàng: <strong>{pending?.refund_bank_name || 'Chưa cung cấp'}</strong></div>
                      <div>Số tài khoản: <strong className="font-mono text-sm">{pending?.refund_account_number || 'Chưa cung cấp'}</strong></div>
                      <div>Chủ tài khoản: <strong>{pending?.refund_account_name || 'Chưa cung cấp'}</strong></div>
                      <div>
                        Số tiền cần hoàn: <strong className="text-emerald-700">{(pending?.refund_amount !== undefined ? pending.refund_amount : (booking.final_amount || 0)).toLocaleString('vi-VN')} đ</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 mb-5">
              <div>
                <span className="block text-sm font-semibold text-slate-800 mb-2.5">
                  Chọn loại yêu cầu bạn muốn gửi *
                </span>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      value: 'CANCEL',
                      title: isRoomBooking ? 'Hủy phòng & hoàn tiền' : 'Hủy vé & hoàn tiền',
                      desc: 'Hủy đơn đặt chỗ và nhận tiền hoàn theo chính sách hiện hành'
                    },
                    {
                      value: 'CHANGE_DATE',
                      title: isRoomBooking ? 'Đổi ngày nhận phòng' : 'Đổi ngày tham quan',
                      desc: 'Giữ nguyên đơn đặt chỗ và đề xuất dời sang ngày sử dụng mới'
                    },
                    {
                      value: 'REFUND',
                      title: 'Yêu cầu hoàn tiền',
                      desc: 'Gửi yêu cầu hoàn tiền cho đơn gặp sự cố hoặc theo thỏa thuận'
                    }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setRequestType(opt.value)}
                      className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
                        requestType === opt.value
                          ? 'border-primary-600 bg-primary-50/70 ring-1 ring-primary-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`text-sm font-bold ${requestType === opt.value ? 'text-primary-800' : 'text-slate-800'}`}>
                        {opt.title}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

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
                          <span className="text-[11px] text-slate-500 block">
                            {isRoomBooking ? 'Tổng tiền phòng' : 'Tổng tiền đơn'}
                          </span>
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
                          : <>* Yêu cầu này sẽ được chuyển đến <strong>Bộ phận Quản lý (Manager)</strong> để xác nhận và hoàn trả theo hình thức bạn chọn bên dưới.</>}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Thông tin liên hệ trực tiếp & hình thức nhận hoàn tiền</h3>
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
                          placeholder="Số điện thoại để Manager liên hệ xác nhận"
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

                    <div className="pt-1">
                      <span className="block text-xs font-semibold text-slate-700 mb-2">Hình thức nhận hoàn tiền *</span>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRefundMethod('BANK_TRANSFER')}
                          className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                            refundMethod === 'BANK_TRANSFER'
                              ? 'border-primary-600 bg-primary-50 text-primary-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-sm">Chuyển khoản Ngân hàng</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Nhận tiền hoàn trực tiếp vào số tài khoản ngân hàng</div>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRefundMethod('POINTS')}
                          className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                            refundMethod === 'POINTS'
                              ? 'border-primary-600 bg-primary-50 text-primary-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-sm">Quy đổi Điểm thưởng thành viên</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Nhận ngay khoảng <strong>{estimatedRefundPoints.toLocaleString('vi-VN')} điểm</strong> vào ví khi duyệt
                          </div>
                        </button>
                      </div>
                    </div>

                    {refundMethod === 'BANK_TRANSFER' ? (
                      <div className="grid sm:grid-cols-3 gap-3 pt-1">
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
                    ) : (
                      <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        Khi yêu cầu được duyệt, hệ thống sẽ tự động quy đổi số tiền hoàn dự kiến thành <strong>{estimatedRefundPoints.toLocaleString('vi-VN')} điểm thưởng</strong> và cộng trực tiếp vào tài khoản của bạn.
                      </p>
                    )}
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
                    min={TODAY_ISO}
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
        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900">
          <strong>Yêu cầu đang chờ xử lý:</strong>{' '}
          {pending.assigned_to === 'VENDOR' ? 'Đối tác cung cấp dịch vụ' : 'Bộ phận Quản lý (Manager)'} đang xem xét yêu cầu của bạn. Trạng thái đơn sẽ tự động cập nhật ngay khi có kết quả.
        </div>
      )}
      {!vendor && !pending && !booking.can_request_cancellation && booking.status !== 'CANCELLED' && booking.status !== 'REFUNDED' && (
        <p className="text-sm text-slate-500 mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
          Đơn này hiện không đủ điều kiện gửi yêu cầu hủy, đổi ngày hoặc hoàn tiền.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5 mt-4">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mt-4">
          {success}
        </p>
      )}
    </section>
  );
}
