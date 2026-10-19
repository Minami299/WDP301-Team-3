import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { bookingApi } from '../services/api/bookingApi';
import { money } from '../utils/attractionUi';

const POLL_MS = 3000;

// PayOS payment link: shows its VietQR, then checks the order until the payment is confirmed.
export default function PayosPayment({ booking, onPaid }) {
  const [info, setInfo] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(null);
  const paid = useRef(onPaid);
  paid.current = onPaid;

  useEffect(() => {
    let active = true;
    bookingApi.paymentInfo(booking._id)
      .then(r => { if (active) setInfo(r.data); })
      .catch(e => { if (active) setError(e.message); });
    // verify asks PayOS directly, so payment shows up even if the webhook cannot reach this server.
    const check = () => bookingApi.verifyPayment(booking._id).then(r => {
      if (active && r.data.booking_status !== 'PENDING') { clearInterval(timer); paid.current?.(); }
    }).catch(() => {});
    const timer = setInterval(check, POLL_MS);
    check(); // customer may arrive here straight from the payOS return URL
    return () => { active = false; clearInterval(timer); };
  }, [booking._id]);

  useEffect(() => {
    if (!info?.qr_code) return;
    let active = true;
    QRCode.toDataURL(info.qr_code, { width: 220, margin: 1 }).then(url => { if (active) setQrImage(url); }).catch(() => {});
    return () => { active = false; };
  }, [info?.qr_code]);

  useEffect(() => {
    if (!info?.expires_at) return undefined;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(info.expires_at) - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [info?.expires_at]);

  if (error) return <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!info) return <p className="mt-5 text-sm text-slate-500">Đang tạo liên kết thanh toán...</p>;
  const rows = [['Ngân hàng (BIN)', info.bin], ['Số tài khoản', info.account_number], info.account_name && ['Chủ tài khoản', info.account_name], ['Số tiền', money(info.amount)], ['Nội dung chuyển khoản', info.description]].filter(([, v]) => v);
  return <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-7">
    <h2 className="font-bold text-lg">Thanh toán qua payOS</h2>
    <p className="mt-1 text-sm text-slate-500">Quét mã bằng ứng dụng ngân hàng. Đơn được xác nhận tự động khi payOS nhận được tiền.</p>
    <div className="mt-4 grid gap-5 sm:grid-cols-[220px_1fr] items-start">
      {qrImage ? <img src={qrImage} alt={`Mã QR thanh toán đơn ${booking.booking_code}`} width="220" height="220" className="rounded-xl border mx-auto" /> : <div className="h-[220px] w-[220px] rounded-xl border bg-slate-50 mx-auto" aria-hidden="true" />}
      <dl className="space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[150px_1fr] gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold break-all">{value}</dd></div>)}</dl>
    </div>
    {info.checkout_url && <a href={info.checkout_url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Mở trang thanh toán payOS</a>}
    {left !== null && <p className={`mt-4 text-sm font-semibold ${left > 0 ? 'text-blue-800' : 'text-rose-700'}`}>{left > 0 ? `Đơn được giữ trong ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}. Sau thời gian này đơn tự hủy nếu chưa thanh toán.` : 'Đã hết thời gian giữ chỗ. Đơn sẽ được hủy tự động.'}</p>}
    <p role="status" className="mt-2 text-sm text-amber-700">Đang chờ thanh toán... Trang sẽ tự hiện kết quả khi nhận được tiền.</p>
  </section>;
}
