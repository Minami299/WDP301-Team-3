import { money } from '../utils/attractionUi';
import { bookingTime } from '../utils/bookingUi';

// Shown once the SePay webhook has confirmed the transfer.
export default function PaymentSuccess({ booking }) {
  const payment = booking.payments?.find(p => p.status === 'SUCCESS');
  const hotel = booking.details?.some(d => d.check_in_date);
  return <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7 text-center">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
    </div>
    <h2 className="text-xl font-bold text-emerald-900">{hotel ? 'Đặt phòng thành công!' : 'Mua vé thành công!'}</h2>
    <p className="mt-1 text-sm text-emerald-800">Travelio đã nhận được thanh toán của bạn. Đơn {booking.booking_code} đã được xác nhận{hotel ? '.' : ' và vé điện tử đã sẵn sàng bên dưới.'}</p>
    {payment && <dl className="mx-auto mt-4 grid max-w-sm grid-cols-[130px_1fr] gap-1 text-left text-sm"><dt className="text-emerald-700">Số tiền</dt><dd className="font-semibold">{money(payment.amount)}</dd><dt className="text-emerald-700">Thời gian</dt><dd className="font-semibold">{bookingTime(payment.payment_date)}</dd>{payment.reference_code && <><dt className="text-emerald-700">Mã giao dịch</dt><dd className="font-semibold break-all">{payment.reference_code}</dd></>}</dl>}
  </section>;
}
