import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';

export default function MyTripsPage() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    bookingApi.list().then(r => { if (active) { setData(r.data); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  return <main className="max-w-4xl mx-auto p-4 sm:p-7"><div className="flex justify-between gap-3 mb-6"><h1 className="font-bold text-2xl">Lịch sử đặt vé & chuyến đi</h1><button className="text-sm text-primary-600" onClick={() => setRevision(x => x + 1)}>Tải lại</button></div>{error ? <p role="alert" className="text-rose-600">{error}</p> : !data ? <p>Đang tải đơn đặt...</p> : !data.length ? <div className="bg-white border rounded-2xl p-7"><p>Chưa có đơn đặt nào.</p><Link className="text-primary-600 block mt-3" to="/search">Khám phá dịch vụ</Link></div> : <div className="space-y-6">{data.map(b => <BookingReceipt key={b._id} booking={b} />)}</div>}</main>;
}
