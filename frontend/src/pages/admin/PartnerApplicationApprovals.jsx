import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { partnerApplicationApi as api } from '../../services/api/partnerApplicationApi';
import PartnerApplicationFields from '../../components/PartnerApplicationFields';
import { applicationLabels, checklistLabels, documentLabels } from '../../utils/partnerApplication';
import PartnerBusinessEditor from '../../components/PartnerBusinessEditor';
import { Dialog, inputClass } from './adminDialogs';
import { PageHeader, ROLE_LABELS, formatDate } from './adminUi';

const statuses = ['PENDING', 'NEEDS_ADDITIONAL_INFO', 'APPROVED', 'REJECTED'];
const button = 'rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50';

export default function PartnerApplicationApprovals({ onLegacy }) {
  const [params, setParams] = useSearchParams();
  const status = statuses.includes(params.get('tab')) ? params.get('tab') : 'PENDING';
  const role = params.get('role') || '';
  const page = Number(params.get('page')) || 1;
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const update = changes => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...changes }).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace: true });
  };
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true); setError(''); setResult(null);
      const response = await api.list({ status, role, page });
      if (!cancelled) setResult(response.data);
    })
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, role, page, revision]);
  return <>
    <PageHeader title="Xét duyệt hồ sơ đối tác"><button className={button} onClick={onLegacy}>Hồ sơ legacy</button></PageHeader>
    <div className="space-y-5 p-5 sm:p-8">
      <p className="text-sm text-slate-600">Xét duyệt thủ công. Kiểm tra chủ thể, quyền đại diện, giấy tờ và dịch vụ trước khi cấp quyền. Hồ sơ cũ được giữ ở mục legacy, không mặc định đã xác minh theo quy trình mới.</p>
      <div className="flex flex-wrap gap-3"><div className="flex flex-wrap gap-2" role="tablist">{statuses.map(value => <button key={value} role="tab" aria-selected={value === status} className={`${button} ${value === status ? 'bg-primary-600 text-white' : 'bg-white'}`} onClick={() => update({ tab: value })}>{applicationLabels[value]}</button>)}</div><select className={`${inputClass} sm:w-60`} aria-label="Loại đối tác" value={role} onChange={e => update({ role: e.target.value })}><option value="">Tất cả loại đối tác</option><option value="HOTEL_OWNER">Hotel Owner</option><option value="ACTIVITY_VENDOR">Attraction Vendor</option></select></div>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-4">Người đăng ký</th><th className="p-4">Loại đối tác</th><th className="p-4">Trạng thái</th><th className="p-4">Ngày gửi</th><th className="p-4">Thao tác</th></tr></thead><tbody>{result?.items.map(app => <tr key={app._id} className="border-b"><td className="p-4"><p className="font-semibold">{app.user_id?.full_name || 'Tài khoản không còn tồn tại'}</p><p className="break-all text-xs text-slate-500">{app.user_id?.email}</p></td><td className="p-4">{ROLE_LABELS[app.role]}</td><td className="p-4">{applicationLabels[app.status]}</td><td className="p-4">{formatDate(app.submitted_at)}</td><td className="p-4"><button className="font-semibold text-primary-600" onClick={() => setSelected(app._id)}>Xem hồ sơ</button></td></tr>)}</tbody></table>{loading && <p role="status" className="p-5">Đang tải...</p>}{result?.items.length === 0 && <p className="p-5 text-sm text-slate-500">Không có hồ sơ trong mục này.</p>}</div>
      {result && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{result.total} hồ sơ · Trang {result.page}/{result.pages}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trước</button><button className={button} disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })}>Sau</button></div></div>}
    </div>
    {selected && <ApplicationReview id={selected} onClose={() => setSelected(null)} onSaved={message => { setNotice(message); setSelected(null); setRevision(value => value + 1); }} />}
  </>;
}

function ApplicationReview({ id, onClose, onSaved }) {
  const [app, setApp] = useState(null);
  const [reason, setReason] = useState('');
  const [checklist, setChecklist] = useState({});
  const [required, setRequired] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    let cancelled = false;
    api.detail(id).then(response => { if (!cancelled) setApp(response.data); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id]);
  const review = async status => {
    if (running.current) return;
    if (status !== 'APPROVED' && !reason.trim()) { setError('Vui lòng nêu rõ lý do và các mục cần sửa/bổ sung.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      const response = await api.review(id, { version: app.version, status, reason, checklist, required_documents: status === 'NEEDS_ADDITIONAL_INFO' ? required : [] });
      onSaved(response.data.emailSent ? 'Đã lưu quyết định và gửi email thông báo.' : 'Đã lưu quyết định. Chưa gửi được email; đối tác vẫn xem được kết quả trong hồ sơ.');
    } catch (e) { setError(e.message); }
    finally { running.current = false; setBusy(false); }
  };
  return <Dialog title="Chi tiết hồ sơ đối tác" onClose={() => { if (!running.current) onClose(); }}>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {!app ? <p>Đang tải hồ sơ...</p> : <div className="space-y-5 text-sm">
      <div className="space-y-1 rounded-xl bg-slate-50 p-4"><p className="break-all font-semibold">{app.applicant?.full_name} · {app.applicant?.email}</p><p>Email: {app.applicant?.is_verified ? 'Đã xác minh' : 'Chưa xác minh'}</p><p>{applicationLabels[app.status]} · v{app.version} · Bản gửi v{app.submitted_version}</p><p className="break-all text-xs text-slate-500">Mã hồ sơ: {app._id}</p></div>
      <details open className="space-y-3"><summary className="cursor-pointer font-bold">Chủ thể và người đại diện</summary><PartnerApplicationFields profile={app.profile} role={app.role} disabled onChange={() => {}} errors={{}} /></details>
      <details className="space-y-3"><summary className="cursor-pointer font-bold">Cơ sở, phòng / dịch vụ và giá</summary><PartnerBusinessEditor role={app.role} business={app.business} onChange={() => {}} disabled errors={{}} /></details>
      <section className="space-y-3"><h3 className="font-bold">Tài liệu chứng minh</h3>{app.documents.map(doc => <div className="rounded-lg border p-3" key={doc._id}><p>{documentLabels[doc.kind]}</p><button disabled={busy} className="break-all text-primary-600 underline" onClick={async () => { try { await api.download(doc); } catch (e) { setError(e.message); } }}>{doc.name}</button><p className="text-xs text-slate-500">{Math.ceil(doc.size / 1024)} KB · {formatDate(doc.uploaded_at)}</p></div>)}</section>
      <p className="rounded-xl bg-slate-50 p-3 text-xs">Đã chấp nhận cam kết: phiên bản {app.consent?.version || '—'} · {app.consent?.at ? new Date(app.consent.at).toLocaleString('vi-VN') : '—'} · người chấp nhận {String(app.consent?.by || '—')}</p>
      {app.status === 'PENDING' && <fieldset disabled={busy} className="space-y-4 border-t pt-4"><h3 className="font-bold">Checklist kiểm tra thủ công</h3>{Object.entries(checklistLabels).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={checklist[key] === true} onChange={e => setChecklist(previous => ({ ...previous, [key]: e.target.checked }))} />{label}</label>)}<label className="block space-y-2"><span className="font-semibold">Lý do / các mục cần sửa (bắt buộc khi từ chối hoặc yêu cầu bổ sung)</span><textarea className={inputClass} rows={4} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label><details><summary className="cursor-pointer font-semibold">Yêu cầu thêm loại tài liệu</summary><div className="mt-3 space-y-2">{Object.entries(documentLabels).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={required.includes(key)} onChange={e => setRequired(previous => e.target.checked ? [...previous, key] : previous.filter(value => value !== key))} />{label}</label>)}</div></details><div className="flex flex-wrap gap-2"><button className={`${button} border-rose-200 text-rose-700`} onClick={() => review('REJECTED')}>Từ chối</button><button className={`${button} border-amber-200 text-amber-800`} onClick={() => review('NEEDS_ADDITIONAL_INFO')}>Yêu cầu bổ sung</button><button className={`${button} bg-primary-600 text-white`} disabled={!Object.keys(checklistLabels).every(key => checklist[key])} onClick={() => review('APPROVED')}>Phê duyệt và cấp quyền</button></div></fieldset>}
      <section className="space-y-2 border-t pt-4"><h3 className="font-bold">Lịch sử xử lý</h3>{app.history.map((event, i) => <p key={i} className="whitespace-pre-wrap border-l-2 pl-3">{applicationLabels[event.status]} · {new Date(event.at).toLocaleString('vi-VN')} · v{event.version}<span className="block break-all text-xs text-slate-500">Người thực hiện: {String(event.by || '—')}</span>{event.reason}</p>)}</section>
    </div>}
    <button className={`${button} mt-5`} disabled={busy} onClick={onClose}>Đóng</button>
  </Dialog>;
}
