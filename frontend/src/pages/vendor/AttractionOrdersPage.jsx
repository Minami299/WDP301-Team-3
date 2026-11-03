import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AttractionLayout from './AttractionLayout';
import useAuth from '../../hooks/useAuth';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';
import BookingCancellation from '../../components/BookingCancellation';
import { inputClass, buttonClass, money } from '../../utils/attractionUi';
import { orderStatus, cancellationStatus, requestTypeLabel, bookingTime, formatDate } from '../../utils/bookingUi';

export default function AttractionOrdersPage({ cancellations = false }) {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const isHotel = currentUser?.role === 'HOTEL_OWNER';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState({ q: '', status: '', cancellation_status: '', request_type: '' });
  const [filters, setFilters] = useState(draft);
  const back = cancellations ? '/vendor/cancellations' : '/vendor/orders';

  useEffect(() => {
    let active = true;
    const query = id
      ? bookingApi.vendorDetail(id)
      : bookingApi.vendorList({ ...filters, cancellations: cancellations ? 'true' : undefined });
    query
      .then(r => {
        if (active) {
          setData({ key: id || back, value: r.data });
          setError('');
        }
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, back, cancellations, filters, revision]);

  const value = data?.key === (id || back) ? data.value : null;

  const pageTitle = isHotel
    ? cancellations
      ? 'Yêu cầu hủy phòng & đổi ngày'
      : 'Đơn đặt phòng'
    : cancellations
    ? 'Cancellation Requests · Yêu cầu hủy'
    : 'Ticket Orders · Đơn đặt vé';

  const pageDescription = isHotel
    ? cancellations
      ? 'Tiếp nhận, phê duyệt hoặc từ chối các yêu cầu hủy phòng hoặc đổi ngày từ phía du khách.'
      : 'Quản lý danh sách các đơn đặt phòng của khách hàng.'
    : 'Quản lý đơn đặt vé chưa thanh toán và yêu cầu hủy của khách hàng.';

  return (
    <AttractionLayout
      activeScreen={cancellations ? 12 : 11}
      title={pageTitle}
      description={pageDescription}
    >
      <div className="flex flex-wrap gap-4 text-sm mb-5">
        <Link className={`font-semibold ${!cancellations ? 'text-primary-700 underline' : 'text-primary-600'}`} to="/vendor/orders">
          {isHotel ? 'Đơn đặt phòng' : 'Đơn đặt vé'}
        </Link>
        <Link className={`font-semibold ${cancellations ? 'text-primary-700 underline' : 'text-primary-600'}`} to="/vendor/cancellations">
          {isHotel ? 'Yêu cầu hủy phòng / đổi ngày' : 'Yêu cầu hủy'}
        </Link>
        <button className="text-primary-600 ml-auto" onClick={() => setRevision(x => x + 1)}>
          Tải lại
        </button>
      </div>

      {id ? (
        <>
          <Link to={back} className="block text-primary-600 text-sm mb-4">
            ← Quay lại danh sách
          </Link>
          {value && value._id === id && (
            <>
              <BookingReceipt booking={value} showLinks={false} />
              <BookingCancellation
                key={id}
                vendor
                booking={value}
                onUpdated={b => setData({ key: id, value: b })}
              />
            </>
          )}
        </>
      ) : (
        <>
          <form
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white border rounded-2xl p-4 mb-5"
            onSubmit={e => {
              e.preventDefault();
              setFilters({ ...draft });
            }}
          >
            <label className="text-xs font-semibold">
              Tìm mã đơn / tên / email / SĐT
              <input
                aria-label="Tìm kiếm đơn"
                className={`${inputClass} mt-2`}
                maxLength={200}
                value={draft.q}
                onChange={e => setDraft({ ...draft, q: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold">
              Trạng thái đơn
              <select
                aria-label="Trạng thái đơn"
                className={`${inputClass} mt-2`}
                value={draft.status}
                onChange={e => setDraft({ ...draft, status: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="PENDING">Pending · Chưa thanh toán</option>
                <option value="CONFIRMED">Confirmed · Đã xác nhận</option>
                <option value="CANCELLED">Cancelled · Đã hủy</option>
                <option value="REFUNDED">Refunded · Đã hoàn tiền</option>
                <option value="COMPLETED">Completed · Hoàn tất</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Trạng thái yêu cầu
              <select
                aria-label="Trạng thái yêu cầu"
                className={`${inputClass} mt-2`}
                value={draft.cancellation_status}
                onChange={e => setDraft({ ...draft, cancellation_status: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="APPROVED">Chấp thuận</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </label>
            <div className="flex gap-2 items-end">
              <label className="text-xs font-semibold flex-1">
                Loại yêu cầu
                <select
                  aria-label="Loại yêu cầu"
                  className={`${inputClass} mt-2`}
                  value={draft.request_type}
                  onChange={e => setDraft({ ...draft, request_type: e.target.value })}
                >
                  <option value="">Tất cả loại</option>
                  <option value="CANCEL">Hủy phòng / đơn</option>
                  <option value="CHANGE_DATE">Đổi ngày</option>
                  <option value="REFUND">Yêu cầu hoàn tiền</option>
                </select>
              </label>
              <button className={`${buttonClass} h-[42px]`}>Lọc</button>
            </div>
          </form>

          {value && (
            <>
              <p className="text-xs text-slate-500 mb-3">
                {value.length} đơn · Hiển thị tối đa 100 đơn mới nhất phù hợp bộ lọc.
              </p>
              {!value.length ? (
                <div className="bg-white border rounded-2xl p-6 text-sm text-slate-500">
                  {cancellations
                    ? isHotel
                      ? 'Chưa có yêu cầu hủy phòng, đổi ngày hoặc hoàn tiền nào.'
                      : 'Chưa có yêu cầu hủy hoặc hoàn tiền phù hợp.'
                    : isHotel
                    ? 'Chưa có đơn đặt phòng phù hợp.'
                    : 'Chưa có đơn đặt vé phù hợp.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {value.map(b => {
                    const latest = b.cancellation_requests?.at(-1);
                    return (
                      <article key={b._id} className="bg-white border rounded-2xl p-5 shadow-xs">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <Link to={`${back}/${b._id}`} className="font-bold text-primary-700 hover:underline">
                              {b.booking_code}
                            </Link>
                            <p className="text-xs text-slate-500 mt-1">{bookingTime(b.created_at)}</p>
                          </div>
                          <span className="text-sm font-semibold">{orderStatus(b.status)}</span>
                        </div>
                        <p className="text-sm my-3 break-words">
                          {b.guest_name} · {b.guest_email} · {b.guest_phone}
                        </p>
                        <ul className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {b.details.map(d => (
                            <li key={d._id} className="flex flex-wrap justify-between gap-2">
                              <span>
                                {d.ticket_name && d.ticket_name !== d.service_name
                                  ? `${d.service_name} · ${d.ticket_name}`
                                  : d.service_name}
                                {d.visit_date && ` (${formatDate(d.visit_date)})`}
                              </span>
                              <span>
                                {d.quantity} × {money(d.unit_price)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                          <strong>Tổng tiền: {money(b.final_amount)}</strong>
                          <Link
                            className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
                            to={`${back}/${b._id}`}
                          >
                            Xem chi tiết {latest?.status === 'PENDING' ? '& Xử lý yêu cầu →' : '→'}
                          </Link>
                        </div>
                        {latest && (
                          <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex flex-wrap justify-between gap-2">
                            <div>
                              <span className="font-bold text-amber-900 mr-2">
                                [{requestTypeLabel(latest.type)}]:
                              </span>
                              <span className="text-amber-800">{cancellationStatus(latest.status)}</span>
                              {latest.type === 'CHANGE_DATE' && latest.new_date && (
                                <span className="ml-2 font-semibold text-primary-800">
                                  → Ngày mới: {formatDate(latest.new_date)}
                                </span>
                              )}
                            </div>
                            {latest.reason && (
                              <p className="w-full text-slate-600 mt-1">Lý do: {latest.reason}</p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-rose-600 mt-4">
          {error}
        </p>
      )}
      {!value && !error && <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>}
    </AttractionLayout>
  );
}
