import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import BusinessInformationForm from '../../components/BusinessInformationForm';
import VendorAccountFields from '../../components/VendorAccountFields';
import VendorServiceFields from '../../components/VendorServiceFields';
import { TicketTypesSummary } from '../../components/TicketTypesFields';
import { IconCheck, IconTicket, IconArrowRight } from '../../components/Icons';
import { emptyBusinessInformation, validateAccountInformation, validateBusinessInformation, businessTypes } from '../../utils/vendorRegistration';
import { makeVendorService, validateServiceList, servicePayload, serviceCategories, pricingUnits } from '../../utils/vendorServices';
import { buttonClass } from '../../utils/attractionUi';
import { PENDING_APPROVAL_PATH } from '../../services/storage/pendingRegistration';

const steps = [
  ['Account Information', 'Tài khoản & Điều khoản'], ['Business Information', 'Thông tin kinh doanh'],
  ['Service Information', 'Dịch vụ & Giá'], ['Review & Submit', 'Xác nhận & Hoàn tất']
];

export default function AttractionVendorRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, register, becomePartner } = useAuth();
  const existingAccount = currentUser?.role === 'CUSTOMER';
  const [account, setAccount] = useState(() => ({ full_name: currentUser?.full_name || location.state?.account?.full_name || '', email: currentUser?.email || location.state?.account?.email || '', password: '', confirm_password: '', agree_terms: false }));
  const [business, setBusiness] = useState({ ...emptyBusinessInformation });
  const [services, setServices] = useState(() => [makeVendorService()]);
  const [activeService, setActiveService] = useState(0);
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const submitting = useRef(false);
  const busy = loading || uploadCount > 0;
  const validate = (index) => index === 1 ? validateAccountInformation(account, existingAccount) : index === 2 ? validateBusinessInformation(business) : validateServiceList(services);
  const goTo = (target) => {
    if (busy) return;
    if (target > step) {
      for (let index = 1; index < target; index++) {
        const invalid = validate(index);
        if (Object.keys(invalid).length) { setErrors(invalid); setStep(index); if (index === 3) focusInvalidService(invalid); return; }
      }
    }
    setErrors({}); setServerError(''); setStep(target); setFurthestStep((previous) => Math.max(previous, target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const focusInvalidService = (invalid) => {
    const field = Object.keys(invalid).find((key) => /^services\.\d+\./.test(key));
    if (field) setActiveService(Number(field.split('.')[1]));
  };
  const clearField = (key) => setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([field]) => field !== key && !field.startsWith(`${key}.`))));
  const changeService = (index, key, value) => {
    setServices((previous) => previous.map((service, position) => position === index ? { ...service, [key]: value, ...(key === 'service_category' && !['TOUR', 'EXPERIENCE'].includes(value) ? { duration_minutes: '' } : {}) } : service));
    clearField(`services.${index}.${key}`);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current || busy) return;
    if (step < 4) { goTo(step + 1); return; }
    for (let index = 1; index <= 3; index++) {
      const invalid = validate(index);
      if (Object.keys(invalid).length) { setErrors(invalid); setStep(index); if (index === 3) focusInvalidService(invalid); return; }
    }
    submitting.current = true; setLoading(true); setServerError('');
    try {
      const payload = { ...business, role_name: 'ACTIVITY_VENDOR', agree_terms: account.agree_terms, services: services.map(servicePayload) };
      const result = existingAccount ? await becomePartner(payload) : await register({ ...payload, full_name: account.full_name, email: account.email, password: account.password, confirm_password: account.confirm_password });
      if (result.status !== 'PENDING') throw new Error('Máy chủ chưa xác nhận trạng thái chờ xét duyệt.');
      navigate(PENDING_APPROVAL_PATH, { replace: true });
    } catch (error) {
      setServerError(error.message);
      const fields = Object.fromEntries((error.errors || []).map((item) => [item.field, item.message]));
      if (error.status === 409) fields.email = 'Email này đã được đăng ký';
      setErrors(fields);
      if (['full_name', 'email', 'password', 'confirm_password', 'agree_terms'].some((key) => fields[key])) setStep(1);
      else if (Object.keys(fields).some((key) => key.startsWith('services'))) { setStep(3); focusInvalidService(fields); }
      else if (Object.keys(fields).length) setStep(2);
    } finally { submitting.current = false; setLoading(false); }
  };

  if (currentUser && !existingAccount) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="bg-white rounded-2xl border p-8 max-w-lg text-center"><h1 className="text-xl font-bold">Tài khoản đã có vai trò đối tác</h1><p className="text-sm text-slate-500 my-4">Quản lý cơ sở và dịch vụ từ dashboard của bạn.</p><Link className={buttonClass} to="/vendor">Mở dashboard</Link></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3"><Link to="/" className="flex items-center gap-2"><span className="rounded-xl bg-primary-500 text-white p-2"><IconTicket size={20} /></span><span className="text-xl font-heading font-extrabold">travelio</span><span className="hidden sm:inline text-xs bg-primary-50 text-primary-600 rounded-lg px-2 py-1">Partner Hub</span></Link><Link to="/auth/login" className="text-xs text-primary-600 font-semibold">Đã có tài khoản? Đăng nhập</Link></div></header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10 flex gap-8 lg:gap-12">
        <aside className="hidden md:block w-56 shrink-0"><p className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-6">Attraction Vendor</p><nav className="space-y-6">{steps.map(([label, description], index) => <button key={label} type="button" disabled={busy || index + 1 > furthestStep} onClick={() => goTo(index + 1)} className="flex items-center gap-3 text-left disabled:cursor-default"><span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${step === index + 1 ? 'bg-primary-500 text-white ring-4 ring-primary-100' : index + 1 < step ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>{index + 1 < step ? <IconCheck size={15} /> : index + 1}</span><span><span className={`text-xs font-semibold block ${step === index + 1 ? 'text-primary-600' : 'text-slate-700'}`}>{label}</span><span className="text-[11px] text-slate-500">{description}</span></span></button>)}</nav><p className="text-xs text-slate-500 mt-8">Tài khoản chỉ được tạo khi bạn xác nhận ở bước cuối.</p></aside>
        <main className="min-w-0 flex-1 max-w-3xl">
          <p className="text-xs font-semibold text-primary-600 mb-2">Bước {step} / 4 · Đăng ký Attraction Vendor</p>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-label="Tiến trình đăng ký" className="h-1.5 bg-slate-200 rounded-full mb-6"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${step * 25}%` }} /></div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 mb-2">{steps[step - 1][0]}</h1><p className="text-sm text-slate-500 mb-6">{steps[step - 1][1]}</p>
          {serverError && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 mb-5">{serverError}</p>}
          <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm">
            {step === 1 && <VendorAccountFields value={account} existingAccount={existingAccount} disabled={busy} errors={errors} onChange={(key, value) => { setAccount({ ...account, [key]: value }); clearField(key); }} />}
            {step === 2 && <BusinessInformationForm value={business} disabled={busy} errors={errors} description="Thông tin cơ sở kinh doanh sẽ được liên kết với tài khoản vendor của bạn." onChange={(key, value) => { setBusiness({ ...business, [key]: value }); clearField(key); }} />}
            {step === 3 && <div className="space-y-5">
              <p className="text-sm text-slate-500">Mỗi dịch vụ có danh sách hạng vé và giá riêng. Thêm ít nhất một hạng vé hợp lệ cho từng dịch vụ.</p>
              {errors.services && <p role="alert" className="text-sm text-rose-600">{errors.services}</p>}
              {services.map((service, index) => <section key={service.client_id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 flex items-center justify-between gap-3">
                  <button type="button" disabled={busy} className="text-left flex-1 min-w-0" onClick={() => setActiveService(index)}><span className="font-semibold text-sm block truncate">{index + 1}. {service.name || 'Dịch vụ mới'}</span><span className="text-xs text-slate-500">{serviceCategories[service.service_category]} · {service.ticket_types.length} hạng vé</span></button>
                  <button type="button" disabled={busy} onClick={() => { setServices(services.filter((_, position) => index !== position)); setActiveService(Math.max(0, index - 1)); setErrors({}); }} className="text-xs font-semibold text-rose-600">Xóa</button>
                </div>
                {activeService === index && <div className="p-4"><VendorServiceFields value={service} prefix={`services.${index}.`} errors={errors} disabled={busy} onChange={(key, value) => changeService(index, key, value)} onBusyChange={(uploading) => setUploadCount((count) => count + (uploading ? 1 : -1))} /></div>}
              </section>)}
              <button type="button" disabled={busy || services.length >= 20} onClick={() => { setServices([...services, makeVendorService()]); setActiveService(services.length); clearField('services'); }} className="w-full rounded-xl border border-dashed border-primary-500 text-primary-600 text-sm font-semibold p-3 disabled:opacity-50">+ Add Another Service</button>
            </div>}
            {step === 4 && <div className="space-y-6">
              <section><div className="flex justify-between gap-3 mb-3"><h2 className="font-bold">Account Information</h2><button disabled={busy} type="button" className="text-sm text-primary-600" onClick={() => goTo(1)}>Chỉnh sửa</button></div><p className="text-sm text-slate-700">{account.full_name}</p><p className="text-sm text-slate-500 break-all">{account.email}</p><p className="text-xs text-slate-500 mt-1">Đã đồng ý Terms & Privacy Policy.</p></section>
              <section className="border-t border-slate-100 pt-5"><div className="flex justify-between gap-3 mb-3"><h2 className="font-bold">Business Information</h2><button disabled={busy} type="button" className="text-sm text-primary-600" onClick={() => goTo(2)}>Chỉnh sửa</button></div><h3 className="font-semibold">{business.facility_name}</h3><p className="text-sm text-slate-600">{business.facility_address}, {business.facility_city}</p><p className="text-sm text-slate-600 mt-1">{business.phone} · {businessTypes[business.business_type]}</p><p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{business.facility_description}</p></section>
              <section className="border-t border-slate-100 pt-5"><div className="flex justify-between gap-3 mb-3"><h2 className="font-bold">Services ({services.length})</h2><button disabled={busy} type="button" className="text-sm text-primary-600" onClick={() => goTo(3)}>Chỉnh sửa</button></div>{services.map((service, index) => <div key={service.client_id} className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-3"><div className="flex justify-between gap-3"><h3 className="font-semibold">{service.name}</h3><button type="button" disabled={busy} className="text-xs text-primary-600" onClick={() => { setActiveService(index); goTo(3); }}>Sửa dịch vụ & hạng vé</button></div><p className="text-xs text-slate-500 mt-1">{serviceCategories[service.service_category]}{service.location && ` · ${service.location}`} · {pricingUnits[service.pricing_unit]}</p><p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{service.description}</p><TicketTypesSummary types={service.ticket_types} /><div className="flex flex-wrap gap-2 mt-3">{service.photos.map((photo, i) => <img key={`${photo}-${i}`} src={photo} alt={service.name} className="w-20 h-16 rounded-lg object-cover" />)}</div></div>)}</section>
            </div>}
            <div className="border-t border-slate-100 pt-5 mt-7 flex items-center justify-between gap-3"><button type="button" disabled={busy} onClick={() => step === 1 ? navigate('/auth/register') : goTo(step - 1)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">Back</button><button type="submit" disabled={busy} className={`${buttonClass} flex items-center gap-2`}>{loading ? 'Đang tạo tài khoản...' : step === 4 ? 'Create Vendor Account' : 'Continue'}{!busy && <IconArrowRight size={16} />}</button></div>
          </form>
        </main>
      </div>
    </div>
  );
}
