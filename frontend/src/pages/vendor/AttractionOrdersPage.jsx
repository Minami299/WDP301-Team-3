import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AttractionLayout from './AttractionLayout';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';
import BookingCancellation from '../../components/BookingCancellation';
import { inputClass, buttonClass, money } from '../../utils/attractionUi';
import { orderStatus, cancellationStatus, bookingTime } from '../../utils/bookingUi';

export default function AttractionOrdersPage({ cancellations = false }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState({ q: '', status: '', cancellation_status: '' });
  const [filters, setFilters] = useState(draft);
  const back = cancellations ? '/vendor/cancellations' : '/vendor/orders';
  useEffect(() => {
    let active = true;
    const query = id ? bookingApi.vendorDetail(id) : bookingApi.vendorList({ ...filters, cancellations: cancellations ? 'true' : undefined });
    query.then(r => { if (active) { setData({ key: id || back, value: r.data }); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, back, cancellations, filters, revision]);
  const value = data?.key === (id || back) ? data.value : null;
  return <AttractionLayout activeScreen={cancellations ? 12 : 11} title={cancellations ? 'Cancellation Requests' : 'Ticket Orders'} description="Quản lý đơn đặt vé chưa thanh toán và yêu cầu hủy của khách hàng.">
    <div className="flex flex-wrap gap-4 text-sm mb-5"><Link className="text-primary-600" to="/vendor/orders">Đơn đặt vé</Link><Link className="text-primary-600" to="/vendor/cancellations">Yêu cầu hủy</Link><button className="text-primary-600 ml-auto" onClick={() => setRevision(x => x + 1)}>Tải lại</button></div>
    {id ? <><Link to={back} className="block text-primary-600 text-sm mb-4">← Quay lại danh sách</Link>{value && value._id === id && <><BookingReceipt booking={value} showLinks={false} /><BookingCancellation key={id} vendor booking={value} onUpdated={b => setData({ key: id, value: b })} /></>}</> : <>
      <form className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white border rounded-2xl p-4 mb-5" onSubmit={e => { e.preventDefault(); setFilters({ ...draft }); }}>
        <label className="text-xs font-semibold">Tìm mã đơn / tên / email / điện thoại<input aria-label="Tìm kiếm đơn" className={`${inputClass} mt-2`} maxLength={200} value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} /></label>
        <label className="text-xs font-semibold">Trạng thái đơn<select aria-label="Trạng thái đơn" className={`${inputClass} mt-2`} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option value="">Tất cả</option><option value="PENDING">Pending · Chưa thanh toán</option><option value="CANCELLED">Cancelled · Đã hủy</option></select></label>
        <label className="text-xs font-semibold">Trạng thái yêu cầu hủy<select aria-label="Trạng thái yêu cầu hủy" className={`${inputClass} mt-2`} value={draft.cancellation_status} onChange={e => setDraft({ ...draft, cancellation_status: e.target.value })}><option value="">Tất cả</option><option value="PENDING">Chờ xử lý</option><option value="APPROVED">Chấp thuận</option><option value="REJECTED">Từ chối</option></select></label><button className={`${buttonClass} self-end`}>Tìm kiếm & lọc</button>
      </form>
      {value && <><p className="text-xs text-slate-500 mb-3">{value.length} đơn · Hiển thị tối đa 100 đơn mới nhất phù hợp bộ lọc.</p>{!value.length ? <div className="bg-white border rounded-2xl p-6 text-sm text-slate-500">{cancellations ? 'Chưa có yêu cầu hủy phù hợp.' : 'Chưa có đơn đặt vé phù hợp.'}</div> : <div className="space-y-4">{value.map(b => { const latest = b.cancellation_requests?.at(-1); return <article key={b._id} className="bg-white border rounded-2xl p-5"><div className="flex flex-wrap justify-between gap-3"><div><Link to={`${back}/${b._id}`} className="font-bold text-primary-700">{b.booking_code}</Link><p className="text-xs text-slate-500 mt-1">{bookingTime(b.created_at)}</p></div><span className="text-sm font-semibold">{orderStatus(b.status)}</span></div><p className="text-sm my-3 break-words">{b.guest_name} · {b.guest_email} · {b.guest_phone}</p><ul className="space-y-1 text-sm text-slate-600">{b.details.map(d => <li key={d._id}>{d.service_name} · {d.ticket_name}: {d.quantity} × {money(d.unit_price)}</li>)}</ul><div className="flex flex-wrap justify-between gap-3 mt-4"><strong>Tổng dự kiến: {money(b.final_amount)}</strong><Link className="text-sm text-primary-600" to={`${back}/${b._id}`}>Xem chi tiết{latest?.status === 'PENDING' ? ' & xử lý hủy' : ''}</Link></div>{latest && <p className="text-xs text-amber-700 mt-3">Yêu cầu hủy: {cancellationStatus(latest.status)}</p>}</article>; })}</div>}</>}
    </>}
    {error && <p role="alert" className="text-rose-600 mt-4">{error}</p>}{!value && !error && <p>Đang tải đơn đặt vé...</p>}
  </AttractionLayout>;
}
