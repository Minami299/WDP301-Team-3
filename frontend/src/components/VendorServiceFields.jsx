import { serviceCategories, pricingUnits } from '../utils/vendorServices';
import TicketTypesFields from './TicketTypesFields';
import ImageUpload from './ImageUpload';

export default function VendorServiceFields({ value, onChange, errors = {}, prefix = '', disabled, onBusyChange }) {
  const field = (key, label, element) => {
    const error = errors[`${prefix}${key}`];
    return <div key={key}><label htmlFor={`service-${prefix}${key}`} className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>{element}<p id={`service-error-${prefix}${key}`} className="mt-1 text-xs text-rose-600">{error}</p></div>;
  };
  const attributes = (key) => ({ id: `service-${prefix}${key}`, name: `${prefix}${key}`, value: value[key] ?? '', onChange: (event) => onChange(key, event.target.value), className: `w-full rounded-xl border px-3 py-2.5 bg-white text-sm focus:outline-none focus:border-primary-500 ${errors[`${prefix}${key}`] ? 'border-rose-400' : 'border-slate-200'}`, 'aria-invalid': Boolean(errors[`${prefix}${key}`]), 'aria-describedby': errors[`${prefix}${key}`] ? `service-error-${prefix}${key}` : undefined });
  return (
    <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-4">
      {field('name', 'Service Name *', <input {...attributes('name')} maxLength={200} placeholder="VD: Tour khám phá Hội An" />)}
      {field('service_category', 'Service Category *', <select {...attributes('service_category')}>{Object.entries(serviceCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      <div className="sm:col-span-2">{field('description', 'Service Description', <textarea {...attributes('description')} rows={3} maxLength={5000} placeholder="Giới thiệu dịch vụ, những gì bao gồm và điều kiện sử dụng" />)}</div>
      {field('location', value.service_category === 'TICKET' ? 'Location (optional)' : 'Location *', <input {...attributes('location')} maxLength={300} placeholder="Địa điểm cung cấp dịch vụ / điểm tập trung" />)}
      {field('pricing_unit', 'Pricing Unit *', <select {...attributes('pricing_unit')}>{Object.entries(pricingUnits).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      {['TOUR', 'EXPERIENCE'].includes(value.service_category) && field('duration_minutes', 'Duration (phút, optional)', <input {...attributes('duration_minutes')} type="number" min="1" step="1" placeholder="VD: 120" />)}
      <TicketTypesFields value={value.ticket_types} onChange={types => onChange('ticket_types', types)} prefix={`${prefix}ticket_types.`} errors={errors} disabled={disabled} />
      <div className="sm:col-span-2">
        <ImageUpload label="Ảnh dịch vụ (không bắt buộc)" value={value.photos} onChange={photos => onChange('photos', photos)} kind="TICKET" maxImages={8} disabled={disabled} error={errors[`${prefix}photos`]} onBusyChange={onBusyChange} />
      </div>
    </fieldset>
  );
}
