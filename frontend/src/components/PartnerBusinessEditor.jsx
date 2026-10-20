import BusinessInformationForm from './BusinessInformationForm';
import VendorServiceFields from './VendorServiceFields';
import ImageUpload from './ImageUpload';
import { ApplicationField } from './PartnerApplicationFields';
import { partnerInputClass } from '../utils/partnerApplication';

export default function PartnerBusinessEditor({ role, business, onChange, disabled, errors, onBusyChange }) {
  const change = (key, value) => onChange({ ...business, [key]: value });
  return <fieldset disabled={disabled} className="space-y-5">
    {role === 'ACTIVITY_VENDOR' ? <>
      <BusinessInformationForm value={business} onChange={change} errors={errors} disabled={disabled} />
      {business.services?.map((service, index) => <details key={index} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Dịch vụ {index + 1}: {service.name}</summary><div className="mt-4"><VendorServiceFields value={service} prefix={`services.${index}.`} disabled={disabled} errors={errors} onBusyChange={onBusyChange} onChange={(key, value) => change('services', business.services.map((item, i) => i === index ? { ...item, [key]: value } : item))} /></div></details>)}
    </> : <>
      <div className="grid gap-4 sm:grid-cols-2">{[['facility_name', 'Tên cơ sở'], ['facility_address', 'Địa chỉ'], ['facility_city', 'Tỉnh / thành phố'], ['phone', 'Điện thoại']].map(([key, label]) => <ApplicationField key={key} name={key} label={label} value={business[key]} onChange={value => change(key, value)} errors={errors} required disabled={disabled} />)}</div>
      <label className="block text-sm font-semibold">Mô tả cơ sở<textarea className={`${partnerInputClass} mt-2`} rows={3} maxLength={5000} value={business.facility_description || ''} onChange={e => change('facility_description', e.target.value)} /></label>
      {business.rooms?.map((room, index) => <details key={index} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Phòng {index + 1}: {room.name}</summary><div className="mt-4 space-y-4">
        <ApplicationField name={`rooms.${index}.name`} label="Tên loại phòng" value={room.name} onChange={value => change('rooms', business.rooms.map((item, i) => i === index ? { ...item, name: value } : item))} errors={errors} disabled={disabled} />
        <label className="block text-sm">Giá mỗi đêm (VND)<input type="number" min="0" value={room.price} className={`${partnerInputClass} mt-2`} onChange={e => change('rooms', business.rooms.map((item, i) => i === index ? { ...item, price: e.target.value } : item))} /></label>
        {errors[`rooms.${index}.price`] && <p role="alert" className="text-xs text-rose-700">{errors[`rooms.${index}.price`]}</p>}
        <ImageUpload value={room.photos} onChange={photos => change('rooms', business.rooms.map((item, i) => i === index ? { ...item, photos } : item))} disabled={disabled} onBusyChange={onBusyChange} error={errors[`rooms.${index}.photos`]} label="Ảnh phòng" />
      </div></details>)}
    </>}
  </fieldset>;
}
