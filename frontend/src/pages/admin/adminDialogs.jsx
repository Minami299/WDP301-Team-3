import { useEffect, useState } from "react";
import { Dialog, Field } from "../../components/common/Dialog";
import { adminApi } from "../../services/api/adminApi";
import { ROLE_LABELS, StatusBadge } from "./adminUi";

export { Dialog, Field };

export const inputClass =
  "w-full px-3 py-2 rounded-8 border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

export function RegistrationReview({ user, canReview, onClose, onSaved }) {
  const [details, setDetails] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    adminApi.getRegistration(user.id).then(response => { if (!cancelled) setDetails(response.data); }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [user.id]);
  const review = async approvalStatus => {
    if (saving) return;
    if (approvalStatus === 'REJECTED' && !reason.trim()) { setError('Vui lòng nhập lý do từ chối'); return; }
    setSaving(true); setError('');
    try { const res = await adminApi.reviewRegistration(user.id, approvalStatus, reason); onSaved(res.data?.emailSent === false ? 'Đã xử lý hồ sơ nhưng chưa gửi được email thông báo (kiểm tra cấu hình SMTP).' : 'Đã xử lý hồ sơ và gửi email thông báo cho đối tác.'); }
    catch (err) { setError(err.message); setSaving(false); }
  };
  return <Dialog title="Partner registration details" onClose={() => !saving && onClose()}>
    {!details ? <p className="text-sm text-slate-500">Loading registration...</p> : <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[100px_1fr] gap-2 rounded-xl bg-slate-50 p-4">
        <dt>Name</dt><dd className="break-words min-w-0 font-semibold">{details.full_name}</dd><dt>Email</dt><dd className="break-all min-w-0">{details.email}</dd><dt>Role</dt><dd>{ROLE_LABELS[details.role_id?.role_name]}</dd><dt>Phone</dt><dd>{details.phone || '—'}</dd><dt>Approval</dt><dd><StatusBadge status={details.approvalStatus} /></dd>
      </dl>
      {details.facilities?.map(facility => <section key={facility._id} className="rounded-xl border border-border p-4 space-y-2">
        <h3 className="font-bold break-words">{facility.name}</h3><p>{facility.address}, {facility.city}</p><p>{facility.contact_phone} {facility.business_type}</p><p className="whitespace-pre-wrap break-words text-slate-500">{facility.description}</p>
        <h4 className="font-semibold">Services / Rooms ({facility.services.length})</h4>
        {facility.services.map(service => <div key={service._id} className="rounded-lg bg-slate-50 p-3"><p className="font-semibold break-words">{service.name}</p><p className="whitespace-pre-wrap break-words">{service.description}</p><p>{service.location}</p>{service.ticket_types?.length ? service.ticket_types.map(ticket => <p key={ticket._id}>{ticket.name}: {Number(ticket.price).toLocaleString('vi-VN')} VND</p>) : <p>{Number(service.base_price).toLocaleString('vi-VN')} VND</p>}<div className="mt-2 flex flex-wrap gap-2">{service.photos?.map(photo => <img key={photo} src={photo} alt={service.name} className="w-20 h-16 rounded-lg object-cover" />)}</div></div>)}
        {!facility.services.length && <p className="text-slate-500">Chưa có dịch vụ.</p>}
      </section>)}
      {details.approvalReviewedAt && <p className="rounded-xl bg-slate-50 p-3">Người xử lý: {details.reviewedBy?.full_name || details.approvalReviewedBy || '—'} · {new Date(details.approvalReviewedAt).toLocaleString('vi-VN')}{details.rejectionReason && <span className="block mt-2">Lý do: {details.rejectionReason}</span>}</p>}
      {canReview && details.approvalStatus === 'PENDING' && <Field label="Rejection reason (required when rejecting)"><textarea aria-label="Rejection reason" maxLength={1000} rows={3} className={inputClass} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} /></Field>}
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={saving} onClick={onClose} className="rounded-8 border px-4 py-2 text-sm">Close</button>{canReview && details?.approvalStatus === 'PENDING' && <><button disabled={saving} onClick={() => review('REJECTED')} className="rounded-8 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Reject registration</button><button disabled={saving} onClick={() => review('APPROVED')} className="rounded-8 bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve registration</button></>}</div>
  </Dialog>;
}

