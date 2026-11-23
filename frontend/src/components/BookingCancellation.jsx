import { useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import {
  cancellationStatus,
  cancellationStatusBadgeClass,
  requestTypeLabel,
  bookingTime,
  formatDate,
  VIETNAMESE_BANKS,
  CANCELLATION_REASONS
} from '../utils/bookingUi';
import { IconX, IconAlertTriangle } from './Icons';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export default function BookingCancellation({
  booking,
  vendor = false,
  onUpdated,
  isOpen,
  onClose
}) {
  const [requestType, setRequestType] = useState('CANCEL');
  const [newDate, setNewDate] = useState('');
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [customReasonNote, setCustomReasonNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('BANK_TRANSFER');
  const [contactName, setContactName] = useState(booking.guest_name || '');
  const [contactPhone, setContactPhone] = useState(booking.guest_phone || '');
  const [contactEmail, setContactEmail] = useState(booking.guest_email || '');
  const [bankName, setBankName] = useState(VIETNAMESE_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
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
  const basePoints = Math.floor((estimatedRefundAmount || 0) / 1000);
  const bonusPoints = Math.round(basePoints * 0.05);
  const estimatedRefundPoints = basePoints + bonusPoints + (booking.points_redeemed || 0);

  if (isOpen !== undefined && !isOpen) {
    return null;
  }

  const submit = async (status) => {
    if (sending.current) return;
    setError('');
    setSuccess('');

    const finalReason = vendor
      ? customReasonNote.trim()
      : selectedReason.startsWith('Khác')
      ? (customReasonNote.trim() || 'Lý do khác')
      : customReasonNote.trim()
      ? `${selectedReason} - ${customReasonNote.trim()}`
      : selectedReason;

    if (!vendor && !finalReason.trim()) {
      setError('Vui lòng chọn hoặc nhập lý do.');
      return;
    }
    if (finalReason.length > 1000) {
      setError('Lý do không được vượt quá 1000 ký tự.');
      return;
    }
    if (!vendor && requestType === 'CHANGE_DATE' && !newDate) {
      setError('Vui lòng chọn ngày mới cần đổi.');
      return;
    }

    const finalBankName = bankName === 'Khác' ? customBankName.trim() : bankName;

    if (!vendor && (requestType === 'CANCEL' || requestType === 'REFUND')) {
      if (policy && policy.cancellable === false) {
        setError('Đơn còn dưới 24 giờ trước thời gian sử dụng nên không thể hủy hoặc hoàn tiền theo chính sách.');
        return;
      }
      if (!contactPhone.trim()) {
        setError('Vui lòng nhập số điện thoại liên hệ trực tiếp để xác nhận hoàn tiền.');
        return;
      }
      if (refundMethod === 'BANK_TRANSFER' && (!finalBankName.trim() || !accountNumber.trim() || !accountName.trim())) {
        setError('Vui lòng chọn Tên ngân hàng, nhập Số tài khoản và Tên chủ tài khoản nhận hoàn tiền.');
        return;
      }
    }

    sending.current = true;
    setBusy(true);
    try {
      const result = vendor
        ? await bookingApi.decideCancellation(booking._id, pending._id, { status, reason: finalReason })
        : await bookingApi.requestCancellation(booking._id, {
            reason: finalReason,
            type: requestType,
            new_date: requestType === 'CHANGE_DATE' ? newDate : undefined,
            refund_method: refundMethod,
            refund_bank_name: refundMethod === 'BANK_TRANSFER' ? finalBankName : undefined,
            refund_account_number: refundMethod === 'BANK_TRANSFER' ? accountNumber.trim() : undefined,
            refund_account_name: refundMethod === 'BANK_TRANSFER' ? accountName.trim().toUpperCase() : undefined,
            contact_name: contactName.trim(),
            contact_phone: contactPhone.trim(),
            contact_email: contactEmail.trim(),
            request_id: requestId.current
          });

      onUpdated(result.data);
      setCustomReasonNote('');
      setNewDate('');
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

  const content = (
    <div className="space-y-5">
      {/* Policy Banner */}
      {policy && !vendor && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          policy.policy === 'FREE'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : policy.policy === 'PARTIAL'
            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
            : 'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Chính sách áp dụng:</span>
              <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-white border border-current">
                {policy.label}
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-600 leading-relaxed">
              {policy.policy === 'FREE'
                ? 'Đơn đủ điều kiện hoàn tiền 100% theo chính sách linh hoạt trước 72 giờ.'
                : policy.policy === 'PARTIAL'
                ? 'Hủy trong khoảng từ 24h đến 72h trước ngày sử dụng áp dụng mức phí hủy 30%.'
                : 'Đơn trong vòng 24 giờ trước thời gian sử dụng sẽ không được hoàn phí.'}
            </p>
          </div>
        </div>
      )}

      {/* History of existing requests */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Lịch sử yêu cầu thay đổi
          </h3>
          <ol className="space-y-3">
            {history.map(r => (
              <li key={r._id} className="rounded-xl bg-slate-50 p-4 text-sm border border-slate-200 space-y-2">
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
                      · Phụ trách: <strong>{r.assigned_to === 'VENDOR' ? 'Đối tác cơ sở' : 'Bộ phận Quản lý'}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{bookingTime(r.requested_at)}</span>
                </div>

                {r.type === 'CHANGE_DATE' && r.new_date && (
                  <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    {currentServiceDate && <span>Ngày cũ: {formatDate(currentServiceDate)} →</span>}
                    <span className="text-primary-700 font-bold">Ngày mới: {formatDate(r.new_date)}</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap break-words text-slate-700 text-xs">
                  <span className="font-semibold text-slate-900">Lý do:</span> {r.reason}
                </p>

                {(r.type === 'REFUND' || r.type === 'CANCEL') && (r.refund_bank_name || r.refund_method) && (
                  <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>Hình thức: <strong>{r.refund_method === 'POINTS' ? 'Điểm thưởng thành viên' : 'Chuyển khoản Ngân hàng'}</strong></div>
                      {r.refund_points_amount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                          Đã cộng +{r.refund_points_amount.toLocaleString('vi-VN')} điểm
                        </span>
                      )}
                    </div>
                    {r.refund_amount !== undefined && (
                      <div>
                        Số tiền hoàn: <strong className="text-emerald-700">{(r.refund_amount || 0).toLocaleString('vi-VN')} đ</strong>
                        {r.cancellation_fee > 0 && ` (Phí hủy: ${(r.cancellation_fee || 0).toLocaleString('vi-VN')} đ)`}
                      </div>
                    )}
                    {r.refund_method === 'BANK_TRANSFER' && r.refund_bank_name && (
                      <div className="text-slate-600 pt-1 border-t border-slate-100">
                        {r.refund_bank_name} · STK: <span className="font-mono font-bold text-slate-800">{r.refund_account_number}</span> · {r.refund_account_name}
                      </div>
                    )}
                  </div>
                )}

                {(r.processed_at || r.decision_reason) && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                    {r.processed_at && (
                      <p className="text-slate-500">
                        Đã xử lý lúc <span className="font-mono">{bookingTime(r.processed_at)}</span>
                      </p>
                    )}
                    {r.decision_reason && (
                      <p className="text-slate-800">
                        <span className="font-semibold">Phản hồi:</span> {r.decision_reason}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Main Form */}
      {(vendor ? pending && booking.can_process_cancellation : booking.can_request_cancellation) && (
        <form
          className="border-t border-slate-100 pt-5 space-y-5"
          onSubmit={e => {
            e.preventDefault();
            submit(vendor ? 'APPROVED' : undefined);
          }}
        >
          {vendor ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-amber-950">
                Yêu cầu đang chờ duyệt: {requestTypeLabel(pending?.type, isRoomBooking)}
              </h3>
              {pending?.type === 'CHANGE_DATE' && pending?.new_date && (
                <div className="grid sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Ngày hiện tại:</span>
                    <strong className="text-sm text-slate-800">
                      {currentServiceDate ? formatDate(currentServiceDate) : 'Chưa xác định'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-primary-600 font-semibold block">Khách muốn đổi sang:</span>
                    <strong className="text-sm text-primary-700">
                      {formatDate(pending.new_date)}
                    </strong>
                  </div>
                </div>
              )}
              <div className="text-sm text-amber-900 bg-white/80 p-3 rounded-xl border border-amber-200/70">
                <span className="font-semibold">Lý do từ khách hàng: </span>
                {pending?.reason}
              </div>
            </div>
          ) : (
            <>
              {/* Type selector */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  1. Chọn loại yêu cầu *
                </span>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'CANCEL',
                      title: isRoomBooking ? 'Hủy phòng & hoàn tiền' : 'Hủy vé & hoàn tiền',
                      desc: 'Hủy đơn theo chính sách hoàn tiền hiện hành'
                    },
                    {
                      value: 'CHANGE_DATE',
                      title: isRoomBooking ? 'Đổi ngày lưu trú' : 'Đổi ngày tham quan',
                      desc: 'Đề xuất đổi sang ngày nhận phòng mới'
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

              {/* Refund breakdown for CANCEL */}
              {requestType === 'CANCEL' && policy && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <span>Chiết tính hoàn tiền dự kiến</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {policy.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">Tổng tiền đơn</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block mt-0.5">
                        {(booking.final_amount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-rose-500 block">Phí hủy ({policy.feePercent}%)</span>
                      <span className="font-bold text-xs sm:text-sm text-rose-600 block mt-0.5">
                        -{(policy.feeAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-[11px] text-emerald-700 block font-semibold">Tiền hoàn dự kiến</span>
                      <span className="font-extrabold text-xs sm:text-sm text-emerald-700 block mt-0.5">
                        {(policy.refundAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Change Selector */}
              {requestType === 'CHANGE_DATE' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Ngày mới mong muốn đổi sang *
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      required
                      value={newDate}
                      min={TODAY_ISO}
                      onChange={e => setNewDate(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <p className="text-[11px] text-slate-500">
                    * Yêu cầu đổi ngày sẽ được gửi trực tiếp đến Đối tác cơ sở lưu trú để đối soát tình trạng phòng trống.
                  </p>
                </div>
              )}

              {/* Reason Selector */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  2. Lý do yêu cầu *
                </span>
                <select
                  className={`${inputClass} mb-2`}
                  value={selectedReason}
                  onChange={e => setSelectedReason(e.target.value)}
                  disabled={busy}
                >
                  {CANCELLATION_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
                <textarea
                  className={inputClass}
                  rows={2}
                  maxLength={1000}
                  placeholder="Ghi chú chi tiết thêm nếu có..."
                  value={customReasonNote}
                  onChange={e => setCustomReasonNote(e.target.value)}
                  disabled={busy}
                />
              </div>

              {/* Refund Method & Contact details */}
              {requestType === 'CANCEL' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. Hình thức nhận tiền hoàn & Thông tin liên hệ
                  </span>

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
                      <div className="text-[11px] text-slate-500 mt-0.5">Hoàn tiền vào số tài khoản ngân hàng của bạn</div>
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
                      <div className="font-bold text-sm flex items-center justify-between">
                        <span>Điểm thưởng thành viên</span>
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">+5% Thưởng</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Nhận ngay khoảng <strong>{estimatedRefundPoints.toLocaleString('vi-VN')} điểm</strong> vào ví
                      </div>
                    </button>
                  </div>

                  {refundMethod === 'BANK_TRANSFER' ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <label className="block text-xs font-semibold text-slate-700">
                          Tên ngân hàng *
                          <select
                            className={`${inputClass} mt-1`}
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                            disabled={busy}
                          >
                            {VIETNAMESE_BANKS.map((b, i) => (
                              <option key={i} value={b}>{b}</option>
                            ))}
                            <option value="Khác">Ngân hàng khác...</option>
                          </select>
                        </label>
                        {bankName === 'Khác' && (
                          <label className="block text-xs font-semibold text-slate-700">
                            Nhập tên ngân hàng khác *
                            <input
                              type="text"
                              required
                              placeholder="VD: Public Bank, Shinhan..."
                              className={`${inputClass} mt-1`}
                              value={customBankName}
                              onChange={e => setCustomBankName(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                        )}
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
                  ) : (
                    <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 leading-relaxed">
                      Lựa chọn điểm thưởng sẽ được cộng trực tiếp vào tài khoản của bạn ngay khi được phê duyệt, bao gồm ưu đãi <strong>+5% giá trị quy đổi</strong>.
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700">
                      Họ tên người nhận liên hệ *
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
                      Số điện thoại liên hệ xác nhận *
                      <input
                        type="tel"
                        required
                        placeholder="Số điện thoại"
                        className={`${inputClass} mt-1`}
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error and Success display */}
          {error && (
            <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <IconAlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              {success}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {isOpen !== undefined && (
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
            )}
            <button
              disabled={busy}
              type="submit"
              className={`${buttonClass} text-xs py-2.5 px-5`}
            >
              {busy
                ? 'Đang xử lý...'
                : vendor
                ? pending?.type === 'CHANGE_DATE'
                  ? 'Chấp thuận đổi ngày'
                  : 'Chấp thuận hoàn tiền'
                : 'Xác nhận gửi yêu cầu'}
            </button>
            {vendor && (
              <button
                type="button"
                disabled={busy}
                onClick={() => submit('REJECTED')}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                Từ chối yêu cầu
              </button>
            )}
          </div>
        </form>
      )}

      {!vendor && pending && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Yêu cầu đang chờ xử lý:</strong>{' '}
          {pending.assigned_to === 'VENDOR' ? 'Đối tác cung cấp dịch vụ' : 'Bộ phận Quản lý'} đang xem xét yêu cầu của bạn.
        </div>
      )}
    </div>
  );

  // If used as modal
  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          className="relative bg-white rounded-2xl max-w-2xl w-full my-auto max-h-[92vh] flex flex-col shadow-2xl border border-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                {isRoomBooking ? 'Yêu cầu hủy phòng / Đổi lịch lưu trú' : 'Yêu cầu hủy vé / Đổi ngày tham quan'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã đơn: <strong className="font-mono text-slate-700">{booking.booking_code || booking._id}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Đóng"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 flex-1">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // If used inline (e.g. for vendor in AttractionOrdersPage)
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 mt-5 shadow-sm">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="font-bold text-lg text-slate-900">
          Xử lý yêu cầu hủy / đổi dịch vụ
        </h2>
      </div>
      <div className="pt-4">
        {content}
      </div>
    </section>
  );
}
