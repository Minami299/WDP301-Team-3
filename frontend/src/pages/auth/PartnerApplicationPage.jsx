import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { authApi } from '../../services/api/authApi';
import { partnerApplicationApi as api } from '../../services/api/partnerApplicationApi';
import PartnerApplicationFields from '../../components/PartnerApplicationFields';
import { applicationLabels, documentLabels, partnerInputClass } from '../../utils/partnerApplication';
import PartnerBusinessEditor from '../../components/PartnerBusinessEditor';

const button = 'rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50';
const secondary = 'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50';

export default function PartnerApplicationPage() {
  const [params] = useSearchParams();
  const { currentUser, loading: authLoading, login, logout } = useAuth();
  const applicantId = currentUser?.id;
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verify, setVerify] = useState(params.get('verify') === '1');
  const [cooldown, setCooldown] = useState(params.get('verify') === '1' ? 60 : 0);
  const [record, setApp] = useState(null);
  const app = record && String(record.user_id) === String(applicantId) ? record : null;
  const [policy, setPolicy] = useState(null);
  const [profile, setProfile] = useState({});
  const [business, setBusiness] = useState({});
  const [consent, setConsent] = useState({});
  const [kind, setKind] = useState('AUTHORITY_PROOF');
  const [busy, setBusy] = useState(false);
  const [photoUploads, setPhotoUploads] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(params.get('sent') === '0' ? 'Hồ sơ nháp đã lưu nhưng chưa gửi được email. Bạn có thể yêu cầu gửi lại OTP.' : '');
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const running = useRef(false);
  const editable = app && ['DRAFT', 'NEEDS_ADDITIONAL_INFO'].includes(app.status);
  const locked = busy || photoUploads > 0;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!applicantId) return undefined;
    let cancelled = false;
    // Let a discarded effect clean up before starting its requests (including StrictMode).
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true); setError('');
      const [result, rules] = await Promise.all([api.mine(), api.policy()]);
      if (cancelled) return;
      setApp(result.data); setPolicy(rules.data); setProfile(result.data.profile || {}); setBusiness(result.data.business);
      setConsent(result.data.consent?.version === rules.data.version ? result.data.consent : {}); setDirty(false); setErrors({});
    }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [applicantId, revision]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const run = async action => {
    if (running.current || photoUploads > 0) return;
    running.current = true; setBusy(true); setError(''); setErrors({}); setNotice('');
    try { await action(); }
    catch (e) {
      setError(e.message); setErrors(Object.fromEntries((e.errors || []).map(item => [item.field, item.message])));
      if (e.retryAfterSeconds) setCooldown(e.retryAfterSeconds);
      if (e.code === 'EMAIL_NOT_VERIFIED') setVerify(true);
    } finally { running.current = false; setBusy(false); }
  };
  const save = async send => {
    const result = await api.save({ version: app.version, profile, business, consent: { ...consent, version: policy.version } });
    setApp(result.data); setDirty(false);
    if (send) {
      const submitted = await api.submit(result.data.version);
      setApp(submitted.data); setNotice('Đã gửi hồ sơ xét duyệt. Bạn chưa được cấp quyền kinh doanh.');
    } else setNotice('Đã lưu hồ sơ nháp. Hồ sơ chưa được gửi xét duyệt.');
  };
  const required = [...new Set([
    'AUTHORITY_PROOF', profile.entity_type === 'INDIVIDUAL' ? 'IDENTITY_PROOF' : 'BUSINESS_REGISTRATION',
    ...(profile.authority === 'AUTHORIZED' ? ['AUTHORIZATION'] : []),
    ...(profile.requires_license ? ['LICENSE'] : []), ...(profile.requires_insurance ? ['INSURANCE'] : []), ...(app?.required_documents || []),
  ])];

  return <div className="min-h-screen bg-slate-50 font-body">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5"><Link to="/" className="text-xl font-extrabold text-primary-600">travelio</Link><span className="text-sm font-semibold">Hồ sơ đối tác</span>{currentUser && <button className="text-sm text-slate-600" disabled={locked} onClick={() => { if (!dirty || window.confirm('Bạn có thay đổi chưa lưu. Đăng xuất?')) logout(); }}>Đăng xuất</button>}</div></header>
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
      <div><h1 className="text-2xl font-bold">Đăng ký và theo dõi hồ sơ đối tác</h1><p className="mt-2 text-sm leading-6 text-slate-600">Xác minh email → hoàn thiện hồ sơ và giấy tờ → gửi xét duyệt → được cấp quyền sau phê duyệt. Tài khoản khách hàng vẫn sử dụng được trong thời gian chờ.</p></div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {authLoading || loading ? <p role="status">Đang tải hồ sơ...</p> : !currentUser ? <section className="mx-auto max-w-lg space-y-5 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold">{verify ? 'Xác minh email đăng ký' : 'Đăng nhập để mở hồ sơ'}</h2>
        <label className="block space-y-2 text-sm"><span>Email</span><input type="email" value={email} autoComplete="email" className={partnerInputClass} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
        {verify ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); run(async () => { await authApi.verifyEmail({ email, otp }); setOtp(''); setVerify(false); setNotice('Email đã xác minh. Đăng nhập để hoàn thiện hồ sơ; bạn chưa được cấp quyền đối tác.'); }); }}>
          <label className="block space-y-2 text-sm"><span>OTP gồm 6 chữ số</span><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" maxLength={6} className={partnerInputClass} disabled={busy} /></label>
          <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || otp.length !== 6}>Xác minh email</button><button type="button" className={secondary} disabled={busy || cooldown > 0} onClick={() => run(async () => { const response = await authApi.resendVerification({ email }); setCooldown(response.data.resendAfterSeconds || 60); setNotice('Nếu email đang chờ xác minh, mã mới đã được gửi.'); })}>{cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại OTP'}</button></div>
          <button type="button" className="text-sm text-primary-600" onClick={() => setVerify(false)}>Đã xác minh? Đăng nhập</button>
        </form> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); run(async () => { await login({ email, password }); setPassword(''); }); }}>
          <label className="block space-y-2 text-sm"><span>Mật khẩu</span><input type="password" autoComplete="current-password" value={password} className={partnerInputClass} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
          <button className={button} disabled={busy || !email || !password}>Đăng nhập và mở hồ sơ</button>
          <button type="button" className="block text-sm text-primary-600" onClick={() => setVerify(true)}>Tôi cần xác minh email</button>
          <Link to="/auth/forgot-password" className="block text-sm text-primary-600">Quên mật khẩu?</Link>
        </form>}
      </section> : app ? <>
        <section className="space-y-3 rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{app.role === 'HOTEL_OWNER' ? 'Hotel Owner' : 'Attraction Vendor'} · {applicationLabels[app.status]}</h2><button className={secondary} disabled={locked} onClick={() => { if (!dirty || window.confirm('Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?')) setRevision(value => value + 1); }}>Tải lại trạng thái</button></div>
          <p className="break-all text-xs text-slate-500">Mã hồ sơ: {app._id} · Phiên bản {app.version}</p>
          <p className="text-sm">Người đăng ký: {app.applicant?.full_name || currentUser.full_name} · {app.applicant?.email || currentUser.email}</p>
          {app.review?.reason && <p className="whitespace-pre-wrap rounded-xl bg-amber-50 p-4 text-sm">Phản hồi xét duyệt: {app.review.reason}</p>}
          {app.status === 'PENDING' && <p className="text-sm text-amber-800">Đã gửi xét duyệt. Hồ sơ và tài liệu được khóa trong thời gian này.</p>}
          {app.status === 'APPROVED' && <p className="text-sm text-emerald-800">Hồ sơ đã được phê duyệt. <Link to="/vendor" className="underline">Mở khu vực đối tác</Link>. Nếu menu chưa cập nhật, đăng nhập lại.</p>}
          {app.status === 'REJECTED' && <p className="text-sm">Lượt xét duyệt đã kết thúc. Liên hệ Travelio để được hướng dẫn; không tạo tài khoản khác để bỏ qua kết quả.</p>}
        </section>
        <section className="space-y-5 rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">1. Thông tin chủ thể và quyền đại diện</h2><PartnerApplicationFields role={app.role} profile={profile} onChange={(key, value) => { setProfile(previous => ({ ...previous, [key]: value })); setDirty(true); }} errors={errors} disabled={!editable || locked} /></section>
        <section className="space-y-5 rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">2. Cơ sở và dịch vụ dự kiến</h2><p className="text-xs text-slate-500">Dữ liệu nằm trong hồ sơ, chưa công khai hoặc nhận đặt chỗ trước phê duyệt.</p><PartnerBusinessEditor role={app.role} business={business} onChange={value => { setBusiness(value); setDirty(true); }} disabled={!editable || locked} errors={errors} onBusyChange={value => setPhotoUploads(count => Math.max(0, count + (value ? 1 : -1)))} /></section>
        <section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">3. Tài liệu chứng minh</h2><p className="text-sm text-slate-600">Chỉ dùng giấy tờ giả lập cho bản demo. PDF, PNG, JPEG; 3 MB/file, tối đa 10 file và tổng 20 MB. Tài liệu được lưu riêng tư.</p>
          <ul className="space-y-2 text-sm">{required.map(key => <li key={key} className={errors[`documents.${key}`] ? 'text-rose-700' : ''}>{app.documents.some(doc => doc.kind === key) ? '✓' : '○'} {documentLabels[key]}{errors[`documents.${key}`] && <span role="alert"> — {errors[`documents.${key}`]}</span>}</li>)}</ul>
          {app.documents.map(doc => <div key={doc._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="min-w-0"><p className="break-all font-semibold">{doc.name}</p><p className="text-xs text-slate-500">{documentLabels[doc.kind]} · {Math.ceil(doc.size / 1024)} KB</p></div><div className="flex gap-3"><button disabled={locked} className="text-primary-600" onClick={() => run(() => api.download(doc))}>Tải xuống</button>{editable && <button className="text-rose-700" disabled={locked} onClick={() => run(async () => { const result = await api.removeDocument(doc._id, app.version); setApp(result.data); })}>Xóa</button>}</div></div>)}
          {editable && <fieldset disabled={locked} className="space-y-3"><label className="block text-sm">Loại tài liệu<select name="document_kind" value={kind} onChange={e => setKind(e.target.value)} className={`${partnerInputClass} mt-2`}>{Object.entries(documentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm">Chọn tài liệu giả lập<input type="file" accept="application/pdf,image/png,image/jpeg" className="mt-2 block w-full text-sm" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) run(async () => { if (file.size > 3 * 1024 * 1024) throw new Error('Mỗi file tối đa 3 MB'); const result = await api.upload(app.version, kind, file); setApp(result.data); setNotice('Đã lưu tài liệu riêng tư.'); }); }} /></label></fieldset>}
        </section>
        <section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">4. Cam kết và thỏa thuận</h2><p className="text-xs text-slate-500">{policy?.notice} Phiên bản {policy?.version}.</p>
          {policy?.terms.map(term => <div key={term.key} className="space-y-2"><details className="rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">{term.title}</summary><p className="mt-3 text-sm leading-6">{term.text}</p></details><label className="flex gap-2 text-sm"><input type="checkbox" checked={consent[term.key] === true} disabled={!editable || locked} onChange={e => { setConsent(previous => ({ ...previous, [term.key]: e.target.checked })); setDirty(true); }} />Tôi đã đọc và chấp nhận {term.title.toLowerCase()}.</label></div>)}
          {errors.consent && <p role="alert" className="text-sm text-rose-700">{errors.consent}</p>}
          {editable && <div className="flex flex-wrap gap-3 border-t pt-5"><button className={secondary} disabled={locked || !policy} onClick={() => run(() => save(false))}>Lưu nháp</button><button className={button} disabled={locked || !policy} onClick={() => run(() => save(true))}>{busy ? 'Đang xử lý...' : app.status === 'NEEDS_ADDITIONAL_INFO' ? 'Gửi lại hồ sơ xét duyệt' : 'Gửi hồ sơ đăng ký đối tác'}</button></div>}
        </section>
        <section className="space-y-3 rounded-2xl border bg-white p-6"><h2 className="font-bold">Lịch sử hồ sơ</h2><ol className="space-y-2 text-sm">{app.history.map((event, index) => <li key={index} className="border-l-2 border-primary-200 pl-3"><span className="font-semibold">{applicationLabels[event.status]}</span> · {new Date(event.at).toLocaleString('vi-VN')} · v{event.version}{event.reason && <p className="whitespace-pre-wrap text-slate-600">{event.reason}</p>}</li>)}</ol></section>
      </> : currentUser && <div className="space-y-3 rounded-2xl border bg-white p-6"><p>Chưa mở được hồ sơ đối tác của tài khoản này.</p><div className="flex flex-wrap gap-4 text-sm text-primary-600"><Link to="/partner/register/hotel">Đăng ký Hotel Owner</Link><Link to="/partner/register/attraction">Đăng ký Vendor</Link><button onClick={() => setRevision(value => value + 1)}>Thử lại</button></div></div>}
      <Link to="/" className="inline-block text-sm text-primary-600">Về trang chủ</Link>
    </main>
  </div>;
}
