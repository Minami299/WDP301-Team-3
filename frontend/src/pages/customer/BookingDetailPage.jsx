import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import { facilityApi } from '../../services/api/facilityApi';
import BookingReceipt from '../../components/BookingReceipt';
import BookingCancellation from '../../components/BookingCancellation';

function StarRating({ rating = 5, max = 5 }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <span className="inline-flex items-center text-amber-400 gap-0.5" aria-label={`${rating} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rounded ? 'text-amber-400' : 'text-slate-200'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarPicker({ rating, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition cursor-pointer ${star <= rating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}
          title={`${star} sao`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // Reviews from other users state
  const [facility, setFacility] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [filterStar, setFilterStar] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Submit review form state
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormError, setReviewFormError] = useState('');
  const [reviewFormSuccess, setReviewFormSuccess] = useState('');

  useEffect(() => {
    let active = true;
    bookingApi
      .detail(id)
      .then((r) => {
        if (active) {
          setBooking(r.data);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);

  // Load facility and reviews when booking is loaded
  const loadFacilityReviews = async (targetFacilityId, targetFacilityName) => {
    try {
      setLoadingReviews(true);
      setReviewsError('');
      let foundFacilityId = targetFacilityId;

      if (!foundFacilityId && targetFacilityName) {
        const searchRes = await facilityApi.getFacilities({ keyword: targetFacilityName, limit: 1 });
        const list = searchRes.data?.facilities || searchRes.data || [];
        if (list.length > 0 && list[0]._id) {
          foundFacilityId = list[0]._id;
        }
      }

      if (foundFacilityId) {
        const res = await facilityApi.getFacilityById(foundFacilityId);
        setFacility(res.data || null);
      }
    } catch (e) {
      setReviewsError(e.message || 'Không thể tải nhận xét từ cơ sở');
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (!booking) return;
    const facId = booking.facility_id || booking.details?.[0]?.facility_id;
    const facName = booking.facility_name || booking.details?.[0]?.facility_name;
    if (facId || facName) {
      loadFacilityReviews(facId, facName);
    }
  }, [booking]);

  const reviews = useMemo(() => {
    return facility?.reviews || [];
  }, [facility]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating)) || 5;
      if (counts[star] !== undefined) counts[star]++;
    });
    return counts;
  }, [reviews]);

  const displayedReviews = useMemo(() => {
    const filtered = reviews.filter((r) => {
      if (filterStar === 'ALL') return true;
      return Math.round(Number(r.rating)) === filterStar;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'HIGHEST') return (b.rating || 5) - (a.rating || 5);
      if (sortBy === 'LOWEST') return (a.rating || 5) - (b.rating || 5);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [reviews, filterStar, sortBy]);

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!facility?._id) return;
    setReviewFormError('');
    setReviewFormSuccess('');

    if (!newComment.trim()) {
      setReviewFormError('Vui lòng nhập nội dung đánh giá của bạn.');
      return;
    }

    try {
      setSubmittingReview(true);
      await facilityApi.createReview(facility._id, {
        rating: newRating,
        comment: newComment.trim(),
      });
      setReviewFormSuccess('Cảm ơn bạn đã gửi nhận xét đánh giá!');
      setNewComment('');
      setNewRating(5);
      setShowWriteReview(false);
      // Reload reviews
      const res = await facilityApi.getFacilityById(facility._id);
      setFacility(res.data || null);
    } catch (err) {
      setReviewFormError(err.message || 'Không thể gửi nhận xét. Vui lòng thử lại sau.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const facilityName = facility?.name || booking?.facility_name || booking?.details?.[0]?.facility_name || 'Cơ sở dịch vụ';
  const avgRating = facility?.rating ? Number(facility.rating).toFixed(1) : (reviews.length ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1) : null);

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-7">
      <div className="flex justify-between gap-3 mb-5">
        <Link to="/my-trips" className="text-primary-600 hover:underline">
          ← Lịch sử chuyến đi
        </Link>
        <button
          className="text-primary-600 hover:underline cursor-pointer"
          onClick={() => setRevision((x) => x + 1)}
        >
          Tải lại trạng thái
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-5">Chi tiết đơn đặt chỗ</h1>

      {error && (
        <p role="alert" className="text-rose-600 mb-4 font-medium">
          {error}
        </p>
      )}

      {booking && booking._id === id ? (
        <>
          <BookingReceipt booking={booking} />
          <BookingCancellation key={id} booking={booking} onUpdated={setBooking} />

          {/* Section: Nhận xét từ người dùng khác */}
          <section className="bg-white border rounded-2xl p-5 sm:p-7 mt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Nhận xét & đánh giá từ người dùng khác
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Phản hồi thực tế từ những du khách đã từng trải nghiệm tại{' '}
                  <strong className="text-slate-700">{facilityName}</strong>
                </p>
              </div>
              {facility?._id && (
                <Link
                  to={`/facilities/${facility._id}`}
                  className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline shrink-0"
                >
                  Xem trang cơ sở & trải nghiệm →
                </Link>
              )}
            </div>

            {loadingReviews && (
              <p className="text-sm text-slate-500 py-6 text-center">
                Đang tải nhận xét từ cộng đồng du khách...
              </p>
            )}

            {reviewsError && (
              <p className="text-xs text-rose-600 py-4">{reviewsError}</p>
            )}

            {!loadingReviews && (
              <>
                {/* Summary Score & Distribution */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mt-5 flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center sm:border-r sm:border-slate-200 sm:pr-8 shrink-0">
                    <div className="font-bold text-4xl sm:text-5xl text-primary-600 mb-1">
                      {avgRating || '5.0'}
                    </div>
                    <div className="flex justify-center mb-1">
                      <StarRating rating={avgRating ? Math.round(Number(avgRating)) : 5} />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {reviews.length > 0
                        ? `Dựa trên ${reviews.length} đánh giá thực tế`
                        : 'Điểm đánh giá tiêu chuẩn'}
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-1.5 text-xs">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingCounts[star] || 0;
                      const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFilterStar(filterStar === star ? 'ALL' : star)}
                            className={`w-12 text-left font-bold cursor-pointer hover:underline ${filterStar === star ? 'text-primary-600 underline' : 'text-slate-600'}`}
                          >
                            {star} sao
                          </button>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-slate-500 font-semibold">
                            {count > 0 ? `${pct}%` : '0%'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Lọc theo:</span>
                    <button
                      type="button"
                      onClick={() => setFilterStar('ALL')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${filterStar === 'ALL' ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Tất cả ({reviews.length})
                    </button>
                    {[5, 4, 3, 2, 1].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFilterStar(s)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${filterStar === s ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {s} sao ({ratingCounts[s] || 0})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="sort-reviews" className="text-xs font-semibold text-slate-500">
                      Sắp xếp:
                    </label>
                    <select
                      id="sort-reviews"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:border-primary-500"
                    >
                      <option value="NEWEST">Mới nhất</option>
                      <option value="HIGHEST">Đánh giá cao nhất</option>
                      <option value="LOWEST">Đánh giá thấp nhất</option>
                    </select>
                  </div>
                </div>

                {/* Reviews List */}
                {displayedReviews.length > 0 ? (
                  <div className="space-y-4 mt-5">
                    {displayedReviews.map((rev) => (
                      <article
                        key={rev._id}
                        className="p-4 sm:p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            {rev.customer_avatar ? (
                              <img
                                src={rev.customer_avatar}
                                alt={rev.customer_name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shadow-xs">
                                {rev.customer_name?.charAt(0) || 'K'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {rev.customer_name || 'Du khách Travelio'}
                                </span>
                                <span className="inline-block text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Đã trải nghiệm
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {rev.created_at
                                  ? new Date(rev.created_at).toLocaleDateString('vi-VN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })
                                  : 'Nhận xét từ du khách'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                            <StarRating rating={rev.rating || 5} />
                            <span className="text-xs font-bold text-amber-700">
                              {rev.rating || 5}.0
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">
                          {rev.comment}
                        </p>

                        {/* Phản hồi từ Ban Quản Lý / Đối tác */}
                        {rev.vendor_reply && (
                          <div className="mt-3 ml-13 p-3.5 bg-white rounded-xl border-l-4 border-primary-500 shadow-xs text-xs">
                            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                              Phản hồi từ Ban Quản Lý / Cơ sở:
                            </div>
                            <p className="text-slate-600 leading-relaxed italic">
                              "{rev.vendor_reply}"
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl mt-5">
                    {reviews.length === 0
                      ? 'Chưa có nhận xét nào từ người dùng khác cho cơ sở này.'
                      : 'Không có nhận xét nào phù hợp với bộ lọc đã chọn.'}
                  </div>
                )}

                {/* Form viết đánh giá bổ sung cho đơn này */}
                <div className="mt-7 pt-5 border-t border-slate-100">
                  {!showWriteReview ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary-50/50 p-4 rounded-xl border border-primary-100">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">
                          Bạn đã trải nghiệm dịch vụ tại {facilityName}?
                        </p>
                        <p className="text-xs text-slate-500">
                          Chia sẻ cảm nhận của bạn để cộng đồng du khách có thêm thông tin tham khảo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWriteReview(true)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
                      >
                        Viết nhận xét của bạn
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleCreateReview}
                      className="p-5 bg-primary-50/40 rounded-2xl border border-primary-100 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900">
                          Viết nhận xét cho {facilityName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowWriteReview(false)}
                          className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                        >
                          Đóng
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-600">Đánh giá sao:</span>
                        <StarPicker rating={newRating} onChange={setNewRating} />
                        <span className="text-xs font-bold text-amber-600">{newRating} sao</span>
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Chia sẻ trải nghiệm thực tế của bạn về chất lượng dịch vụ, phòng ốc hoặc địa điểm..."
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      {reviewFormError && (
                        <p className="text-xs font-bold text-rose-600">{reviewFormError}</p>
                      )}

                      {reviewFormSuccess && (
                        <p className="text-xs font-bold text-emerald-600">{reviewFormSuccess}</p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowWriteReview(false)}
                          className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/20 transition cursor-pointer disabled:opacity-50"
                        >
                          {submittingReview ? 'Đang gửi...' : 'Gửi nhận xét'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      ) : (
        !error && <p className="text-sm text-slate-500">Đang tải đơn...</p>
      )}
    </main>
  );
}

