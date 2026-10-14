import { useEffect, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { money } from '../utils/attractionUi';
import { Link } from 'react-router-dom';
import { orderStatus } from '../utils/bookingUi';

export default function VendorBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    bookingApi.vendorList().then(r => { if (active) { setBookings(r.data); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  return <section className="bg-white rounded-2xl border p-5 sm:p-6 mt-6">
    <Link to="/vendor/orders" className="block text-sm text-primary-600 mb-3">Mở Ticket Orders · Tìm kiếm & xử lý yêu cầu hủy →</Link>
    <div className="flex justify-between gap-3"><h2 className="font-bold">Yêu cầu mua vé của khách hàng</h2><button className="text-xs text-primary-600" onClick={() => setRevision(x => x + 1)}>Tải lại</button></div>
    {error && <p role="alert" className="text-rose-600 text-sm mt-3">{error}</p>}
    {!bookings ? <p className="text-sm text-slate-500 mt-4">Đang tải yêu cầu...</p> : !bookings.length ? <p className="text-sm text-slate-500 mt-4">Chưa có yêu cầu mua vé.</p> : <div className="space-y-3 mt-4">{bookings.map(b => <div key={b._id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><div><Link to={`/vendor/orders/${b._id}`} className="text-primary-700 font-bold text-sm">{b.booking_code}</Link><p className="text-xs text-slate-500 mt-1">{b.guest_name} · {b.guest_phone}</p></div><strong className="text-primary-700">{money(b.final_amount)}</strong></div><div className="space-y-1 my-3">{b.details.map(d => <p key={d._id} className="text-xs text-slate-600">{d.service_name} · {d.ticket_name} · {d.quantity} × {money(d.unit_price)}</p>)}</div><span className="text-xs text-slate-500">{orderStatus(b.status)}</span></div>)}</div>}
  </section>;
}
