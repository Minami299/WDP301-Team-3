import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import facilityApi from '../services/api/facilityApi';
import { ticketCart } from '../services/storage/ticketCart';
import { localDate, inputClass, money, buttonClass } from '../utils/attractionUi';
import { ageLabel } from '../utils/ticketTypes';
import useAuth from '../hooks/useAuth';

export default function AttractionDetail({ facility }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser } = useAuth();
  const [date, setDate] = useState(() => params.get('date') || localDate());
  const [quantities, setQuantities] = useState(() => {
    const cart = ticketCart.read();
    return cart?.facility_id === facility._id && cart.date === (params.get('date') || localDate()) ? Object.fromEntries(cart.items.map(i => [i.line_key || i.inventory_id, i.quantity])) : {};
  });
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const key = `${facility._id}:${date}:${revision}`;
  const loading = result?.key !== key;
  const services = result?.key === key ? result.services : [];
  const error = result?.key === key ? result.error : '';
  useEffect(() => {
    const refresh = () => setRevision(x => x + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    facilityApi.getTicketAvailability(facility._id, date)
      .then(r => { if (active) setResult({ key, services: r.data, error: '' }); })
      .catch(e => { if (active) setResult({ key, services: [], error: e.message }); });
    return () => { active = false; };
  }, [facility._id, date, key]);

  const optionsFor = (service, type) => type.schedules.length ? type.schedules.map(row => ({
    ...row, line_key: String(row.inventory_id), service_id: service._id, ticket_type_id: type._id, visit_date: date
  })) : [{
    line_key: `${service._id}:${type._id}:${date}`, service_id: service._id, ticket_type_id: type._id,
    visit_date: date, price: type.price, time_slot: 'ALL_DAY', available_qty: type.requires_schedule ? 0 : 1000
  }];
  const options = services.flatMap(s => s.ticket_types.flatMap(t => optionsFor(s, t)));
  const selected = options.filter(o => Number(quantities[o.line_key]) > 0 && o.available_qty > 0);
  const total = selected.reduce((sum, o) => sum + o.price * Number(quantities[o.line_key]), 0);
  const checkout = () => {
    ticketCart.write({ facility_id: facility._id, date, items: selected.map(o => ({
      line_key: o.line_key, ...(o.inventory_id ? { inventory_id: o.inventory_id } : { service_id: o.service_id, ticket_type_id: o.ticket_type_id, visit_date: date }), quantity: Number(quantities[o.line_key])
    })) });
    navigate('/checkout');
  };
  return <main className="max-w-6xl mx-auto p-4 sm:p-7 font-body">
    <Link to="/search?type=ATTRACTION" className="text-sm text-primary-600">← Điểm tham quan & trải nghiệm</Link>
    <h1 className="text-2xl sm:text-3xl font-bold mt-5">{facility.name}</h1>
    <p className="text-sm text-slate-500 mt-2">{facility.address}, {facility.city}</p>
    {facility.description && <p className="text-sm text-slate-600 my-4 whitespace-pre-wrap">{facility.description}</p>}
    <div className="my-6 grid lg:grid-cols-[1fr_300px] gap-6">
      <section>
        <label className="block text-sm font-semibold mb-2" htmlFor="visit-date">Ngày tham quan</label>
        <input id="visit-date" type="date" min={localDate()} className={`${inputClass} max-w-xs`} value={date} onChange={e => { setDate(e.target.value); setQuantities({}); }} />
        <button className="text-sm text-primary-600 ml-3" onClick={() => setRevision(x => x + 1)}>Cập nhật giá vé</button>
        {loading ? <p className="my-5">Đang tải hạng vé...</p> : error ? <div role="alert" className="my-5 text-rose-600">{error}<button className="ml-3 underline" onClick={() => setRevision(x => x + 1)}>Tải lại</button></div> : !services.length ? <p className="my-5 text-sm text-slate-500">Chưa có dịch vụ mở bán.</p> : services.map(s => <article key={s._id} className="bg-white rounded-2xl border p-5 mt-5">
          <h2 className="text-xl font-bold">{s.name}</h2>
          <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{s.description}</p>
          <p className="text-xs text-slate-500 mt-1">{s.location}{s.duration_minutes ? ` · ${s.duration_minutes} phút` : ''}</p>
          <div className="flex flex-wrap gap-3 my-3">{s.photos?.map((photo, i) => <img key={`${photo}-${i}`} src={photo} alt={s.name} className="h-28 w-40 rounded-lg object-cover" />)}</div>
          {!s.ticket_types.length && <p className="text-sm mt-3 text-slate-500">Chưa có hạng vé đang bán.</p>}
          {s.ticket_types.map(t => <div key={t._id} className="border-t py-4 mt-2">
            <h3 className="font-bold">{t.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{ageLabel(t)}</p>
            {t.description && <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{t.description}</p>}
            {t.conditions && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">Điều kiện: {t.conditions}</p>}
            {optionsFor(s, t).map(o => <div key={o.line_key} className="flex flex-wrap justify-between items-center gap-3 mt-3 bg-slate-50 rounded-lg p-3">
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" aria-label={`Chọn ${s.name} - ${t.name}`} data-ticket={t._id} checked={Number(quantities[o.line_key]) > 0} disabled={!o.available_qty} onChange={e => setQuantities({ ...quantities, [o.line_key]: e.target.checked ? 1 : 0 })} /><span><strong className="text-primary-700">{money(o.price)}</strong>{o.inventory_id && <span className="block text-xs text-slate-500">{o.time_slot === 'ALL_DAY' ? 'Cả ngày' : o.time_slot} · Còn {o.available_qty} vé</span>}{!o.available_qty && <span className="block text-xs text-slate-500">Chưa mở bán ngày này</span>}</span></label>
              <label className="text-xs">Số lượng<input aria-label={`Số lượng ${s.name} - ${t.name} - ${o.time_slot}`} data-line={o.line_key} type="number" min={0} max={Math.min(o.available_qty, 1000)} step={1} disabled={!o.available_qty} className={`${inputClass} w-24 mt-1`} value={quantities[o.line_key] || 0} onChange={e => { const n = Number(e.target.value); setQuantities({ ...quantities, [o.line_key]: Number.isInteger(n) ? Math.min(Math.max(0, n), o.available_qty, 1000) : 0 }); }} /></label>
              <span className="text-sm">Thành tiền: <strong>{money(o.price * Number(quantities[o.line_key] || 0))}</strong></span>
            </div>)}
          </div>)}
        </article>)}
      </section>
      <aside className="bg-white border rounded-2xl p-5 self-start lg:sticky lg:top-5">
        <h2 className="font-bold">Vé đã chọn</h2><p className="text-sm text-slate-500 my-3">{selected.reduce((sum, o) => sum + Number(quantities[o.line_key]), 0)} vé · {date}</p><p className="font-bold text-xl text-primary-700">{money(total)}</p>
        <button disabled={loading || !selected.length || Boolean(currentUser && currentUser.role !== 'CUSTOMER')} onClick={checkout} className={`${buttonClass} mt-5 w-full`}>{currentUser ? 'Mua vé đã chọn' : 'Đăng nhập & mua vé'}</button>
        {currentUser && currentUser.role !== 'CUSTOMER' && <p className="text-xs text-slate-500 mt-2">Đăng nhập bằng tài khoản Customer để mua vé.</p>}
      </aside>
    </div>
  </main>;
}
