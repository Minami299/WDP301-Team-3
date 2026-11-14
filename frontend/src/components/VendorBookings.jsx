import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api/bookingApi';
import { money } from '../utils/attractionUi';
import {
  orderStatus,
  orderStatusBadgeClass,
  cancellationStatus,
  cancellationStatusBadgeClass,
  requestTypeLabel,
  formatDate
} from '../utils/bookingUi';

export default function VendorBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    bookingApi
      .vendorList()
      .then(r => {
        if (active) {
          setBookings(r.data);
          setError('');
        }
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mt-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Đơn đặt dịch vụ gần đây của khách hàng</h2>
          <Link to="/vendor/orders" className="inline-block text-xs font-semibold text-primary-600 hover:text-primary-700 mt-1">
            Mở danh sách toàn bộ đơn & xử lý yêu cầu hủy / đổi ngày →
          </Link>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          onClick={() => setRevision(x => x + 1)}
        >
          Tải lại
        </button>
      </div>

      {error && (
        <p role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm mt-4">
          {error}
        </p>
      )}

      {!bookings ? (
        <p className="text-sm text-slate-500 mt-4">Đang tải danh sách đơn...</p>
      ) : !bookings.length ? (
        <p className="text-sm text-slate-500 mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
          Chưa có đơn đặt dịch vụ nào.
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {bookings.map(b => {
            const latestReq = b.cancellation_requests?.at(-1);
            const isRoom = b.details?.some(d => d.service_type === 'ROOM' || d.facility_type === 'HOTEL' || Boolean(d.check_in_date));
            return (
              <div key={b._id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/vendor/orders/${b._id}`} className="text-primary-700 font-bold text-sm font-mono hover:underline">
                        {b.booking_code}
                      </Link>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${orderStatusBadgeClass(b.status)}`}>
                        {orderStatus(b.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {b.guest_name} · <span className="font-mono">{b.guest_phone}</span>
                    </p>
                  </div>
                  <strong className="text-primary-700 font-mono text-sm">{money(b.final_amount)}</strong>
                </div>

                <div className="space-y-1 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {b.details.map(d => (
                    <p key={d._id} className="text-xs text-slate-700 flex flex-wrap justify-between gap-2">
                      <span>
                        {d.ticket_name && d.ticket_name !== d.service_name
                          ? `${d.service_name} · ${d.ticket_name}`
                          : d.service_name}
                        {(d.check_in_date || d.visit_date) && (
                          <span className="text-slate-500 ml-1">
                            ({formatDate(d.check_in_date || d.visit_date)})
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-medium">
                        {d.quantity} × {money(d.unit_price)}
                      </span>
                    </p>
                  ))}
                </div>

                {latestReq && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-amber-50/70 border border-amber-200 rounded-lg px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-amber-900">{requestTypeLabel(latestReq.type, isRoom)}:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cancellationStatusBadgeClass(latestReq.status)}`}>
                        {cancellationStatus(latestReq.status)}
                      </span>
                    </div>
                    <Link to={`/vendor/orders/${b._id}`} className="font-semibold text-primary-700 hover:underline">
                      Xem yêu cầu →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
