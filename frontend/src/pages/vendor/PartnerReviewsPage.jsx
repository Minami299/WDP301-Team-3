import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AttractionLayout, { Notice } from './AttractionLayout';
import useAuth from '../../hooks/useAuth';
import facilityApi from '../../services/api/facilityApi';
import { inputClass, buttonClass } from '../../utils/attractionUi';

function ReviewCard({ review, currentUser, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canReply = !review.vendor_reply_by || String(review.vendor_reply_by) === String(currentUser.id || currentUser._id);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!draft.trim() || draft.trim().length > 5000) {
      setError('Phản hồi phải có từ 1 đến 5000 ký tự.');
      return;
    }
    setSaving(true);
    try {
      const result = await facilityApi.replyReview(review.facility_id._id, review._id, { reply: draft.trim() });
      onUpdated(result.data);
      setEditing(false);
      setSuccess('Đã lưu phản hồi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link className="font-semibold text-primary-700" to={`/facilities/${review.facility_id._id}`}>{review.facility_id.name}</Link>
        <span className="text-slate-500">{review.vendor_reply?.trim() ? 'Đã phản hồi' : 'Chưa phản hồi'}</span>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <strong>{review.customer_id?.full_name || 'Khách hàng'}</strong>
        <span className="text-amber-700" aria-label={`${review.rating} trên 5 sao`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString('vi-VN')}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{review.comment}</p>
      {review.vendor_reply && <div className="rounded-xl border-l-4 border-primary-500 bg-slate-50 p-4 text-sm">
        <p className="font-semibold mb-1">{review.facility_id.type === 'HOTEL' ? 'Phản hồi từ Chủ khách sạn' : 'Phản hồi từ Nhà cung cấp tham quan'}</p>
        <p className="whitespace-pre-wrap break-words">{review.vendor_reply}</p>
        {review.vendor_replied_at && <p className="text-xs text-slate-500 mt-2">Cập nhật: {new Date(review.vendor_replied_at).toLocaleString('vi-VN')}</p>}
      </div>}
      <Notice error={error} success={success} />
      {editing ? <form onSubmit={save} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor={`reply-${review._id}`}>Nội dung phản hồi</label>
        <textarea id={`reply-${review._id}`} className={inputClass} rows={4} maxLength={5000} required disabled={saving} value={draft} onChange={e => setDraft(e.target.value)} />
        <div className="flex gap-3">
          <button className={buttonClass} disabled={saving || !draft.trim()}>{saving ? 'Đang lưu...' : 'Lưu phản hồi'}</button>
          <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Hủy</button>
        </div>
      </form> : canReply ? <button className="text-sm font-semibold text-primary-700" onClick={() => { setDraft(review.vendor_reply || ''); setEditing(true); setError(''); setSuccess(''); }}>{review.vendor_reply ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá'}</button> : <p className="text-xs text-slate-500">Phản hồi thuộc đối tác khác, không thể chỉnh sửa.</p>}
    </article>
  );
}

export default function PartnerReviewsPage() {
  const { currentUser } = useAuth();
  const allowed = ['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const requestKey = `${currentUser?.id || currentUser?._id}:${page}:${revision}`;
  const loading = data?.requestKey !== requestKey;
  const error = loading ? '' : data?.error;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    facilityApi.getManagedReviews(page)
      .then(result => { if (active) setData({ ...result.data, requestKey }); })
      .catch(err => { if (active) setData({ requestKey, error: err.message }); });
    return () => { active = false; };
  }, [allowed, requestKey, page]);

  if (!allowed) return <Navigate to="/" replace />;
  return <AttractionLayout activeScreen={14} title="Đánh giá & Phản hồi" description="Xem và phản hồi đánh giá của khách hàng tại các cơ sở bạn quản lý.">
    <button className="text-sm text-primary-700 mb-4" disabled={loading} onClick={() => setRevision(value => value + 1)}>Tải lại</button>
    <Notice error={error} />
    {loading ? <p role="status">Đang tải đánh giá...</p> : !error && <>
      <p className="text-sm text-slate-500 mb-4">{data?.pagination.total || 0} đánh giá</p>
      {!data?.reviews.length && <p className="rounded-xl bg-white p-6 text-slate-500">Chưa có đánh giá.</p>}
      <div className="space-y-4">{data?.reviews.map(review => <ReviewCard key={review._id} review={review} currentUser={currentUser} onUpdated={updated => setData(previous => ({ ...previous, reviews: previous.reviews.map(item => item._id === updated._id ? { ...item, vendor_reply: updated.vendor_reply, vendor_reply_by: updated.vendor_reply_by, vendor_replied_at: updated.vendor_replied_at } : item) }))} />)}</div>
      {data?.pagination.totalPages > 1 && <nav aria-label="Phân trang đánh giá" className="flex items-center gap-4 mt-5 text-sm">
        <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Trang trước</button>
        <span>Trang {page} / {data.pagination.totalPages}</span>
        <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button>
      </nav>}
    </>}
  </AttractionLayout>;
}
