import { RegistrationFieldError } from './BusinessInformationForm';

export default function VendorAccountFields({ value, onChange, errors, existingAccount, disabled, partnerLabel = 'Attraction Vendor' }) {
  const fields = [['full_name', 'Full Name', 'text', 'name'], ['email', 'Email Address', 'email', 'email'], ...(!existingAccount ? [['password', 'Password', 'password', 'new-password'], ['confirm_password', 'Confirm Password', 'password', 'new-password']] : [])];
  return (
    <fieldset disabled={disabled} className="space-y-4">
      {existingAccount && <p className="text-sm bg-primary-50 text-sky-800 rounded-xl p-3">Sử dụng tài khoản hiện tại. Thông tin đăng nhập được giữ nguyên khi chuyển thành {partnerLabel}.</p>}
      {fields.map(([key, label, type, autoComplete]) => <div key={key}>
        <label htmlFor={`vendor-${key}`} className="block mb-1.5 text-xs font-semibold text-slate-700">{label} *</label>
        <input id={`vendor-${key}`} name={key} type={type} autoComplete={autoComplete} readOnly={existingAccount} value={value[key]} onChange={(event) => onChange(key, event.target.value)} maxLength={key === 'full_name' ? 120 : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `vendor-error-${key}` : undefined} className={`w-full rounded-xl border bg-white px-3 py-3 text-sm focus:outline-none focus:border-primary-500 ${errors[key] ? 'border-rose-400' : 'border-slate-200'}`} />
        <RegistrationFieldError field={key} errors={errors} />
      </div>)}
      {!existingAccount && <p className="text-xs text-slate-500">Mật khẩu có ít nhất 8 ký tự, gồm chữ cái và chữ số.</p>}
      <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Điều khoản tài khoản đăng ký Travelio</summary><p className="mt-2 leading-5">Bạn cung cấp thông tin đăng nhập trung thực, bảo mật mật khẩu và xác minh email. Travelio sử dụng thông tin này để quản lý tài khoản và liên hệ về hồ sơ. Hoàn tất bước này chưa cấp quyền kinh doanh. Cam kết đại diện, thỏa thuận đối tác và thông báo xử lý tài liệu được trình bày riêng trước khi gửi xét duyệt.</p></details>
      <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={value.agree_terms} onChange={(event) => onChange('agree_terms', event.target.checked)} className="mt-0.5" /><span>Tôi đã đọc và đồng ý điều khoản tài khoản đăng ký Travelio.</span></label>
      <RegistrationFieldError field="agree_terms" errors={errors} />
    </fieldset>
  );
}
