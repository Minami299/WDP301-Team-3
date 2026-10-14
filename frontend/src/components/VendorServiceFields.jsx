import { useState } from 'react';
import { facilityImageApi } from '../services/api/facilityImageApi';
import { serviceCategories, pricingUnits } from '../utils/vendorServices';
import TicketTypesFields from './TicketTypesFields';

export default function VendorServiceFields({ value, onChange, errors = {}, prefix = '', disabled, onBusyChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [photoDraft, setPhotoDraft] = useState(null);
  const field = (key, label, element) => {
    const error = errors[`${prefix}${key}`];
    return <div key={key}><label htmlFor={`service-${prefix}${key}`} className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>{element}<p id={`service-error-${prefix}${key}`} className="mt-1 text-xs text-rose-600">{error}</p></div>;
  };
  const attributes = (key) => ({ id: `service-${prefix}${key}`, name: `${prefix}${key}`, value: value[key] ?? '', onChange: (event) => onChange(key, event.target.value), className: `w-full rounded-xl border px-3 py-2.5 bg-white text-sm focus:outline-none focus:border-primary-500 ${errors[`${prefix}${key}`] ? 'border-rose-400' : 'border-slate-200'}`, 'aria-invalid': Boolean(errors[`${prefix}${key}`]), 'aria-describedby': errors[`${prefix}${key}`] ? `service-error-${prefix}${key}` : undefined });
  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploadError('');
    setPhotoDraft(null);
    if (value.photos.length + files.length > 8) { setUploadError('Mỗi dịch vụ có tối đa 8 ảnh'); return; }
    setUploading(true); onBusyChange?.(true);
    try { const response = await facilityImageApi.uploadRoomImages(files); onChange('photos', [...value.photos, ...response.data]); }
    catch (error) { setUploadError(error.message); }
    finally { setUploading(false); onBusyChange?.(false); }
  };
  return (
    <fieldset disabled={disabled || uploading} className="grid sm:grid-cols-2 gap-4">
      {field('name', 'Service Name *', <input {...attributes('name')} maxLength={200} placeholder="VD: Tour khám phá Hội An" />)}
      {field('service_category', 'Service Category *', <select {...attributes('service_category')}>{Object.entries(serviceCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      <div className="sm:col-span-2">{field('description', 'Service Description', <textarea {...attributes('description')} rows={3} maxLength={5000} placeholder="Giới thiệu dịch vụ, những gì bao gồm và điều kiện sử dụng" />)}</div>
      {field('location', value.service_category === 'TICKET' ? 'Location (optional)' : 'Location *', <input {...attributes('location')} maxLength={300} placeholder="Địa điểm cung cấp dịch vụ / điểm tập trung" />)}
      {field('pricing_unit', 'Pricing Unit *', <select {...attributes('pricing_unit')}>{Object.entries(pricingUnits).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      {['TOUR', 'EXPERIENCE'].includes(value.service_category) && field('duration_minutes', 'Duration (phút, optional)', <input {...attributes('duration_minutes')} type="number" min="1" step="1" placeholder="VD: 120" />)}
      <TicketTypesFields value={value.ticket_types} onChange={types => onChange('ticket_types', types)} prefix={`${prefix}ticket_types.`} errors={errors} disabled={disabled || uploading} />
      <div className="sm:col-span-2">
        {field('photos', 'Service Images (optional, tối đa 8 ảnh)', <textarea {...attributes('photos')} value={photoDraft ?? value.photos.join('\n')} onBlur={() => setPhotoDraft(null)} onChange={(event) => { setPhotoDraft(event.target.value); onChange('photos', event.target.value.split('\n').map((url) => url.trim()).filter(Boolean)); }} rows={2} placeholder="URL ảnh, mỗi dòng một ảnh; hoặc tải ảnh lên bên dưới" />)}
        <input aria-label="Tải ảnh dịch vụ" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={upload} className="mt-2 text-xs max-w-full" />
        {uploading && <p role="status" className="text-xs text-primary-600 mt-2">Đang tải ảnh...</p>}
        {uploadError && <p role="alert" className="text-xs text-rose-600 mt-2">{uploadError}</p>}
        <div className="flex flex-wrap gap-2 mt-3">{value.photos.filter((url) => /^https?:\/\//.test(url)).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`Ảnh dịch vụ ${index + 1}`} className="w-20 h-16 rounded-lg object-cover border border-slate-200" />)}</div>
      </div>
    </fieldset>
  );
}
