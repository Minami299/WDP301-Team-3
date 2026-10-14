import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAttractions from '../../hooks/useAttractions';
import { vendorApi } from '../../services/api/vendorApi';
import { IconTicket, IconMapPin, IconPlus } from '../../components/Icons';
import AttractionLayout, { Field, Notice } from './AttractionLayout';
import { inputClass, buttonClass, categories } from '../../utils/attractionUi';
import { businessTypes } from '../../utils/vendorRegistration';
import VendorServiceFields from '../../components/VendorServiceFields';
import { ticketTypesForForm } from '../../utils/ticketTypes';
import TicketTypeManager from '../../components/TicketTypeManager';
import { blankVendorService, validateServiceFields, servicePayload, serviceCategories, pricingUnits } from '../../utils/vendorServices';

const blankFacility = { name: '', city: '', address: '', description: '', business_type: 'ATTRACTION', contact_phone: '', attraction_category: 'ATTRACTION', status: 'ACTIVE' };
const blankTicket = { ...blankVendorService, service_category: 'TICKET', pricing_unit: 'TICKET' };

export default function AttractionRegistrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { facilities, loading, error: loadError, reload } = useAttractions();
  const [facilityForm, setFacilityForm] = useState(null);
  const [ticketForm, setTicketForm] = useState(() => searchParams.get('createTicket') ? { ...blankTicket, ticket_types: ticketTypesForForm(blankTicket), facility_id: searchParams.get('createTicket') } : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serviceErrors, setServiceErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const closeTicket = () => {
    setTicketForm(null);
    if (searchParams.has('createTicket')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('createTicket');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const saveFacility = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const { _id, ...payload } = facilityForm;
      if (_id) await vendorApi.updateAttraction(_id, payload);
      else await vendorApi.createAttraction(payload);
      setFacilityForm(null);
      setSuccess(_id ? 'Đã cập nhật thông tin kinh doanh.' : 'Đã thêm cơ sở. Hãy tạo hạng vé và thiết lập lịch bán vé.');
      reload();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const saveTicket = async (event) => {
    event.preventDefault();
    if (uploading || saving) return;
    const fieldErrors = validateServiceFields(ticketForm);
    setServiceErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { _id, facility_id } = ticketForm;
      const payload = servicePayload(ticketForm);
      if (_id) await vendorApi.updateTicket(_id, payload);
      else await vendorApi.createTicket(facility_id, payload);
      closeTicket(); setSuccess('Đã lưu dịch vụ và hạng vé. Khách hàng có thể chọn vé trên trang của cơ sở đang hoạt động.');
      reload();
    } catch (err) { setError(err.message); setServiceErrors(Object.fromEntries((err.errors || []).map(e => [e.field, e.message]))); }
    finally { setSaving(false); }
  };
  const openFacility = (facility) => {
    setTicketForm(null); setError(''); setSuccess('');
    setFacilityForm(facility ? { _id: facility._id, name: facility.name, city: facility.city, address: facility.address, description: facility.description || '', business_type: facility.business_type || 'ATTRACTION', contact_phone: facility.contact_phone || '', attraction_category: facility.attraction_category || 'ATTRACTION', status: facility.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' } : { ...blankFacility });
  };
  const openTicket = (facilityId, ticket) => {
    setFacilityForm(null); setError(''); setSuccess(''); setServiceErrors({});
    setTicketForm(ticket ? { ...blankTicket, _id: ticket._id, facility_id: facilityId, name: ticket.name, ticket_types: ticketTypesForForm(ticket), ticket_audience: ticket.ticket_audience || 'ALL', description: ticket.description || '', service_category: ticket.service_category || 'TICKET', location: ticket.location || '', pricing_unit: ticket.pricing_unit || 'TICKET', duration_minutes: ticket.duration_minutes ?? '', photos: ticket.photos || [] } : { ...blankTicket, ticket_types: ticketTypesForForm(blankTicket), photos: [], facility_id: facilityId });
  };
  const deleteService = async () => {
    if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try { await vendorApi.deleteTicket(deleteTarget._id); setDeleteTarget(null); setSuccess('Đã xóa dịch vụ.'); reload(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AttractionLayout activeScreen={10} title="Thông tin kinh doanh & Hạng vé" description="Đăng ký và cập nhật điểm tham quan, tour du lịch, hoạt động trải nghiệm cùng các hạng vé của bạn.">
      <Notice error={error || loadError} success={success} />
      {deleteTarget && <div role="dialog" aria-modal="true" aria-label="Xác nhận xóa dịch vụ" className="mb-5 rounded-xl border border-rose-200 bg-white p-5"><h2 className="font-bold">Xóa dịch vụ “{deleteTarget.name}”?</h2><p className="text-sm text-slate-500 mt-2">Dịch vụ có dữ liệu đặt chỗ sẽ được giữ lại.</p><div className="flex gap-4 mt-4"><button disabled={saving} className="text-sm text-rose-600 font-semibold" onClick={deleteService}>{saving ? 'Đang xóa...' : 'Xác nhận xóa'}</button><button disabled={saving} className="text-sm text-slate-500" onClick={() => setDeleteTarget(null)}>Hủy</button></div></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-slate-500">{facilities.length} cơ sở kinh doanh</p>
        <button disabled={saving || loading || Boolean(loadError)} className={`${buttonClass} flex items-center gap-2`} onClick={() => openFacility()}><IconPlus size={16} /> Thêm cơ sở kinh doanh</button>
      </div>
      {facilityForm && (
        <form onSubmit={saveFacility} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-5">{facilityForm._id ? 'Cập nhật cơ sở kinh doanh' : 'Bổ sung thông tin kinh doanh'}</h2>
          <fieldset disabled={saving} className="grid sm:grid-cols-2 gap-4">
            <Field label="Tên cơ sở / Tour / Trải nghiệm *"><input required maxLength={200} className={inputClass} value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} placeholder="VD: Tour khám phá Hội An" /></Field>
            <Field label="Loại hoạt động / Điểm đến"><select className={inputClass} value={facilityForm.attraction_category} onChange={(e) => setFacilityForm({ ...facilityForm, attraction_category: e.target.value })}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
            <Field label="Tỉnh / Thành phố *"><input required maxLength={120} className={inputClass} value={facilityForm.city} onChange={(e) => setFacilityForm({ ...facilityForm, city: e.target.value })} placeholder="VD: Đà Nẵng" /></Field>
            <Field label="Địa chỉ / Điểm tập trung *"><input required maxLength={300} className={inputClass} value={facilityForm.address} onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })} /></Field>
            <Field label="Business Type"><select className={inputClass} value={facilityForm.business_type} onChange={(e) => setFacilityForm({ ...facilityForm, business_type: e.target.value })}>{Object.entries(businessTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
            <Field label="Phone Number *"><input required type="tel" maxLength={30} className={inputClass} value={facilityForm.contact_phone} onChange={(e) => setFacilityForm({ ...facilityForm, contact_phone: e.target.value })} placeholder="VD: 0912345678" /></Field>
            <div className="sm:col-span-2"><Field label="Mô tả hoạt động, lịch trình và thông tin kinh doanh"><textarea rows={4} maxLength={5000} className={inputClass} value={facilityForm.description} onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })} /></Field></div>
            <Field label="Trạng thái kinh doanh"><select className={inputClass} value={facilityForm.status} onChange={(e) => setFacilityForm({ ...facilityForm, status: e.target.value })}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm ngưng hoạt động</option></select></Field>
          </fieldset>
          <div className="flex gap-3 mt-5"><button disabled={saving} className={buttonClass}>{saving ? 'Đang lưu...' : 'Lưu thông tin kinh doanh'}</button><button type="button" disabled={saving} onClick={() => setFacilityForm(null)} className="text-sm text-slate-500">Hủy</button></div>
        </form>
      )}
      {ticketForm && (
        <form onSubmit={saveTicket} noValidate className="mb-6 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-1">{ticketForm._id ? 'Cập nhật dịch vụ / Hạng vé' : 'Thêm dịch vụ / Hạng vé'}</h2>
          <p className="text-sm text-slate-500 mb-5">{facilities.find((f) => f._id === ticketForm.facility_id)?.name}</p>
          <VendorServiceFields value={ticketForm} disabled={saving || uploading} errors={serviceErrors} onBusyChange={setUploading} onChange={(key, value) => { setTicketForm({ ...ticketForm, [key]: value }); setServiceErrors((previous) => ({ ...previous, [key]: undefined })); }} />
          <div className="flex gap-3 mt-5"><button disabled={saving || uploading} className={buttonClass}>{saving ? 'Đang lưu...' : 'Lưu dịch vụ'}</button><button type="button" disabled={saving || uploading} onClick={closeTicket} className="text-sm text-slate-500">Hủy</button></div>
        </form>
      )}
      {loading ? <p className="text-sm text-slate-500">Đang tải thông tin kinh doanh...</p> : loadError ? <button className={buttonClass} onClick={reload}>Tải lại</button> : !facilities.length ? (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-white p-10 text-center"><IconTicket size={36} className="mx-auto text-primary-500 mb-4" /><h2 className="font-bold text-lg">Tài khoản vendor của bạn đã sẵn sàng</h2><p className="text-sm text-slate-500 mt-2 mb-5">Thêm cơ sở kinh doanh đầu tiên, sau đó cấu hình vé người lớn, trẻ em và hạn mức bán theo ngày.</p><button className={buttonClass} onClick={() => openFacility()}>Bổ sung thông tin kinh doanh</button></div>
      ) : (
        <div className="space-y-6">{facilities.map((facility) => (
          <section key={facility._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex flex-wrap gap-4 justify-between border-b border-slate-100">
              <div><span className="text-xs text-primary-700 bg-primary-50 px-2 py-1 rounded-lg">{categories[facility.attraction_category] || 'Điểm tham quan'}</span><h2 className="text-xl font-bold text-slate-900 mt-3">{facility.name}</h2><p className="flex items-center gap-1 text-xs text-slate-500 mt-2"><IconMapPin size={14} />{facility.address}, {facility.city}</p><p className="text-xs mt-2 text-slate-500">{facility.status === 'INACTIVE' ? 'Tạm ngưng hoạt động' : facility.status === 'ACTIVE' ? 'Đang hoạt động' : facility.status}</p></div>
              <button disabled={saving} onClick={() => openFacility(facility)} className="self-start text-sm font-semibold text-primary-600">Chỉnh sửa thông tin</button>
            </div>
            {(facility.business_type || facility.contact_phone) && <p className="px-6 pt-4 text-xs text-slate-500">{businessTypes[facility.business_type]}{facility.contact_phone && ` · Liên hệ: ${facility.contact_phone}`}</p>}
            {facility.description && <p className="px-6 pt-4 text-sm text-slate-600 whitespace-pre-wrap">{facility.description}</p>}
            <div className="px-6 pt-4"><Link to={`/facilities/${facility._id}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-600">Xem vé trên trang khách hàng →</Link>{facility.status !== 'ACTIVE' && <p className="text-xs text-amber-700 mt-2">Chọn trạng thái Đang hoạt động trong thông tin cơ sở để hiển thị vé cho khách hàng.</p>}</div>
            <div className="p-5 sm:p-6"><div className="flex justify-between gap-3 mb-4"><h3 className="font-bold">Dịch vụ & Hạng vé ({facility.tickets.length})</h3><button disabled={saving || uploading} onClick={() => openTicket(facility._id)} className="text-sm text-primary-600 font-semibold">+ Thêm dịch vụ</button></div>
              {!facility.tickets.length ? <p className="text-sm text-slate-500">Chưa có dịch vụ. Thêm dịch vụ để bắt đầu cấu hình hạng vé.</p> : <div className="grid lg:grid-cols-2 gap-3">{facility.tickets.map((ticket) => <div key={ticket._id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500 mb-1">{serviceCategories[ticket.service_category] || 'Ticket'} · {pricingUnits[ticket.pricing_unit] || 'Vé'}</p><h4 className="font-semibold">{ticket.name}</h4>{ticket.location && <p className="text-xs text-slate-500 mt-2">{ticket.location}</p>}{ticket.description && <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">{ticket.description}</p>}<div className="flex flex-wrap gap-2 mt-2">{ticket.photos?.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={ticket.name} className="w-20 h-16 rounded-lg object-cover" />)}</div><TicketTypeManager service={ticket} onSaved={reload} /><div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold text-primary-600"><button disabled={saving || uploading} onClick={() => openTicket(facility._id, ticket)}>Sửa dịch vụ</button><button disabled={saving || uploading} onClick={() => setDeleteTarget(ticket)} className="text-rose-600">Xóa dịch vụ</button><Link to={`/vendor/inventory?ticket=${ticket._id}`}>Giá & Hạn mức theo ngày →</Link></div></div>)}</div>}
            </div>
          </section>
        ))}</div>
      )}
    </AttractionLayout>
  );
}
