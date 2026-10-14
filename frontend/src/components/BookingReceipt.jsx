import { Link } from 'react-router-dom';
import { money } from '../utils/attractionUi';
import { ageLabel } from '../utils/ticketTypes';
import { orderStatus, bookingTime } from '../utils/bookingUi';

export default function BookingReceipt({ booking, showLinks = true }) {
  return <article className="bg-white rounded-2xl border p-5 sm:p-7 break-words min-w-0">
    <div className="flex flex-wrap gap-3 justify-between"><div><h2 className="font-bold text-lg">{booking.booking_code}</h2><p className="text-xs text-slate-500 mt-1">{bookingTime(booking.created_at)}</p></div><span className="text-sm font-semibold text-primary-700">{orderStatus(booking.status)}</span></div>
    <p className="text-sm text-slate-500 my-3">{booking.guest_name} · {booking.guest_email} · {booking.guest_phone}</p>
    <div className="space-y-3">{booking.details.map(d => <div key={d._id} className="bg-slate-50 rounded-xl p-4"><h3 className="font-semibold">{d.service_name} · {d.ticket_name}</h3><p className="text-xs text-slate-500 mt-1">{d.facility_name}{d.visit_date && ` · ${new Date(d.visit_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}`}</p><p className="text-sm mt-2">{d.quantity} × {money(d.unit_price)} = <strong>{money(d.quantity * d.unit_price)}</strong></p>{d.ticket_description && <p className="text-xs text-slate-500 mt-2">{d.ticket_description}</p>}{d.ticket_conditions && <p className="text-xs mt-2">Điều kiện: {d.ticket_conditions}</p>}<p className="text-xs text-slate-500 mt-1">{ageLabel(d)}</p>{d.qr_code && <code className="text-xs break-all block mt-2">{d.qr_code}</code>}</div>)}</div>
    <div className="flex flex-wrap gap-2 justify-between font-bold text-lg mt-5"><span>Tổng tiền dự kiến</span><span className="text-primary-700">{money(booking.final_amount)}</span></div>
    {booking.status === 'PENDING' && <p className="text-sm text-amber-700 mt-3">Đơn chưa thanh toán. Thông tin này là yêu cầu đặt vé; vé sử dụng sẽ được phát hành ở giai đoạn sau.</p>}
    <p className="text-xs text-slate-500 mt-3">Giá và điều kiện được lưu tại thời điểm gửi yêu cầu.</p>
    {showLinks && <div className="flex flex-wrap gap-4 mt-5 text-sm"><Link to={`/my-trips/${booking._id}`} className="text-primary-600">Chi tiết & yêu cầu hủy</Link><Link to="/my-trips" className="text-primary-600">Lịch sử mua vé</Link><button type="button" onClick={() => window.print()} className="text-primary-600">In thông tin</button></div>}
  </article>;
}
