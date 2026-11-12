import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { canShowUsageQr } from '../utils/tripManagement';
import { checkinUrl, formatUsedAt } from '../utils/checkinLink';

const POLL_MS = 6000;

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

function UsedNotice({ detail }) {
  if (detail.check_in_status === 'CHECKED_IN')
    return (
      <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Mã này đã được sử dụng</p>
        <p className="mt-1">
          {detail.checked_in_at
            ? `Cơ sở đã xác nhận lúc ${formatUsedAt(detail.checked_in_at)}. `
            : 'Cơ sở đã xác nhận check-in. '}
          Mã không còn hiệu lực.
        </p>
      </div>
    );
  return (
    <p className="mt-4 text-sm text-slate-500">
      {detail.check_in_status === 'NO_SHOW'
        ? 'Dịch vụ đã được ghi nhận không đến.'
        : 'Chưa có mã QR sử dụng. Vui lòng tải lại trạng thái đơn.'}
    </p>
  );
}

export default function BookingUsageQr({ booking, onRefresh }) {
  const hasLiveQr = booking.status === 'CONFIRMED' && booking.details?.some((detail) => canShowUsageQr(booking, detail));

  // Poll while a code is still unused so the card flips as soon as the facility scans it.
  useEffect(() => {
    if (!hasLiveQr || !onRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') onRefresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [hasLiveQr, onRefresh]);

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
      {!['CONFIRMED', 'COMPLETED'].includes(booking.status) ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          {booking.status === 'PENDING'
            ? 'QR sử dụng sẽ có sau khi thanh toán được xác nhận.'
            : 'Đơn này hiện không có QR sử dụng còn hiệu lực.'}
        </p>
      ) : (
        <>
          {hasLiveQr && (
            <p role="note" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <span className="font-semibold">Không quét mã này.</span> Chỉ nhân viên của cơ sở mới được quét khi bạn nhận phòng hoặc vào cổng.
              Mã chỉ dùng được một lần, người khác quét trước thì mã mất hiệu lực và bạn không thể dùng dịch vụ. Đừng gửi ảnh mã cho ai.
            </p>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-live="polite">
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
                  <>
                    <UsageQrImage
                      key={detail.qr_code}
                      value={checkinUrl(detail.qr_code)}
                      label={`${booking.booking_code} · ${detail.ticket_name || detail.service_name || 'Dịch vụ'}`}
                    />
                    <p className="mt-2 break-all font-mono text-xs text-slate-500">{detail.qr_code}</p>
                    <p className="mt-3 text-sm font-semibold text-rose-700">
                      Hãy cẩn thận khi đưa mã QR: ai quét trước sẽ dùng mất mã này.
                    </p>
                  </>
                ) : (
                  <UsedNotice detail={detail} />
                )}
              </div>
            ))}
            {!booking.details?.length && (
              <p className="text-sm text-slate-500">
                Chưa có mã QR sử dụng cho đơn này.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
