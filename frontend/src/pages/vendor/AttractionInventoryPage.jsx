import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAttractions from '../../hooks/useAttractions';
import { vendorApi } from '../../services/api/vendorApi';
import AttractionLayout, { Field, Notice } from './AttractionLayout';
import { inputClass, buttonClass, localDate, money } from '../../utils/attractionUi';

const endDate = () => { const value = new Date(); value.setDate(value.getDate() + 13); return localDate(value); };

export default function AttractionInventoryPage() {
  const { facilities, loading, error: loadError, reload } = useAttractions();
  const [params, setParams] = useSearchParams();
  const tickets = facilities.flatMap(f => f.tickets.flatMap(s => s.ticket_types.map(t => ({ ...t, service_id: s._id, service_name: s.name, facility_name: f.name, base_price: t.price }))));
  const ticket = tickets.find(t => t._id === params.get('type')) || tickets.find(t => t.service_id === params.get('ticket')) || tickets[0];
  const ticketId = ticket?.service_id;
  const typeId = ticket?._id;
  const [from, setFrom] = useState(localDate);
  const [to, setTo] = useState(endDate);
  const [inventoryData, setInventoryData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryKey = `${ticketId}:${typeId}:${from}:${to}:${revision}`;
  const fetching = Boolean(ticketId) && inventoryData?.key !== queryKey;
  const fetchError = inventoryData?.key === queryKey ? inventoryData.error : '';
  const rows = inventoryData?.key === queryKey ? inventoryData.rows : [];

  useEffect(() => {
    if (!ticketId) return;
    let active = true;
    vendorApi.getTicketInventory(ticketId, { from, to })
      .then((res) => { if (active) setInventoryData({ key: queryKey, rows: res.data.filter(r => r.ticket_type_id === typeId), error: '' }); })
      .catch((err) => { if (active) setInventoryData({ key: queryKey, rows: [], error: err.message }); });
    return () => { active = false; };
  }, [ticketId, typeId, from, to, queryKey]);

  const openNew = () => {
    setSuccess('');
    setForm({ target_date: from, time_slot: 'ALL_DAY', total_qty: '', price: ticket.base_price, uses_ticket_price: true, booked_qty: 0 });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await vendorApi.saveTicketInventory(ticketId, { ticket_type_id: typeId, uses_ticket_price: Boolean(form.uses_ticket_price), inventory_id: form._id, target_date: form.target_date, time_slot: form.time_slot, total_qty: Number(form.total_qty), price: Number(form.price) });
      setFrom(form.target_date < from ? form.target_date : from);
      setTo(form.target_date > to ? form.target_date : to);
      setForm(null); setRevision((value) => value + 1);
      setSuccess('Đã lưu giá và hạn mức phát hành. Số vé đã đặt được giữ nguyên.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AttractionLayout activeScreen={7} title="Giá vé & Hạn mức theo ngày" description="Thiết lập số lượng phát hành cho từng hạng vé, ngày tham quan và khung giờ. Dữ liệu được lưu vào lịch bán vé của bạn.">
      <Notice error={loadError || error || fetchError} success={success} />
      {loading ? <p className="text-sm text-slate-500">Đang tải hạng vé...</p> : loadError ? <button onClick={reload} className={buttonClass}>Tải lại</button> : !tickets.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"><h2 className="font-bold text-lg">Chưa có hạng vé để cấu hình</h2><p className="text-sm text-slate-500 my-3">Bổ sung thông tin kinh doanh và tạo hạng vé trước khi thiết lập lịch bán.</p><Link to="/vendor/registration" className="text-primary-600 text-sm font-semibold">Thêm cơ sở & Hạng vé →</Link></div>
      ) : (
        <>
          <fieldset disabled={saving} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl border border-slate-200 bg-white p-5 mb-6">
            <div className="sm:col-span-2"><Field label="Cơ sở / Dịch vụ / Hạng vé"><select className={inputClass} value={typeId} onChange={(e) => { const next = tickets.find(t => t._id === e.target.value); setParams({ ticket: next.service_id, type: next._id }); setForm(null); setSuccess(''); }}>{tickets.map(item => <option key={item._id} value={item._id}>{item.facility_name} · {item.service_name} · {item.name}</option>)}</select></Field></div>
            <Field label="Từ ngày"><input type="date" required className={inputClass} value={from} onChange={(e) => { setFrom(e.target.value); setForm(null); }} /></Field>
            <Field label="Đến ngày"><input type="date" required min={from} className={inputClass} value={to} onChange={(e) => { setTo(e.target.value); setForm(null); }} /></Field>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><p className="text-sm text-slate-500">Giá cơ bản: <strong className="text-slate-800">{money(ticket.base_price)}</strong></p><button disabled={saving || fetching || Boolean(fetchError)} className={buttonClass} onClick={openNew}>+ Thiết lập ngày bán vé</button></div>
          {form && (
            <form onSubmit={save} className="mb-6 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">{form._id ? 'Cập nhật lịch bán vé' : 'Thiết lập giá & Hạn mức phát hành'}</h2>
              <fieldset disabled={saving} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Ngày tham quan *"><input required disabled={Boolean(form._id)} type="date" className={inputClass} value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Field>
                <Field label="Khung giờ"><select disabled={Boolean(form._id)} className={inputClass} value={form.time_slot === 'ALL_DAY' ? 'ALL_DAY' : 'TIMED'} onChange={(e) => setForm({ ...form, time_slot: e.target.value === 'ALL_DAY' ? 'ALL_DAY' : '09:00' })}><option value="ALL_DAY">Cả ngày</option><option value="TIMED">Giờ khởi hành / Vào cổng</option></select>{form.time_slot !== 'ALL_DAY' && <input aria-label="Giờ khởi hành" disabled={Boolean(form._id)} required type="time" className={`${inputClass} mt-2`} value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} />}</Field>
                <Field label="Giá bán trong ngày (VND) *"><input required disabled={Boolean(form.uses_ticket_price)} type="number" min="0" step="any" className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
                <Field label="Tổng số vé phát hành *"><input required type="number" min={form.booked_qty || 0} step="1" className={inputClass} value={form.total_qty} onChange={(e) => setForm({ ...form, total_qty: e.target.value })} /></Field>
              </fieldset>
              <label className="flex gap-2 items-center text-sm mt-4"><input disabled={saving} type="checkbox" checked={Boolean(form.uses_ticket_price)} onChange={e => setForm({ ...form, uses_ticket_price: e.target.checked, ...(e.target.checked ? { price: ticket.price } : {}) })} />Dùng giá hiện tại của hạng vé; bỏ chọn để thiết lập giá riêng cho ngày này.</label>
              <p className="text-xs text-slate-500 mt-4">Hạn mức là tổng số vé của ngày và khung giờ này, bao gồm vé đã đặt. Nhập 0 để ngừng phát hành khi chưa có vé đặt.</p>
              {form.booked_qty > 0 && <p className="text-xs text-amber-700 mt-2">Đã đặt {form.booked_qty} vé. Hạn mức tối thiểu: {form.booked_qty}.</p>}
              <div className="flex gap-3 mt-5"><button disabled={saving} className={buttonClass}>{saving ? 'Đang lưu...' : 'Lưu lịch bán vé'}</button><button type="button" disabled={saving} onClick={() => setForm(null)} className="text-sm text-slate-500">Hủy</button></div>
            </form>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 flex justify-between items-center"><h2 className="font-bold">Lịch phát hành · {ticket.name}</h2><button disabled={fetching || saving} className="text-xs font-semibold text-primary-600" onClick={() => setRevision((value) => value + 1)}>Tải lại</button></div>
            {fetching ? <p className="p-6 text-sm text-slate-500">Đang tải lịch bán vé...</p> : fetchError ? <p className="p-6 text-sm text-slate-500">Không tải được lịch bán vé. Vui lòng tải lại.</p> : !rows.length ? <p className="p-6 text-sm text-slate-500">Chưa thiết lập lịch bán vé trong khoảng ngày này. Thêm ngày bán để phát hành vé.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Ngày', 'Khung giờ', 'Giá bán', 'Hạn mức', 'Đã đặt', 'Còn lại', ''].map((label, index) => <th key={index} className="text-left px-5 py-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row._id} className="border-t border-slate-100"><td className="px-5 py-4">{new Date(row.target_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</td><td className="px-5 py-4">{row.time_slot === 'ALL_DAY' ? 'Cả ngày' : row.time_slot}</td><td className="px-5 py-4 font-semibold">{money(row.price)}</td><td className="px-5 py-4">{row.total_qty}</td><td className="px-5 py-4">{row.booked_qty}</td><td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${row.available_qty ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.available_qty || 'Hết vé'}</span></td><td className="px-5 py-4"><button disabled={saving} className="text-xs font-semibold text-primary-600" onClick={() => { setSuccess(''); setForm({ ...row, target_date: row.target_date.slice(0, 10) }); }}>Chỉnh sửa</button></td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </AttractionLayout>
  );
}
