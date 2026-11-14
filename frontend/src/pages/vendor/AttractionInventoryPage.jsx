import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAttractions from '../../hooks/useAttractions';
import { vendorApi } from '../../services/api/vendorApi';
import AttractionLayout, { Field, Notice } from './AttractionLayout';
import { inputClass, buttonClass, localDate, money } from '../../utils/attractionUi';

const endDate = () => { const value = new Date(); value.setDate(value.getDate() + 13); return localDate(value); };
const ALL = 'all';
const slotLabel = (slot) => (slot === 'ALL_DAY' ? 'Cả ngày' : slot);
const dayLabel = (value) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC' });

function DetailPanel({ row, busy, onEdit, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const locked = row.booked_qty > 0;
  const items = [
    ['Dịch vụ', row.service_name], ['Hạng vé', row.ticket_name], ['Cơ sở', row.facility_name],
    ['Ngày tham quan', dayLabel(row.target_date)], ['Khung giờ', slotLabel(row.time_slot)],
    ['Giá bán', `${money(row.price)}${row.uses_ticket_price ? ' (theo giá hạng vé)' : ' (giá riêng cho ngày này)'}`],
    ['Hạn mức phát hành', row.total_qty], ['Đã đặt', row.booked_qty], ['Còn lại', row.available_qty || 'Hết vé']
  ];
  return (
    <section aria-label="Chi tiết lịch phát hành" className="mb-6 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold">Chi tiết lịch phát hành</h2>
        <button type="button" onClick={onClose} className="text-sm text-slate-500">Đóng</button>
      </div>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        {items.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div>)}
      </dl>
      <div className="flex flex-wrap items-center gap-4 mt-5">
        <button type="button" disabled={busy} className={buttonClass} onClick={onEdit}>Chỉnh sửa</button>
        {confirming ? (
          <>
            <span className="text-sm text-rose-700">Xóa lịch bán vé này?</span>
            <button type="button" disabled={busy || locked} className="text-sm font-semibold text-rose-600 disabled:opacity-50" onClick={onDelete}>{busy ? 'Đang xóa...' : 'Xác nhận xóa'}</button>
            <button type="button" disabled={busy} className="text-sm text-slate-500" onClick={() => setConfirming(false)}>Hủy</button>
          </>
        ) : (
          <button type="button" disabled={busy || locked} title={locked ? 'Không thể xóa lịch đã có vé đặt' : undefined} className="text-sm font-semibold text-rose-600 disabled:opacity-50" onClick={() => setConfirming(true)}>Xóa lịch</button>
        )}
      </div>
      {locked && <p className="text-xs text-amber-700 mt-3">Lịch này đã có {row.booked_qty} vé đặt nên không thể xóa; bạn vẫn có thể tăng hạn mức hoặc đổi giá.</p>}
    </section>
  );
}

export default function AttractionInventoryPage() {
  const { facilities, loading, error: loadError, reload } = useAttractions();
  const [params, setParams] = useSearchParams();
  const tickets = facilities.flatMap(f => f.tickets.flatMap(s => s.ticket_types.map(t => ({ ...t, service_id: s._id, service_name: s.name, facility_name: f.name, base_price: t.price }))));
  const selectedType = params.get('type');
  const byType = tickets.find(t => t._id === selectedType);
  const byService = !selectedType ? tickets.find(t => t.service_id === params.get('ticket')) : null;
  // "all" is the default; a ?type= or ?ticket= link narrows to one ticket type.
  const ticket = byType || byService || null;
  const typeKey = ticket?._id || ALL;
  const [from, setFrom] = useState(localDate);
  const [to, setTo] = useState(endDate);
  const [inventoryData, setInventoryData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryKey = `${typeKey}:${from}:${to}:${revision}`;
  const hasTickets = tickets.length > 0;
  const fetching = hasTickets && inventoryData?.key !== queryKey;
  const fetchError = inventoryData?.key === queryKey ? inventoryData.error : '';
  const rows = inventoryData?.key === queryKey ? inventoryData.rows : [];
  const formTicket = form ? tickets.find(t => t._id === form.type_id) : null;

  useEffect(() => {
    if (!hasTickets) return;
    let active = true;
    const request = ticket
      ? vendorApi.getTicketInventory(ticket.service_id, { from, to }).then((res) => res.data.filter(r => String(r.ticket_type_id) === String(ticket._id)).map(r => ({ ...r, service_id: ticket.service_id, service_name: ticket.service_name, facility_name: ticket.facility_name, ticket_name: ticket.name })))
      : vendorApi.getAllInventory({ from, to }).then((res) => res.data);
    request
      .then((data) => { if (active) setInventoryData({ key: queryKey, rows: data, error: '' }); })
      .catch((err) => { if (active) setInventoryData({ key: queryKey, rows: [], error: err.message }); });
    return () => { active = false; };
    // `ticket` is rebuilt each render; queryKey already encodes the selected type, range and revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTickets, from, to, queryKey]);

  const selectType = (value) => {
    setParams(value === ALL ? {} : { ticket: tickets.find(t => t._id === value).service_id, type: value });
    setForm(null); setDetail(null); setSuccess('');
  };
  const openNew = () => {
    const base = ticket || tickets[0];
    setSuccess(''); setDetail(null);
    setForm({ type_id: base._id, target_date: from, time_slot: 'ALL_DAY', total_qty: '', price: base.base_price, uses_ticket_price: true, booked_qty: 0 });
  };
  const openEdit = (row) => {
    setSuccess('');
    setForm({ ...row, type_id: String(row.ticket_type_id), target_date: row.target_date.slice(0, 10) });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await vendorApi.saveTicketInventory(formTicket.service_id, { ticket_type_id: formTicket._id, uses_ticket_price: Boolean(form.uses_ticket_price), inventory_id: form._id, target_date: form.target_date, time_slot: form.time_slot, total_qty: Number(form.total_qty), price: Number(form.price) });
      setFrom(form.target_date < from ? form.target_date : from);
      setTo(form.target_date > to ? form.target_date : to);
      setForm(null); setDetail(null); setRevision((value) => value + 1);
      setSuccess('Đã lưu giá và hạn mức phát hành. Số vé đã đặt được giữ nguyên.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await vendorApi.deleteInventory(detail._id);
      setDetail(null); setRevision((value) => value + 1);
      setSuccess('Đã xóa lịch bán vé.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AttractionLayout activeScreen={7} title="Giá vé & Hạn mức theo ngày" description="Thiết lập số lượng phát hành cho từng hạng vé, ngày tham quan và khung giờ. Dữ liệu được lưu vào lịch bán vé của bạn.">
      <Notice error={loadError || error || fetchError} success={success} />
      {loading ? <p className="text-sm text-slate-500">Đang tải hạng vé...</p> : loadError ? <button onClick={reload} className={buttonClass}>Tải lại</button> : !hasTickets ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"><h2 className="font-bold text-lg">Chưa có hạng vé để cấu hình</h2><p className="text-sm text-slate-500 my-3">Bổ sung thông tin kinh doanh và tạo hạng vé trước khi thiết lập lịch bán.</p><Link to="/vendor/registration" className="text-primary-600 text-sm font-semibold">Thêm cơ sở & Hạng vé →</Link></div>
      ) : (
        <>
          <fieldset disabled={saving} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl border border-slate-200 bg-white p-5 mb-6">
            <div className="sm:col-span-2"><Field label="Cơ sở / Dịch vụ / Hạng vé"><select className={inputClass} value={typeKey} onChange={(e) => selectType(e.target.value)}><option value={ALL}>Tất cả dịch vụ & hạng vé ({tickets.length})</option>{tickets.map(item => <option key={item._id} value={item._id}>{item.facility_name} · {item.service_name} · {item.name}</option>)}</select></Field></div>
            <Field label="Từ ngày"><input type="date" required className={inputClass} value={from} onChange={(e) => { setFrom(e.target.value); setForm(null); setDetail(null); }} /></Field>
            <Field label="Đến ngày"><input type="date" required min={from} className={inputClass} value={to} onChange={(e) => { setTo(e.target.value); setForm(null); setDetail(null); }} /></Field>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><p className="text-sm text-slate-500">{ticket ? <>Giá cơ bản: <strong className="text-slate-800">{money(ticket.base_price)}</strong></> : 'Đang xem lịch phát hành của tất cả hạng vé'}</p><button disabled={saving || fetching || Boolean(fetchError)} className={buttonClass} onClick={openNew}>+ Thiết lập ngày bán vé</button></div>
          {detail && !form && <DetailPanel row={detail} busy={saving} onEdit={() => openEdit(detail)} onDelete={remove} onClose={() => setDetail(null)} />}
          {form && formTicket && (
            <form onSubmit={save} className="mb-6 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">{form._id ? 'Cập nhật lịch bán vé' : 'Thiết lập giá & Hạn mức phát hành'}</h2>
              <fieldset disabled={saving} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2 lg:col-span-4"><Field label="Hạng vé *"><select required disabled={Boolean(form._id) || Boolean(ticket)} className={inputClass} value={form.type_id} onChange={(e) => { const next = tickets.find(t => t._id === e.target.value); setForm({ ...form, type_id: e.target.value, ...(form.uses_ticket_price ? { price: next.base_price } : {}) }); }}>{tickets.map(item => <option key={item._id} value={item._id}>{item.facility_name} · {item.service_name} · {item.name}</option>)}</select></Field></div>
                <Field label="Ngày tham quan *"><input required disabled={Boolean(form._id)} type="date" className={inputClass} value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Field>
                <Field label="Khung giờ"><select disabled={Boolean(form._id)} className={inputClass} value={form.time_slot === 'ALL_DAY' ? 'ALL_DAY' : 'TIMED'} onChange={(e) => setForm({ ...form, time_slot: e.target.value === 'ALL_DAY' ? 'ALL_DAY' : '09:00' })}><option value="ALL_DAY">Cả ngày</option><option value="TIMED">Giờ khởi hành / Vào cổng</option></select>{form.time_slot !== 'ALL_DAY' && <input aria-label="Giờ khởi hành" disabled={Boolean(form._id)} required type="time" className={`${inputClass} mt-2`} value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} />}</Field>
                <Field label="Giá bán trong ngày (VND) *"><input required disabled={Boolean(form.uses_ticket_price)} type="number" min="0" step="any" className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
                <Field label="Tổng số vé phát hành *"><input required type="number" min={form.booked_qty || 0} step="1" className={inputClass} value={form.total_qty} onChange={(e) => setForm({ ...form, total_qty: e.target.value })} /></Field>
              </fieldset>
              <label className="flex gap-2 items-center text-sm mt-4"><input disabled={saving} type="checkbox" checked={Boolean(form.uses_ticket_price)} onChange={e => setForm({ ...form, uses_ticket_price: e.target.checked, ...(e.target.checked ? { price: formTicket.base_price } : {}) })} />Dùng giá hiện tại của hạng vé; bỏ chọn để thiết lập giá riêng cho ngày này.</label>
              <p className="text-xs text-slate-500 mt-4">Hạn mức là tổng số vé của ngày và khung giờ này, bao gồm vé đã đặt. Nhập 0 để ngừng phát hành khi chưa có vé đặt.</p>
              {form.booked_qty > 0 && <p className="text-xs text-amber-700 mt-2">Đã đặt {form.booked_qty} vé. Hạn mức tối thiểu: {form.booked_qty}.</p>}
              <div className="flex gap-3 mt-5"><button disabled={saving} className={buttonClass}>{saving ? 'Đang lưu...' : 'Lưu lịch bán vé'}</button><button type="button" disabled={saving} onClick={() => setForm(null)} className="text-sm text-slate-500">Hủy</button></div>
            </form>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 flex justify-between items-center"><h2 className="font-bold">Lịch phát hành · {ticket ? ticket.name : 'Tất cả hạng vé'}</h2><button disabled={fetching || saving} className="text-xs font-semibold text-primary-600" onClick={() => setRevision((value) => value + 1)}>Tải lại</button></div>
            {fetching ? <p className="p-6 text-sm text-slate-500">Đang tải lịch bán vé...</p> : fetchError ? <p className="p-6 text-sm text-slate-500">Không tải được lịch bán vé. Vui lòng tải lại.</p> : !rows.length ? <p className="p-6 text-sm text-slate-500">Chưa thiết lập lịch bán vé trong khoảng ngày này. Thêm ngày bán để phát hành vé.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Ngày', 'Khung giờ', ...(ticket ? [] : ['Dịch vụ · Hạng vé']), 'Giá bán', 'Hạn mức', 'Đã đặt', 'Còn lại', ''].map((label, index) => <th key={index} className="text-left px-5 py-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row._id} className={`border-t border-slate-100 ${detail?._id === row._id ? 'bg-sky-50' : ''}`}><td className="px-5 py-4">{dayLabel(row.target_date)}</td><td className="px-5 py-4">{slotLabel(row.time_slot)}</td>{!ticket && <td className="px-5 py-4"><div className="font-semibold">{row.ticket_name}</div><div className="text-xs text-slate-500">{row.service_name}</div></td>}<td className="px-5 py-4 font-semibold">{money(row.price)}</td><td className="px-5 py-4">{row.total_qty}</td><td className="px-5 py-4">{row.booked_qty}</td><td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${row.available_qty ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.available_qty || 'Hết vé'}</span></td><td className="px-5 py-4 space-x-3"><button disabled={saving} className="text-xs font-semibold text-primary-600" onClick={() => { setSuccess(''); setForm(null); setDetail(row); }}>Chi tiết</button><button disabled={saving} className="text-xs font-semibold text-primary-600" onClick={() => { setDetail(null); openEdit(row); }}>Chỉnh sửa</button></td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </AttractionLayout>
  );
}
