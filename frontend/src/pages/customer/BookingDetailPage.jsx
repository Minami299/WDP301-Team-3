import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import BookingReceipt from '../../components/BookingReceipt';
import PayosPayment from '../../components/PayosPayment';
import PaymentSuccess from '../../components/PaymentSuccess';
import BookingCancellation from '../../components/BookingCancellation';
import BookingUsageQr from '../../components/BookingUsageQr';

export default function BookingDetailPage() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const cancelledAtPayos = query.get('payment') === 'cancel';
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
            {['CONFIRMED', 'COMPLETED'].includes(selected.status) && selected.payments?.some(p => p.status === 'SUCCESS') && <PaymentSuccess booking={selected} />}
            {selected.status === 'CANCELLED' && selected.payments?.length === 0 && selected.decision_note?.startsWith('Hết thời gian') && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Đơn đã hết thời gian giữ chỗ 15 phút và bị hủy do chưa thanh toán. Vui lòng đặt lại.</p>}
            <BookingReceipt booking={selected} showLinks={false} />
            <BookingUsageQr key={id} booking={selected} />
            {cancelledAtPayos && selected.status === 'PENDING' && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Bạn đã thoát khỏi trang thanh toán payOS. Đơn vẫn được giữ, quét mã bên dưới để thanh toán trước khi hết hạn.</p>}
            {selected.status === 'PENDING' && (
              <PayosPayment key={id} booking={selected} onPaid={() => setRevision(value => value + 1)} />
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
