import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AttractionLayout, { Notice } from './AttractionLayout';
import useAuth from '../../hooks/useAuth';
import facilityApi from '../../services/api/facilityApi';
import { inputClass, buttonClass } from '../../utils/attractionUi';
import { IconCheck, IconRefreshCw } from '../../components/Icons';
import { tokenStorage } from '../../services/storage/tokenStorage';

function ReviewCard({ review, currentUser, onUpdated, onMarkRead }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canReply = !review.vendor_reply_by || String(review.vendor_reply_by) === String(currentUser.id || currentUser._id);
  const isUnread = !review.is_read_by_vendor;

  const handleMarkRead = async () => {
    if (!isUnread || markingRead) return;
    setMarkingRead(true);
    try {
      await onMarkRead(review._id);
    } catch (err) {
      setError(err.message || 'Không thể đánh dấu đã đọc');
    } finally {
      setMarkingRead(false);
    }
  };

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
      onUpdated({ ...result.data, is_read_by_vendor: true });
      setEditing(false);
      setSuccess('Đã lưu phản hồi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      className={`rounded-2xl p-5 space-y-3.5 transition-all duration-200 ${
        isUnread
          ? "border-2 border-primary-500 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/60 shadow-md shadow-sky-500/10 ring-1 ring-primary-300"
          : "border border-slate-200 bg-white shadow-2xs hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Link className="font-bold text-primary-700 hover:underline" to={`/facilities/${review.facility_id._id}`}>
            {review.facility_id.name}
          </Link>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">
            {review.facility_id.type === 'HOTEL' ? 'Khách sạn' : 'Khu vui chơi / Tour'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isUnread ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 border border-amber-300 shadow-2xs animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Mới · Chưa đọc
              </span>
              <button
                type="button"
                disabled={markingRead}
                onClick={handleMarkRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 hover:underline disabled:opacity-50"
              >
                <IconCheck size={13} />
                {markingRead ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
              Đã xem
            </span>
          )}
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            review.vendor_reply?.trim()
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {review.vendor_reply?.trim() ? 'Đã phản hồi' : 'Chưa phản hồi'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
            {(review.customer_id?.full_name || 'K').charAt(0).toUpperCase()}
          </div>
          <div>
            <strong className={`block text-sm ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
              {review.customer_id?.full_name || 'Khách hàng'}
            </strong>
            <p className="text-[11px] text-slate-400">
              {new Date(review.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-amber-500 font-bold text-sm" aria-label={`${review.rating} trên 5 sao`}>
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
          </span>
          <span className="text-xs font-semibold text-slate-600 ml-1">{review.rating}.0</span>
        </div>
      </div>

      <p className={`text-sm whitespace-pre-wrap break-words ${isUnread ? 'font-medium text-slate-900 leading-relaxed' : 'text-slate-700 leading-relaxed'}`}>
        {review.comment}
      </p>

      {review.vendor_reply && (
        <div className="rounded-xl border-l-4 border-primary-500 bg-slate-50 p-4 text-sm mt-2">
          <p className="font-semibold text-slate-800 mb-1 text-xs uppercase tracking-wide">
            {review.facility_id.type === 'HOTEL' ? 'Phản hồi từ Chủ khách sạn' : 'Phản hồi từ Nhà cung cấp tham quan'}
          </p>
          <p className="whitespace-pre-wrap break-words text-slate-700">{review.vendor_reply}</p>
          {review.vendor_replied_at && (
            <p className="text-[11px] text-slate-400 mt-2">
              Cập nhật: {new Date(review.vendor_replied_at).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
      )}

      <Notice error={error} success={success} />

      {editing ? (
        <form onSubmit={save} className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-700" htmlFor={`reply-${review._id}`}>
            Nội dung phản hồi khách hàng
          </label>
          <textarea
            id={`reply-${review._id}`}
            className={inputClass}
            rows={4}
            maxLength={5000}
            required
            disabled={saving}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập nội dung phản hồi của bạn dành cho khách hàng..."
          />
          <div className="flex gap-3">
            <button className={buttonClass} disabled={saving || !draft.trim()}>
              {saving ? 'Đang lưu...' : 'Lưu phản hồi'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => { setEditing(false); setError(''); }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Hủy
            </button>
          </div>
        </form>
      ) : canReply ? (
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            onClick={() => {
              setDraft(review.vendor_reply || '');
              setEditing(true);
              setError('');
              setSuccess('');
              if (isUnread) handleMarkRead();
            }}
          >
            {review.vendor_reply ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Phản hồi thuộc đối tác khác, không thể chỉnh sửa.</p>
      )}
    </article>
  );
}

export default function PartnerReviewsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const allowed = ['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'UNREAD' | 'UNREPLIED'
  const [markingAll, setMarkingAll] = useState(false);

  const requestKey = `${currentUser?.id || currentUser?._id}:${page}:${revision}`;
  const loading = data?.requestKey !== requestKey;
  const error = loading ? '' : data?.error;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    facilityApi.getManagedReviews(page)
      .then((result) => {
        if (active) {
          setData({ ...result.data, requestKey });
          if (typeof result.data?.unreadCount === 'number') {
            window.dispatchEvent(
              new CustomEvent('partner-reviews-updated', {
                detail: { unreadCount: result.data.unreadCount }
              })
            );
          }
        }
      })
      .catch((err) => {
        if (active) setData({ requestKey, error: err.message });
      });
    return () => {
      active = false;
    };
  }, [allowed, requestKey, page]);

  const handleMarkSingleRead = async (reviewId) => {
    const res = await facilityApi.markReviewRead(reviewId);
    const newUnreadCount =
      typeof res.data?.unreadCount === 'number'
        ? res.data.unreadCount
        : Math.max(0, (data?.unreadCount || 1) - 1);

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        unreadCount: newUnreadCount,
        reviews: prev.reviews.map((r) =>
          r._id === reviewId ? { ...r, is_read_by_vendor: true } : r
        ),
      };
    });
    window.dispatchEvent(
      new CustomEvent('partner-reviews-updated', { detail: { unreadCount: newUnreadCount } })
    );
  };

  const handleMarkAllRead = async () => {
    if (markingAll || !data?.unreadCount) return;
    setMarkingAll(true);
    try {
      await facilityApi.markAllReviewsRead();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: 0,
          reviews: prev.reviews.map((r) => ({ ...r, is_read_by_vendor: true })),
        };
      });
      window.dispatchEvent(
        new CustomEvent('partner-reviews-updated', { detail: { unreadCount: 0 } })
      );
    } catch (err) {
      alert(err.message || 'Không thể đánh dấu tất cả đã đọc');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleReviewUpdated = (updated) => {
    setData((previous) => {
      if (!previous) return previous;
      const wasUnread = previous.reviews.some(
        (r) => r._id === updated._id && !r.is_read_by_vendor
      );
      const newUnreadCount = wasUnread
        ? Math.max(0, (previous.unreadCount || 1) - 1)
        : previous.unreadCount;

      if (wasUnread) {
        window.dispatchEvent(
          new CustomEvent('partner-reviews-updated', { detail: { unreadCount: newUnreadCount } })
        );
      }
      return {
        ...previous,
        unreadCount: newUnreadCount,
        reviews: previous.reviews.map((item) =>
          item._id === updated._id
            ? {
                ...item,
                vendor_reply: updated.vendor_reply,
                vendor_reply_by: updated.vendor_reply_by,
                vendor_replied_at: updated.vendor_replied_at,
                is_read_by_vendor: true,
              }
            : item
        ),
      };
    });
  };

  const filteredReviews = useMemo(() => {
    const list = data?.reviews || [];
    if (filterType === 'UNREAD') return list.filter((r) => !r.is_read_by_vendor);
    if (filterType === 'UNREPLIED') return list.filter((r) => !r.vendor_reply?.trim());
    return list;
  }, [data?.reviews, filterType]);

  const unreadCount = data?.unreadCount || 0;
  const unrepliedCount = (data?.reviews || []).filter((r) => !r.vendor_reply?.trim()).length;

  if (authLoading || (tokenStorage.getToken() && !currentUser?.role)) {
    return (
      <div className="min-h-screen bg-bg-default flex items-center justify-center text-sm text-text-secondary">
        Loading...
      </div>
    );
  }

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AttractionLayout
      activeScreen={14}
      title="Đánh giá & Phản hồi"
      description="Xem và phản hồi đánh giá của khách hàng tại các cơ sở bạn quản lý."
    >
      {/* Top action & filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({data?.pagination?.total || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterType === 'UNREAD'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('UNREPLIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'UNREPLIED'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chưa phản hồi ({unrepliedCount})
          </button>
        </div>

        {/* Actions right */}
        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markingAll || loading}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition shadow-2xs disabled:opacity-50"
            >
              <IconCheck size={14} />
              <span>{markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}</span>
            </button>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <IconRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      <Notice error={error} />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          Đang tải đánh giá...
        </div>
      ) : !error && (
        <>
          {!filteredReviews.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
              {filterType === 'UNREAD'
                ? 'Không có đánh giá mới chưa đọc.'
                : filterType === 'UNREPLIED'
                ? 'Tất cả đánh giá đã được phản hồi.'
                : 'Chưa có đánh giá nào từ khách hàng.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  currentUser={currentUser}
                  onUpdated={handleReviewUpdated}
                  onMarkRead={handleMarkSingleRead}
                />
              ))}
            </div>
          )}

          {data?.pagination?.totalPages > 1 && filterType === 'ALL' && (
            <nav aria-label="Phân trang đánh giá" className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 text-sm">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Trang trước
              </button>
              <span className="text-xs text-slate-500">
                Trang {page} / {data.pagination.totalPages} (Tổng {data.pagination.total} đánh giá)
              </span>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Trang sau
              </button>
            </nav>
          )}
        </>
      )}
    </AttractionLayout>
  );
}
