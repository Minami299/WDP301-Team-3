import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { bookingApi } from '../../services/api/bookingApi';
import { ticketCart } from '../../services/storage/ticketCart';
import { inputClass, buttonClass, money } from '../../utils/attractionUi';
import BookingReceipt from '../../components/BookingReceipt';
import { ageLabel } from '../../utils/ticketTypes';

const lineKey = item => item.line_key || item.inventory_id || `${item.service_id}:${item.ticket_type_id}:${item.visit_date}`;
export default function TicketCheckoutPage() {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState(ticketCart.read);
  const [guest, setGuest] = useState({ guest_name: currentUser.full_name || '', guest_email: currentUser.email || '', guest_phone: '' });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const requestId = useRef(crypto.randomUUID());
  const sending = useRef(false);
  useEffect(() => {
    if (!cart?.items.length) return;
    let active = true;
    bookingApi.quote({ items: cart.items }).then(r => { if (active) { setQuote(r.data); setError(''); } }).catch(e => { if (active) { setQuote(null); setError(e.message); } });
    return () => { active = false; };
  }, [cart, revision]);
  const quantity = (key, n) => {
    if (!Number.isInteger(n) || n < 0 || n > 1000) return;
    const next = { ...cart, items: cart.items.map(i => lineKey(i) === key ? { ...i, quantity: n } : i).filter(i => i.quantity > 0) };
    ticketCart.write(next); setQuote(null); setCart(next);
  };
  const submit = async e => {
    e.preventDefault(); if (!quote || sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      const r = await bookingApi.create({ ...guest, items: cart.items, expected_total: quote.final_amount, agree_conditions: agreed, request_id: requestId.current });
      ticketCart.clear(); setReceipt(r.data);
    } catch (e) { setError(e.message); if (e.status === 409) { setQuote(null); setRevision(r => r + 1); } }
    finally { sending.current = false; setBusy(false); }
  };
  if (receipt) return <main className="max-w-3xl mx-auto p-4 sm:p-7"><h1 className="font-bold text-2xl mb-5">Đã ghi nhận yêu cầu mua vé</h1><BookingReceipt booking={receipt} /><p className="text-sm text-slate-500 mt-4">Yêu cầu của bạn đã được gửi đến Vendor để tiếp nhận.</p></main>;
  if (!cart?.items.length) return <main className="max-w-3xl mx-auto p-7"><h1 className="text-2xl font-bold">Chưa chọn vé</h1><Link to="/search?type=ATTRACTION" className="text-primary-600 block mt-5">Tìm điểm tham quan & trải nghiệm</Link></main>;
  return <main className="max-w-5xl mx-auto p-4 sm:p-7">
    <h1 className="text-2xl font-bold mb-5">Xác nhận vé đã chọn</h1>
    <Link className="text-sm text-primary-600" to={`/facilities/${cart.facility_id}?date=${cart.date}`}>← Chỉnh sửa lựa chọn vé</Link>
    {error && <p role="alert" className="bg-rose-50 text-rose-700 rounded-xl p-4 mt-4">{error}<button type="button" className="underline ml-3" onClick={() => { setQuote(null); setRevision(r => r + 1); }}>Cập nhật giá vé</button></p>}
    <div className="grid lg:grid-cols-2 gap-6 mt-5">
      <section className="bg-white border rounded-2xl p-5"><h2 className="font-bold mb-4">Vé đã chọn</h2>{!quote ? <p className="text-sm text-slate-500">{error ? 'Vui lòng cập nhật lựa chọn vé.' : 'Đang xác minh giá vé...'}</p> : quote.items.map(i => <div key={i.line_key} className="border-t py-4"><h3 className="font-semibold">{i.service_name} · {i.ticket_name}</h3><p className="text-xs text-slate-500 mt-1">{ageLabel(i)} · {new Date(i.visit_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</p>{i.ticket_conditions && <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">Điều kiện: {i.ticket_conditions}</p>}<div className="flex justify-between gap-3 items-center mt-3"><label className="text-xs">Số lượng<input disabled={busy} type="number" min={0} max={1000} step={1} aria-label={`Số lượng ${i.ticket_name}`} className={`${inputClass} w-24 mt-1`} value={i.quantity} onChange={e => quantity(i.line_key, Number(e.target.value))} /></label><p className="text-sm">{money(i.unit_price)} × {i.quantity} = <strong>{money(i.line_total)}</strong></p></div></div>)}{quote && <div className="border-t pt-4 font-bold flex justify-between"><span>Tổng tiền vé</span><span className="text-primary-700">{money(quote.final_amount)}</span></div>}</section>
      <form onSubmit={submit} className="bg-white border rounded-2xl p-5"><fieldset disabled={busy}><h2 className="font-bold mb-4">Thông tin người mua</h2>{[['guest_name', 'Họ tên'], ['guest_email', 'Email'], ['guest_phone', 'Số điện thoại']].map(([key, label]) => <label key={key} className="block text-sm mb-4">{label} *<input required name={key} type={key === 'guest_email' ? 'email' : key === 'guest_phone' ? 'tel' : 'text'} maxLength={200} className={`${inputClass} mt-1`} value={guest[key]} onChange={e => setGuest({ ...guest, [key]: e.target.value })} /></label>)}<label className="flex gap-2 items-start text-sm mt-5"><input required type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />Tôi đã đọc và đồng ý điều kiện sử dụng, độ tuổi áp dụng của các hạng vé đã chọn.</label><button disabled={busy || !quote || currentUser.role !== 'CUSTOMER'} className={`${buttonClass} w-full mt-5`}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu mua vé'}</button><p className="text-xs text-slate-500 mt-3">Yêu cầu mua vé sẽ được gửi đến Vendor.</p></fieldset></form>
    </div>
  </main>;
}
