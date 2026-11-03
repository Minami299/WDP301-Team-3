import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { bookingApi } from '../../services/api/bookingApi';
import { ticketCart } from '../../services/storage/ticketCart';
import { inputClass, buttonClass, money } from '../../utils/attractionUi';
import BookingReceipt from '../../components/BookingReceipt';
import PayosPayment from '../../components/PayosPayment';
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

  // Voucher & Loyalty Points
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [availablePromos, setAvailablePromos] = useState([]);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState('');

  const requestId = useRef(crypto.randomUUID());
  const sending = useRef(false);

  useEffect(() => {
    bookingApi.promotions()
      .then(res => {
        if (res.data?.promotions) setAvailablePromos(res.data.promotions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cart?.items.length) return;
    let active = true;
    const pointsToRedeem = usePoints ? Math.max(0, Math.floor(Number(pointsInput) || 0)) : 0;
    bookingApi.quote({
      items: cart.items,
      promotion_code: appliedPromo || undefined,
      points_to_redeem: pointsToRedeem
    }).then(r => {
      if (active) {
        setQuote(r.data);
        setError('');
        setPromoError('');
      }
    }).catch(e => {
      if (active) {
        if (appliedPromo) {
          setPromoError(e.message);
          setAppliedPromo('');
        } else {
          setQuote(null);
          setError(e.message);
        }
      }
    });
    return () => { active = false; };
  }, [cart, revision, appliedPromo, usePoints, pointsInput]);

  const applyPromoCode = (code) => {
    const trimmed = (code || promoInput).trim().toUpperCase();
    if (!trimmed) return;
    setPromoError('');
    setAppliedPromo(trimmed);
  };

  const removePromoCode = () => {
    setAppliedPromo('');
    setPromoInput('');
    setPromoError('');
  };

  const quantity = (key, n) => {
    if (!Number.isInteger(n) || n < 0 || n > 1000) return;
    const next = { ...cart, items: cart.items.map(i => lineKey(i) === key ? { ...i, quantity: n } : i).filter(i => i.quantity > 0) };
    ticketCart.write(next); setQuote(null); setCart(next);
  };

  const submit = async e => {
    e.preventDefault(); if (!quote || sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      const pointsToRedeem = usePoints ? Math.max(0, Math.floor(Number(pointsInput) || 0)) : 0;
      const r = await bookingApi.create({
        ...guest,
        items: cart.items,
        expected_total: quote.final_amount,
        promotion_code: appliedPromo || undefined,
        points_to_redeem: pointsToRedeem,
        agree_conditions: agreed,
        request_id: requestId.current
      });
      ticketCart.clear(); setReceipt(r.data);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) { setQuote(null); setRevision(r => r + 1); }
    }
    finally { sending.current = false; setBusy(false); }
  };

  if (receipt) return <main className="max-w-3xl mx-auto p-4 sm:p-7"><h1 className="font-bold text-2xl mb-5">Đã ghi nhận yêu cầu mua vé</h1><BookingReceipt booking={receipt} />{receipt.status === 'PENDING' ? <PayosPayment booking={receipt} onPaid={setReceipt} /> : <p role="status" className="text-sm text-emerald-700 mt-4">Đã nhận thanh toán. Đơn của bạn đã được xác nhận.</p>}</main>;
  if (!cart?.items.length) return <main className="max-w-3xl mx-auto p-7"><h1 className="text-2xl font-bold">Chưa chọn vé</h1><Link to="/search?type=ATTRACTION" className="text-primary-600 block mt-5">Tìm điểm tham quan & trải nghiệm</Link></main>;

  return <main className="max-w-5xl mx-auto p-4 sm:p-7">
    <h1 className="text-2xl font-bold mb-5">Xác nhận vé đã chọn</h1>
    <Link className="text-sm text-primary-600" to={`/facilities/${cart.facility_id}?date=${cart.date}`}>← Chỉnh sửa lựa chọn vé</Link>
    {error && <p role="alert" className="bg-rose-50 text-rose-700 rounded-xl p-4 mt-4">{error}<button type="button" className="underline ml-3" onClick={() => { setQuote(null); setRevision(r => r + 1); }}>Cập nhật giá vé</button></p>}
    <div className="grid lg:grid-cols-2 gap-6 mt-5">
      <section className="bg-white border rounded-2xl p-5">
        <h2 className="font-bold mb-4">Vé đã chọn</h2>
        {!quote ? <p className="text-sm text-slate-500">{error ? 'Vui lòng cập nhật lựa chọn vé.' : 'Đang xác minh giá vé...'}</p> : quote.items.map(i => <div key={i.line_key} className="border-t py-4"><h3 className="font-semibold">{i.service_name} · {i.ticket_name}</h3><p className="text-xs text-slate-500 mt-1">{ageLabel(i)} · {new Date(i.visit_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</p>{i.ticket_conditions && <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">Điều kiện: {i.ticket_conditions}</p>}<div className="flex justify-between gap-3 items-center mt-3"><label className="text-xs">Số lượng<input disabled={busy} type="number" min={0} max={1000} step={1} aria-label={`Số lượng ${i.ticket_name}`} className={`${inputClass} w-24 mt-1`} value={i.quantity} onChange={e => quantity(i.line_key, Number(e.target.value))} /></label><p className="text-sm">{money(i.unit_price)} × {i.quantity} = <strong>{money(i.line_total)}</strong></p></div></div>)}

        {/* Mã giảm giá */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <h3 className="font-semibold text-sm">Mã giảm giá (Voucher)</h3>
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 text-sm">
              <span>Đang áp dụng: <strong>{appliedPromo}</strong></span>
              <button type="button" onClick={removePromoCode} className="text-xs text-rose-600 hover:underline font-semibold ml-2">Xóa</button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  disabled={busy}
                  type="text"
                  placeholder="Nhập mã ưu đãi..."
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  className={`${inputClass} flex-1 uppercase`}
                />
                <button
                  type="button"
                  disabled={busy || !promoInput.trim()}
                  onClick={() => applyPromoCode(promoInput)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
              {promoError && <p className="text-xs text-rose-600 mt-1">{promoError}</p>}
              {availablePromos.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Mã ưu đãi có sẵn:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePromos.map(p => (
                      <button
                        key={p._id || p.code}
                        type="button"
                        onClick={() => { setPromoInput(p.code); applyPromoCode(p.code); }}
                        className="text-xs bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 rounded-lg px-2.5 py-1 font-mono transition"
                      >
                        {p.code} ({p.discount_type === 'PERCENTAGE' ? `-${p.discount_value}%` : `-${money(p.discount_value)}`})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Điểm thưởng thành viên */}
        {quote && (quote.points_available > 0 || quote.points_redeemed > 0) && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={e => {
                    setUsePoints(e.target.checked);
                    if (e.target.checked && !pointsInput) {
                      setPointsInput(String(quote.points_available));
                    }
                  }}
                />
                <span>Dùng điểm thưởng</span>
              </label>
              <span className="text-xs text-slate-500">
                Bạn có: <strong>{quote.points_available} điểm</strong> ({money(quote.points_available * (quote.point_value || 1000))})
              </span>
            </div>
            {usePoints && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={0}
                  max={quote.points_available}
                  step={1}
                  value={pointsInput}
                  onChange={e => setPointsInput(e.target.value)}
                  className={`${inputClass} w-32`}
                  placeholder="Số điểm"
                />
                <span className="text-xs text-slate-600">
                  = Giảm {money(Number(pointsInput || 0) * (quote.point_value || 1000))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bảng chi tiết tổng tiền */}
        {quote && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tạm tính</span>
              <span>{money(quote.subtotal)}</span>
            </div>
            {quote.promotion_discount_amount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>Giảm giá voucher ({quote.promotion?.code || appliedPromo})</span>
                <span>- {money(quote.promotion_discount_amount)}</span>
              </div>
            )}
            {quote.points_discount_amount > 0 && (
              <div className="flex justify-between text-sm text-amber-600 font-medium">
                <span>Trừ điểm thưởng ({quote.points_redeemed} điểm)</span>
                <span>- {money(quote.points_discount_amount)}</span>
              </div>
            )}
            <div className="border-t pt-2 font-bold flex justify-between text-base">
              <span>Tổng thanh toán</span>
              <span className="text-primary-700">{money(quote.final_amount)}</span>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={submit} className="bg-white border rounded-2xl p-5">
        <fieldset disabled={busy}>
          <h2 className="font-bold mb-4">Thông tin người mua</h2>
          {[['guest_name', 'Họ tên'], ['guest_email', 'Email'], ['guest_phone', 'Số điện thoại']].map(([key, label]) => (
            <label key={key} className="block text-sm mb-4">
              {label} *
              <input required name={key} type={key === 'guest_email' ? 'email' : key === 'guest_phone' ? 'tel' : 'text'} maxLength={200} className={`${inputClass} mt-1`} value={guest[key]} onChange={e => setGuest({ ...guest, [key]: e.target.value })} />
            </label>
          ))}
          <label className="flex gap-2 items-start text-sm mt-5">
            <input required type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            Tôi đã đọc và đồng ý điều kiện sử dụng, độ tuổi áp dụng của các hạng vé đã chọn.
          </label>
          <button disabled={busy || !quote || currentUser.role !== 'CUSTOMER'} className={`${buttonClass} w-full mt-5`}>
            {busy ? 'Đang gửi...' : 'Gửi yêu cầu mua vé'}
          </button>
          <p className="text-xs text-slate-500 mt-3">Yêu cầu mua vé sẽ được gửi đến Vendor.</p>
        </fieldset>
      </form>
    </div>
  </main>;
}
