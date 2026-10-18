import { useEffect, useRef, useState } from 'react';
import { bookingApi } from '../services/api/bookingApi';
import { money } from '../utils/attractionUi';

const POLL_MS = 4000;

// VietQR code from SePay; polls the booking until the webhook confirms the transfer.
export default function SepayPayment({ booking, onPaid }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const paid = useRef(onPaid);
  paid.current = onPaid;

  useEffect(() => {
    let active = true;
    bookingApi.paymentInfo(booking._id)
      .then(r => { if (active) setInfo(r.data); })
      .catch(e => { if (active) setError(e.message); });
    const timer = setInterval(() => {
      bookingApi.detail(booking._id).then(r => {
        if (active && r.data.status !== 'PENDING') { clearInterval(timer); paid.current?.(r.data); }
      }).catch(() => {});
    }, POLL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [booking._id]);

  if (error) return <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!info) return <p className="mt-5 text-sm text-slate-500">Đang tạo mã thanh toán...</p>;
  const rows = [['Ngân hàng', info.bank], ['Số tài khoản', info.account_number], info.account_name && ['Chủ tài khoản', info.account_name], ['Số tiền', money(info.amount)], ['Nội dung chuyển khoản', info.content]].filter(Boolean);
  return <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-7">
    <h2 className="font-bold text-lg">Thanh toán qua VietQR</h2>
    <p className="mt-1 text-sm text-slate-500">Quét mã bằng ứng dụng ngân hàng. Giữ nguyên số tiền và nội dung để đơn được xác nhận tự động.</p>
    <div className="mt-4 grid gap-5 sm:grid-cols-[220px_1fr] items-start">
      <img src={info.qr_url} alt={`Mã VietQR thanh toán đơn ${booking.booking_code}`} width="220" height="220" className="rounded-xl border mx-auto" />
      <dl className="space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[150px_1fr] gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold break-all">{value}</dd></div>)}</dl>
    </div>
    <p role="status" className="mt-4 text-sm text-amber-700">Đang chờ thanh toán... Trang sẽ tự cập nhật khi nhận được tiền.</p>
  </section>;
}
