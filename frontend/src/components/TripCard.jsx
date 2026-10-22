import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCalendar, IconHotel, IconTicket } from './Icons';
import { money } from '../utils/attractionUi';
import { bookingTime, formatDate } from '../utils/bookingUi';
import {
  detailDate,
  detailQuantity,
  serviceType,
  serviceTypeLabel,
  tripStatusClass,
  tripStatusLabel,
} from '../utils/tripManagement';

export default function TripCard({ booking }) {
  const details = booking.details || [];
  const first = details[0] || {};
  const [failedImage, setFailedImage] = useState(null);
  const image = details.find((detail) => detail.facility_image)?.facility_image;
  const names = [
    ...new Set(details.map((detail) => detail.facility_name).filter(Boolean)),
  ].join(' · ');
  const TypeIcon = serviceType(first) === 'HOTEL' ? IconHotel : IconTicket;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex">
      <div className="flex h-44 shrink-0 items-center justify-center bg-blue-50 text-blue-300 sm:h-auto sm:w-48">
        {image && failedImage !== image ? (
          <img
            src={image}
            alt={names || 'Cơ sở dịch vụ'}
            loading="lazy"
            onError={() => setFailedImage(image)}
            className="h-full w-full object-cover sm:min-h-52"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-5">
            <TypeIcon size={40} />
            <span className="text-xs text-slate-500">Chưa có ảnh cơ sở</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <TypeIcon size={14} />
              {[...new Set(details.map(serviceTypeLabel))].join(' · ') ||
                'Dịch vụ'}
            </p>
            <h2 className="break-words text-lg font-bold text-slate-900">
              {names || first.service_name || 'Thông tin cơ sở chưa có'}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${tripStatusClass(booking.status)}`}
          >
            {tripStatusLabel(booking.status)}
          </span>
        </div>
        <p className="mt-2 break-all text-xs text-slate-500">
          Mã đặt chỗ:{' '}
          <span className="font-semibold text-slate-700">
            {booking.booking_code || booking._id}
          </span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {details.map((detail) => (
            <li key={detail._id} className="flex gap-2">
              <IconCalendar
                size={16}
                className="mt-0.5 shrink-0 text-blue-500"
              />
              <span>
                {detail.service_name || detail.ticket_name || 'Dịch vụ'}
                {detail.ticket_name &&
                  detail.ticket_name !== detail.service_name &&
                  ` · ${detail.ticket_name}`}
                <span className="mt-0.5 block text-xs">
                  {formatDate(detailDate(detail)) || 'Chưa có ngày sử dụng'}
                  {detail.check_out_date &&
                    ` → ${formatDate(detail.check_out_date)}`}{' '}
                  · {detailQuantity(detail)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Ngày đặt: {bookingTime(booking.created_at) || 'Chưa có dữ liệu'}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Tổng tiền</p>
            <p className="text-xl font-bold text-blue-700">
              {money(booking.final_amount)}
            </p>
          </div>
          <Link
            to={`/my-trips/${booking._id}`}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Xem chi tiết
            <span className="sr-only">
              {' '}
              đơn {booking.booking_code || booking._id}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
