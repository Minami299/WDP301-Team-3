import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { canShowUsageQr } from '../utils/tripManagement';

function UsageQrImage({ value, label }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 256,
    })
      .then((url) => {
        if (active) setResult({ value, url });
      })
      .catch(() => {
        if (active) setResult({ value, error: true });
      });
    return () => {
      active = false;
    };
  }, [value]);
  if (result?.value !== value)
    return (
      <p role="status" className="py-8 text-sm text-slate-500">
        Đang tải mã QR sử dụng...
      </p>
    );
  if (result.error)
    return (
      <p role="alert" className="py-8 text-sm text-rose-700">
        Không thể hiển thị mã QR. Vui lòng tải lại trạng thái đơn.
      </p>
    );
  return (
    <img
      src={result.url}
      width="256"
      height="256"
      alt={`QR sử dụng ${label}`}
      className="mx-auto max-w-full"
    />
  );
}

export default function BookingUsageQr({ booking }) {
  return (
    <section
      className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-7"
      aria-labelledby="usage-qr-title"
    >
      <h2 id="usage-qr-title" className="text-lg font-bold text-slate-900">
        QR sử dụng dịch vụ
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Xuất trình mã này khi nhận phòng hoặc vào cửa.
      </p>
      {booking.status !== 'CONFIRMED' ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          {booking.status === 'PENDING'
            ? 'QR sử dụng sẽ có sau khi thanh toán được xác nhận.'
            : 'Đơn này hiện không có QR sử dụng còn hiệu lực.'}
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {booking.details?.map((detail) => (
            <div
              key={detail._id}
              className="rounded-xl border border-slate-200 p-4 text-center"
            >
              <h3 className="text-sm font-semibold text-slate-800">
                {detail.service_name || detail.ticket_name || 'Dịch vụ'}
                {detail.ticket_name &&
                  detail.ticket_name !== detail.service_name &&
                  ` · ${detail.ticket_name}`}
              </h3>
              {canShowUsageQr(booking, detail) ? (
                <UsageQrImage
                  key={detail.qr_code}
                  value={detail.qr_code}
                  label={`${booking.booking_code} · ${detail.ticket_name || detail.service_name || 'Dịch vụ'}`}
                />
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {detail.check_in_status === 'CHECKED_IN'
                    ? 'Dịch vụ đã được sử dụng.'
                    : detail.check_in_status === 'NO_SHOW'
                      ? 'Dịch vụ đã được ghi nhận không đến.'
                      : 'Chưa có mã QR sử dụng. Vui lòng tải lại trạng thái đơn.'}
                </p>
              )}
            </div>
          ))}
          {!booking.details?.length && (
            <p className="text-sm text-slate-500">
              Chưa có mã QR sử dụng cho đơn này.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
