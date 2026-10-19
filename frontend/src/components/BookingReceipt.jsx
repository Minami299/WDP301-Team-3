import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { money } from '../utils/attractionUi';
import { ageLabel } from '../utils/ticketTypes';
import { bookingTime, formatDate } from '../utils/bookingUi';
import {
  detailDate,
  detailQuantity,
  serviceType,
  serviceTypeLabel,
  tripStatusClass,
  tripStatusLabel,
} from '../utils/tripManagement';

const paymentStatusLabel = (status) =>
  ({
    SUCCESS: 'Thành công',
    PENDING: 'Đang xử lý',
    FAILED: 'Không thành công',
    REFUNDED: 'Đã hoàn tiền',
  })[status] || status;

function ReceiptContent({ booking }) {
  return (
    <>
      <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Travelio · Booking Receipt
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Biên nhận đặt chỗ
          </h2>
          <p className="mt-2 break-all text-sm font-semibold text-slate-700">
            {booking.booking_code || booking._id}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ngày đặt: {bookingTime(booking.created_at) || 'Chưa có dữ liệu'}
          </p>
        </div>
        <span
          className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${tripStatusClass(booking.status)}`}
        >
          {tripStatusLabel(booking.status)}
        </span>
      </div>
      <section className="py-5">
        <h3 className="font-semibold text-slate-900">Thông tin khách hàng</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ['Họ tên', booking.guest_name],
            ['Số điện thoại', booking.guest_phone],
            ['Email', booking.guest_email],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-slate-800">
                {value || 'Chưa có dữ liệu'}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="mb-3 font-semibold text-slate-900">
          Thông tin đặt dịch vụ
        </h3>
        <div className="space-y-3">
          {(booking.details || []).map((detail) => (
            <div
              key={detail._id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <p className="text-xs font-medium text-blue-600">
                {serviceTypeLabel(detail)}
              </p>
              <h4 className="mt-1 font-semibold text-slate-900">
                {detail.facility_name || 'Chưa có thông tin cơ sở'}
              </h4>
              <p className="mt-1 text-sm text-slate-700">
                {serviceType(detail) === 'HOTEL' ? 'Loại phòng' : 'Dịch vụ'}:{' '}
                {detail.service_name || detail.ticket_name || 'Chưa có dữ liệu'}
              </p>
              {detail.ticket_name &&
                detail.ticket_name !== detail.service_name && (
                  <p className="mt-1 text-sm text-slate-700">
                    Hạng vé: {detail.ticket_name}
                  </p>
                )}
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">
                    {serviceType(detail) === 'HOTEL'
                      ? 'Nhận phòng'
                      : 'Ngày sử dụng'}
                  </dt>
                  <dd>{formatDate(detailDate(detail)) || 'Chưa có dữ liệu'}</dd>
                </div>
                {serviceType(detail) === 'HOTEL' && (
                  <div>
                    <dt className="text-xs text-slate-500">Trả phòng</dt>
                    <dd>
                      {formatDate(detail.check_out_date) || 'Chưa có dữ liệu'}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-slate-500">Số lượng</dt>
                  <dd>
                    {detailQuantity(detail)}
                    {detail.nights ? ` · ${detail.nights} đêm` : ''}
                  </dd>
                </div>
                {detail.time_slot && (
                  <div>
                    <dt className="text-xs text-slate-500">Khung giờ</dt>
                    <dd>{detail.time_slot}</dd>
                  </div>
                )}
              </dl>
              {serviceType(detail) !== 'HOTEL' && (
                <p className="mt-2 text-xs text-slate-500">
                  {ageLabel(detail)}
                </p>
              )}
              {detail.ticket_description && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                  {detail.ticket_description}
                </p>
              )}
              {detail.ticket_conditions && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                  Điều kiện: {detail.ticket_conditions}
                </p>
              )}
              <p className="mt-3 text-sm text-slate-700">
                {detail.quantity} × {money(detail.unit_price)} ={' '}
                <strong>{money(detail.quantity * detail.unit_price)}</strong>
                {serviceType(detail) === 'HOTEL' && detail.nights && (
                  <span className="ml-1 text-xs text-slate-500">
                    (đơn giá / phòng cho {detail.nights} đêm)
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt>Giá dịch vụ</dt>
          <dd>{money(booking.total_amount)}</dd>
        </div>
        {booking.promotion_discount_amount > 0 && (
          <div className="flex justify-between gap-3">
            <dt>Giảm giá khuyến mãi</dt>
            <dd>−{money(booking.promotion_discount_amount)}</dd>
          </div>
        )}
        {booking.points_discount_amount > 0 && (
          <div className="flex justify-between gap-3">
            <dt>Giảm bằng điểm</dt>
            <dd>−{money(booking.points_discount_amount)}</dd>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-3 text-lg font-bold">
          <dt>Tổng tiền</dt>
          <dd className="text-blue-700">{money(booking.final_amount)}</dd>
        </div>
      </dl>
      <section className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">Thông tin thanh toán</h3>
        {booking.payments?.length ? (
          <ul className="mt-3 space-y-3">
            {booking.payments.map((payment) => (
              <li
                key={payment._id || payment.transaction_id}
                className="rounded-xl border border-slate-200 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {payment.payment_gateway} ·{' '}
                    {paymentStatusLabel(payment.status)}
                  </strong>
                  <span>{money(payment.amount)}</span>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">
                  Mã giao dịch: {payment.transaction_id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {bookingTime(payment.payment_date)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Chưa có giao dịch thanh toán được ghi nhận trong dữ liệu đơn.
          </p>
        )}
      </section>
      {booking.status === 'PENDING' && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Đơn đang chờ thanh toán.
          {booking.expires_at &&
            ` Thời hạn giữ chỗ: ${bookingTime(booking.expires_at)}.`}
        </p>
      )}
      <p className="mt-5 text-xs text-slate-500">
        Giá và điều kiện theo dữ liệu đặt chỗ đã lưu. Đây là biên nhận đặt chỗ,
        không phải hóa đơn thuế.
      </p>
    </>
  );
}

export default function BookingReceipt({ booking, showLinks = true }) {
  return (
    <>
      <article className="min-w-0 break-words rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <ReceiptContent booking={booking} />
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-blue-200 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
          >
            In / Lưu PDF biên nhận
          </button>
          {showLinks && (
            <>
              <Link to={`/my-trips/${booking._id}`} className="text-blue-600">
                Xem chi tiết
              </Link>
              <Link to="/my-trips" className="text-blue-600">
                Lịch sử đặt chỗ
              </Link>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Chọn “Lưu dưới dạng PDF” trong hộp thoại in để tải biên nhận.
        </p>
      </article>
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="travelio-print-receipt">
            <ReceiptContent booking={booking} />
          </div>,
          document.body,
        )}
    </>
  );
}
