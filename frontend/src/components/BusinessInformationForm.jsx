import { businessTypes } from '../utils/vendorRegistration';

export function RegistrationFieldError({ field, errors }) {
  return errors[field] ? <p id={`vendor-error-${field}`} className="mt-1.5 text-xs text-danger-500">{errors[field]}</p> : null;
}

export default function BusinessInformationForm({ value, onChange, errors, disabled, description = 'Thông tin kinh doanh cơ bản. Hình ảnh, tour, giá vé và lịch hoạt động sẽ được bổ sung trong dashboard.' }) {
  const inputClass = (field) => `w-full px-3 py-2.5 bg-white border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition ${errors[field] ? 'border-danger-500' : 'border-border'}`;
  const attributes = (field) => ({
    id: `vendor-${field}`, name: field, value: value[field],
    onChange: (event) => onChange(field, event.target.value),
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `vendor-error-${field}` : undefined,
    className: inputClass(field)
  });
  const fields = [
    ['facility_name', 'Tên cơ sở kinh doanh', 'VD: Khu du lịch Bà Nà Hills', 200, 'text', 'organization'],
    ['facility_address', 'Địa chỉ kinh doanh', 'VD: Thôn An Sơn, Hòa Ninh, Hòa Vang', 300, 'text', 'street-address'],
    ['facility_city', 'Tỉnh / Thành phố', 'VD: Đà Nẵng', 120, 'text', 'address-level1'],
    ['phone', 'Số điện thoại liên hệ', 'VD: 0912345678', 30, 'tel', 'tel']
  ];
  return (
    <fieldset disabled={disabled} className="rounded-2xl border border-border bg-slate-50/70 p-4 space-y-3.5">
      <legend className="px-1 text-xs font-bold text-text-primary">Thông tin cơ sở kinh doanh</legend>
      <p className="text-xs text-text-secondary">{description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {fields.map(([field, label, placeholder, maxLength, type, autoComplete]) => (
          <div key={field}>
            <label htmlFor={`vendor-${field}`} className="text-xs font-semibold text-text-primary mb-1.5 block">{label} <span className="text-danger-500">*</span></label>
            <input {...attributes(field)} required type={type} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} />
            <RegistrationFieldError field={field} errors={errors} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="vendor-business_type" className="text-xs font-semibold text-text-primary mb-1.5 block">Loại hình kinh doanh</label>
          <select {...attributes('business_type')}>{Object.entries(businessTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <RegistrationFieldError field="business_type" errors={errors} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="vendor-facility_description" className="text-xs font-semibold text-text-primary mb-1.5 block">Mô tả cơ sở <span className="font-normal text-text-secondary">(tùy chọn)</span></label>
          <textarea {...attributes('facility_description')} rows={3} maxLength={5000} placeholder="Giới thiệu ngắn về cơ sở kinh doanh" />
          <RegistrationFieldError field="facility_description" errors={errors} />
        </div>
      </div>
    </fieldset>
  );
}
