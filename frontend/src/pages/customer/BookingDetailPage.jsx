import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';
import BookingCancellation from '../../components/BookingCancellation';

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    bookingApi.detail(id).then(r => { if (active) { setBooking(r.data); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, revision]);
  return <main className="max-w-4xl mx-auto p-4 sm:p-7"><div className="flex justify-between gap-3 mb-5"><Link to="/my-trips" className="text-primary-600">← Lịch sử chuyến đi</Link><button className="text-primary-600" onClick={() => setRevision(x => x + 1)}>Tải lại trạng thái</button></div><h1 className="text-2xl font-bold mb-5">Chi tiết đơn đặt chỗ</h1>{error && <p role="alert" className="text-rose-600 mb-4">{error}</p>}{booking && booking._id === id ? <><BookingReceipt booking={booking} /><BookingCancellation key={id} booking={booking} onUpdated={setBooking} /></> : !error && <p>Đang tải đơn...</p>}</main>;
}
