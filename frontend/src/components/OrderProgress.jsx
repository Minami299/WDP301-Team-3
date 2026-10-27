import { bookingTime, orderStatus } from '../utils/bookingUi';
import { money } from '../utils/attractionUi';

const TONES = {
  PENDING: 'border-amber-200 bg-amber-50',
  CONFIRMED: 'border-emerald-200 bg-emerald-50',
  COMPLETED: 'border-emerald-200 bg-emerald-50',
  CANCELLED: 'border-slate-200 bg-slate-50',
  REFUNDED: 'border-slate-200 bg-slate-50',
};

const HEADLINES = {
  PENDING: 'Đơn đang chờ thanh toán',
  CONFIRMED: 'Đã thanh toán, đơn được xác nhận',
  COMPLETED: 'Đơn đã hoàn tất',
  CANCELLED: 'Đơn đã hủy',
  REFUNDED: 'Đơn đã hoàn tiền',
};

const latestSuccess = (payments = []) =>
  payments
    .filter((payment) => payment.status === 'SUCCESS')
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

// Order timeline: when it was placed, when it was paid, and what happens next.
export default function OrderProgress({ booking }) {
  const paid = latestSuccess(booking.payments);
  const rejected = (booking.payments || []).filter((payment) => payment.status === 'FAILED' && payment.note);
  const rows = [
    ['Mã đơn', <span key="code" className="font-mono">{booking.booking_code}</span>],
    ['Đặt lúc', bookingTime(booking.created_at)],
  ];
  if (paid) {
    rows.push(
      ['Thanh toán lúc', <strong key="at">{bookingTime(paid.payment_date)}</strong>],
      ['Số tiền đã nhận', money(paid.amount)],
      ['Mã giao dịch', <span key="ref" className="break-all font-mono">{paid.reference_code || paid.transaction_id}</span>],
    );
  } else if (booking.status === 'PENDING' && booking.expires_at) {
    rows.push(['Hạn thanh toán', bookingTime(booking.expires_at)]);
  }
  if (booking.status === 'CANCELLED' && booking.decision_note) rows.push(['Lý do hủy', booking.decision_note]);

  return (
    <section aria-labelledby="order-progress-title" className={`rounded-2xl border p-5 sm:p-6 ${TONES[booking.status] || TONES.CANCELLED}`}>
      <h2 id="order-progress-title" className="text-lg font-bold text-slate-900">{HEADLINES[booking.status] || orderStatus(booking.status)}</h2>
      <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {rejected.map((payment) => (
        <p key={payment._id || payment.transaction_id} role="alert" className="mt-3 text-sm text-rose-700">
          Giao dịch {money(payment.amount)} chưa được tính: {payment.note}
        </p>
      ))}
    </section>
  );
}
