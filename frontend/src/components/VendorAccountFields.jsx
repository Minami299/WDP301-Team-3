import { RegistrationFieldError } from './BusinessInformationForm';

export default function VendorAccountFields({ value, onChange, errors, existingAccount, disabled }) {
  const fields = [['full_name', 'Full Name', 'text', 'name'], ['email', 'Email Address', 'email', 'email'], ...(!existingAccount ? [['password', 'Password', 'password', 'new-password'], ['confirm_password', 'Confirm Password', 'password', 'new-password']] : [])];
  return (
    <fieldset disabled={disabled} className="space-y-4">
      {existingAccount && <p className="text-sm bg-primary-50 text-sky-800 rounded-xl p-3">Sử dụng tài khoản hiện tại. Thông tin đăng nhập được giữ nguyên khi chuyển thành Attraction Vendor.</p>}
      {fields.map(([key, label, type, autoComplete]) => <div key={key}>
        <label htmlFor={`vendor-${key}`} className="block mb-1.5 text-xs font-semibold text-slate-700">{label} *</label>
        <input id={`vendor-${key}`} name={key} type={type} autoComplete={autoComplete} readOnly={existingAccount} value={value[key]} onChange={(event) => onChange(key, event.target.value)} maxLength={key === 'full_name' ? 120 : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `vendor-error-${key}` : undefined} className={`w-full rounded-xl border bg-white px-3 py-3 text-sm focus:outline-none focus:border-primary-500 ${errors[key] ? 'border-rose-400' : 'border-slate-200'}`} />
        <RegistrationFieldError field={key} errors={errors} />
      </div>)}
      {!existingAccount && <p className="text-xs text-slate-500">Mật khẩu có ít nhất 8 ký tự, gồm chữ cái và chữ số.</p>}
      <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={value.agree_terms} onChange={(event) => onChange('agree_terms', event.target.checked)} className="mt-0.5" /><span>I agree to the Terms & Privacy Policy.</span></label>
      <RegistrationFieldError field="agree_terms" errors={errors} />
    </fieldset>
  );
}
