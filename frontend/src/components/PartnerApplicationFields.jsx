import { partnerInputClass } from '../utils/partnerApplication';

export function ApplicationField({ name, label, value, onChange, options, errors = {}, required = false, disabled = false }) {
  const error = errors[name];
  const key = name.replace(/^profile\./, '');
  const inputProps = {
    name, value: value || '', onChange: e => onChange(e.target.value), disabled,
    maxLength: key.includes('address') ? 300 : key.includes('representative') ? 120 : 200,
    minLength: required && ['legal_name', 'registered_address', 'representative_name', 'representative_title'].includes(key) ? 2 : undefined,
  };
  if (['registration_number', 'tax_number'].includes(key)) {
    inputProps.inputMode = 'numeric';
    inputProps.pattern = '\\d{10}(?:-\\d{3}|\\d{3})?';
  }
  return <label className="block space-y-1.5 text-sm"><span className="font-semibold">{label}{required ? ' *' : ''}</span>
    {options ? <select name={name} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} aria-invalid={Boolean(error)} className={partnerInputClass}><option value="">Chọn...</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
      : <input {...inputProps} aria-invalid={Boolean(error)} className={partnerInputClass} />}
    {error && <span role="alert" className="block text-xs text-rose-700">{error}</span>}
  </label>;
}

export default function PartnerApplicationFields({ profile = {}, onChange, role, errors, disabled }) {
  const field = (key, label, options, required = true) => <ApplicationField key={key} name={`profile.${key}`} label={label} value={profile[key]} onChange={value => onChange(key, value)} options={options} errors={errors} required={required} disabled={disabled} />;
  const entityType = profile.entity_type || '';
  const registered = entityType === 'COMPANY' || entityType === 'HOUSEHOLD';
  const entityLabel = entityType === 'COMPANY' ? 'Tên doanh nghiệp' : entityType === 'HOUSEHOLD' ? 'Tên hộ kinh doanh' : 'Họ tên cá nhân';
  const authorityOptions = entityType === 'COMPANY'
    ? [['LEGAL_REPRESENTATIVE', 'Đại diện pháp luật'], ['AUTHORIZED', 'Được ủy quyền']]
    : entityType === 'HOUSEHOLD'
      ? [['OWNER', 'Chủ hộ / chủ sở hữu'], ['AUTHORIZED', 'Được ủy quyền']]
      : [['OWNER', 'Chủ sở hữu / người đăng ký'], ['AUTHORIZED', 'Được ủy quyền']];
  return <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
    {field('entity_type', 'Loại chủ thể', [['COMPANY', 'Doanh nghiệp'], ['HOUSEHOLD', 'Hộ kinh doanh'], ['INDIVIDUAL', 'Cá nhân — xét duyệt theo trường hợp']])}
    {field('legal_name', entityLabel)}
    {field('trading_name', 'Tên thương mại', undefined, false)}
    {field('registered_address', 'Địa chỉ đăng ký')}
    {registered && field('registration_number', entityType === 'COMPANY' ? 'Mã đăng ký doanh nghiệp' : 'Mã đăng ký hộ kinh doanh')}
    {registered && field('tax_number', 'Mã số thuế')}
    {field('representative_name', 'Họ tên người đại diện')}
    {field('representative_title', 'Chức vụ / tư cách đại diện')}
    {field('authority', 'Căn cứ đại diện', authorityOptions)}
    {role === 'HOTEL_OWNER' ? field('accommodation_type', 'Loại hình cơ sở lưu trú', [['HOTEL', 'Khách sạn'], ['RESORT', 'Khu nghỉ dưỡng'], ['VILLA', 'Villa / biệt thự'], ['HOMESTAY', 'Homestay'], ['MOTEL', 'Nhà nghỉ'], ['APARTMENT', 'Căn hộ lưu trú'], ['OTHER', 'Khác']]) : <>
      {field('supply_type', 'Vai trò cung cấp', [['DIRECT_OPERATOR', 'Trực tiếp vận hành'], ['DISTRIBUTOR', 'Đại lý / phân phối']])}
      {field('operator_name', 'Đơn vị vận hành thực tế')}
    </>}
    <div className="space-y-3 sm:col-span-2 text-sm">
      <label className="flex gap-2"><input type="checkbox" checked={profile.requires_license === true} onChange={e => onChange('requires_license', e.target.checked)} />Hoạt động có giấy phép chuyên ngành cần đối chiếu.</label>
      <label className="flex gap-2"><input type="checkbox" checked={profile.requires_insurance === true} onChange={e => onChange('requires_insurance', e.target.checked)} />Hoạt động có yêu cầu bảo hiểm cần đối chiếu.</label>
      <p className="text-xs text-slate-500">Chính sách demo Travelio. Người xét duyệt xác định tài liệu phù hợp từng trường hợp và có thể yêu cầu bổ sung. Không mặc định mọi đối tác phải có giấy phép lữ hành.</p>
    </div>
  </fieldset>;
}
