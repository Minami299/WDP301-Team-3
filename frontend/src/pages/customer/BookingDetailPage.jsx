import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';
import SepayPayment from '../../components/SepayPayment';
import BookingCancellation from '../../components/BookingCancellation';
import BookingUsageQr from '../../components/BookingUsageQr';

export default function BookingDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const loading = result?.id !== id || result?.revision !== revision;
  const booking = loading ? null : result.data;
  const error = loading ? '' : result.error;
  const setBooking = (data) => setResult({ id, revision, data });
  useEffect(() => {
    let active = true;
    bookingApi
      .detail(id)
      .then((r) => {
        if (active) setResult({ id, revision, data: r.data });
      })
      .catch((e) => {
        if (active)
          setResult({
            id,
            revision,
            error:
              e.status === 404
                ? 'Không tìm thấy đơn đặt chỗ hoặc bạn không có quyền xem đơn này.'
                : e.message,
          });
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  const selected = booking?._id === id ? booking : null;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-7 sm:py-10"
      aria-labelledby="trip-detail-title"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/my-trips"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Chuyến đi của tôi
        </Link>
        <button
          type="button"
          disabled={loading}
          className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          onClick={() => setRevision((value) => value + 1)}
        >
          Tải lại trạng thái
        </button>
      </div>
      <h1
        id="trip-detail-title"
        className="mb-6 text-2xl font-bold text-slate-900 sm:text-3xl"
      >
        Chi tiết chuyến đi
      </h1>
      {loading ? (
        <p
          role="status"
          className="rounded-2xl border bg-white p-8 text-center text-slate-500"
        >
          Đang tải chi tiết đặt chỗ...
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
        >
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="mt-3 text-sm font-semibold text-blue-700 underline"
          >
            Thử lại
          </button>
        </div>
      ) : (
        selected && (
          <div className="space-y-6">
            <BookingReceipt booking={selected} showLinks={false} />
            <BookingUsageQr key={id} booking={selected} />
            {selected.status === 'PENDING' && (
              <SepayPayment key={id} booking={selected} onPaid={setBooking} />
            )}
            <BookingCancellation
              key={id}
              booking={selected}
              onUpdated={setBooking}
            />
          </div>
        )
      )}
    </section>
  );
}
