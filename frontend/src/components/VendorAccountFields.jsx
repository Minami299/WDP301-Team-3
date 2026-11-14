import { useState } from 'react';
import { RegistrationFieldError } from './BusinessInformationForm';
import { IconEye, IconEyeOff } from './Icons';

export default function VendorAccountFields({ value, onChange, errors, existingAccount, disabled, partnerLabel = 'Attraction Vendor', includePersonal = false }) {
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const fields = [['full_name', 'Full Name', 'text', 'name'], ['email', 'Email Address', 'email', 'email'], ...(!existingAccount ? [['password', 'Password', 'password', 'new-password'], ['confirm_password', 'Confirm Password', 'password', 'new-password']] : [])];
  const togglePasswordVisibility = (key) => setVisiblePasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  return (
    <fieldset disabled={disabled} className="space-y-4">
      {existingAccount && <p className="text-sm bg-primary-50 text-sky-800 rounded-xl p-3">Sử dụng tài khoản hiện tại. Thông tin đăng nhập được giữ nguyên khi chuyển thành {partnerLabel}.</p>}
      {fields.map(([key, label, type, autoComplete]) => {
        const isPasswordField = type === 'password';
        const isVisible = Boolean(visiblePasswords[key]);
        return (
          <div key={key}>
            <label htmlFor={`vendor-${key}`} className="block mb-1.5 text-xs font-semibold text-slate-700">{label} *</label>
            <div className="relative">
              <input id={`vendor-${key}`} name={key} type={isPasswordField && isVisible ? 'text' : type} autoComplete={autoComplete} readOnly={existingAccount} value={value[key]} onChange={(event) => onChange(key, event.target.value)} maxLength={key === 'full_name' ? 120 : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `vendor-error-${key}` : undefined} className={`w-full rounded-xl border bg-white px-3 py-3 text-sm focus:outline-none focus:border-primary-500 ${isPasswordField ? 'pr-10' : ''} ${errors[key] ? 'border-rose-400' : 'border-slate-200'}`} />
              {isPasswordField && (
                <button type="button" onClick={() => togglePasswordVisibility(key)} aria-label={isVisible ? `Hide ${label}` : `Show ${label}`} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none">
                  {isVisible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              )}
            </div>
            <RegistrationFieldError field={key} errors={errors} />
          </div>
        );
      })}
      {includePersonal && <>
        <div><label htmlFor="vendor-phone" className="block mb-1.5 text-xs font-semibold text-slate-700">Phone</label><input id="vendor-phone" type="tel" value={value.phone || ''} onChange={(event) => onChange('phone', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></div>
        <div><label htmlFor="vendor-host-type" className="block mb-1.5 text-xs font-semibold text-slate-700">Partner type</label><select id="vendor-host-type" value={value.host_type || 'private'} onChange={(event) => onChange('host_type', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="private">Individual / Private</option><option value="professional">Business / Professional</option></select></div>
        <div><label htmlFor="vendor-nationality" className="block mb-1.5 text-xs font-semibold text-slate-700">Nationality</label><input id="vendor-nationality" value={value.nationality || ''} onChange={(event) => onChange('nationality', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></div>
        <div><label htmlFor="vendor-birth-date" className="block mb-1.5 text-xs font-semibold text-slate-700">Date of birth</label><input id="vendor-birth-date" type="date" value={value.birth_date || ''} onChange={(event) => onChange('birth_date', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></div>
        <div className="sm:col-span-2"><label htmlFor="vendor-residence" className="block mb-1.5 text-xs font-semibold text-slate-700">Residence</label><input id="vendor-residence" value={value.residence_country || ''} onChange={(event) => onChange('residence_country', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></div>
        <div><label htmlFor="vendor-language" className="block mb-1.5 text-xs font-semibold text-slate-700">Communication language</label><select id="vendor-language" value={value.preferred_language || 'Tiếng Việt'} onChange={(event) => onChange('preferred_language', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option>Tiếng Việt</option><option>English</option></select></div>
      </>}
      {!existingAccount && <p className="text-xs text-slate-500">Mật khẩu có ít nhất 8 ký tự, gồm chữ cái và chữ số.</p>}
      <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Điều khoản tài khoản đăng ký Travelio</summary><p className="mt-2 leading-5">Bạn cung cấp thông tin đăng nhập trung thực, bảo mật mật khẩu và xác minh email. Travelio sử dụng thông tin này để quản lý tài khoản và liên hệ về hồ sơ. Hoàn tất bước này chưa cấp quyền kinh doanh. Cam kết đại diện, thỏa thuận đối tác và thông báo xử lý tài liệu được trình bày riêng trước khi gửi xét duyệt.</p></details>
      <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={value.agree_terms} onChange={(event) => onChange('agree_terms', event.target.checked)} className="mt-0.5" /><span>Tôi đã đọc và đồng ý điều khoản tài khoản đăng ký Travelio.</span></label>
      <RegistrationFieldError field="agree_terms" errors={errors} />
    </fieldset>
  );
}
