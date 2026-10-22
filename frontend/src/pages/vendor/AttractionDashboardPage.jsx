import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAttractions from '../../hooks/useAttractions';
import useVendorDashboard from '../../hooks/useVendorDashboard';
import AttractionLayout, { Notice } from './AttractionLayout';
import { categories, inputClass, buttonClass } from '../../utils/attractionUi';
import { currentSalesPeriod, salesPeriodError, salesMoney as money } from '../../utils/salesStatistics';
import VendorBookings from '../../components/VendorBookings';
import { TicketTypesSummary } from '../../components/TicketTypesFields';
import VendorPaymentTransactions from '../../components/VendorPaymentTransactions';

export default function AttractionDashboardPage({ payments = false }) {
  const location = useLocation();
  const { facilities, loading: facilitiesLoading, error: facilityError, reload } = useAttractions();
  const [period, setPeriod] = useState(currentSalesPeriod);
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [filterError, setFilterError] = useState('');
  const { report, loading, error, reload: reloadReport } = useVendorDashboard(period);
  const chartData = report?.daily || [];
  const applyPeriod = event => {
    event.preventDefault();
    const invalid = salesPeriodError(draftPeriod);
    setFilterError(invalid);
    if (invalid) return;
    if (draftPeriod.from === period.from && draftPeriod.to === period.to) reloadReport();
    else setPeriod({ ...draftPeriod });
  };
  const hasNoServices = !payments && !facilitiesLoading && !facilityError && facilities.length > 0 &&
    facilities.every((facility) => facility.tickets.length === 0);
  const stats = [
    ['Doanh thu bán vé', money(report?.ticket_revenue)],
    ['Số vé đã bán', (report?.tickets_sold || 0).toLocaleString('vi-VN')],
    ['Lượt quét QR hợp lệ', (report?.qr_scans?.valid || 0).toLocaleString('vi-VN')],
    ['Tổng lượt quét QR', (report?.qr_scans?.total || 0).toLocaleString('vi-VN')]
  ];
  return (
    <AttractionLayout activeScreen={payments ? 13 : 6} title={payments ? 'Thanh toán' : 'Tổng quan kinh doanh'} description={payments ? 'Theo dõi giao dịch thanh toán vé, doanh thu và lượt soát QR của bạn.' : 'Thống kê vé bán, doanh thu và lượt soát QR của cơ sở bạn quản lý.'}>
      <Notice error={error || (!payments && facilityError)} success={location.state?.registrationSuccess} />
      {!payments && <Link to="/vendor/payments" className="mb-5 inline-block text-sm font-semibold text-primary-600">Theo dõi thanh toán vé →</Link>}
      <form onSubmit={applyPeriod} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-semibold">Từ ngày<input name="sales_from" type="date" required className={`${inputClass} mt-2`} value={draftPeriod.from} onChange={event => { setDraftPeriod(value => ({ ...value, from: event.target.value })); setFilterError(''); }} /></label>
          <label className="min-w-0 flex-1 text-sm font-semibold">Đến ngày<input name="sales_to" type="date" required className={`${inputClass} mt-2`} value={draftPeriod.to} onChange={event => { setDraftPeriod(value => ({ ...value, to: event.target.value })); setFilterError(''); }} /></label>
          <button className={buttonClass} type="submit">Áp dụng</button>
          <button className={buttonClass} type="button" disabled={loading} onClick={reloadReport}>Tải lại báo cáo</button>
        </div>
        {filterError && <p role="alert" className="mt-3 text-sm text-rose-700">{filterError}</p>}
        <p className="mt-3 text-xs leading-6 text-slate-500">Kỳ đang xem: {period.from} — {period.to} · Giờ Việt Nam (UTC+7). Vé và doanh thu được ghi nhận một lần tại thời điểm thanh toán thành công đủ số tiền cuối cùng; QR tính theo thời điểm quét.</p>
      </form>
      {!payments && facilityError && <button className="text-sm text-primary-600 mb-5" onClick={reload}>Tải lại cơ sở kinh doanh</button>}
      {!payments && !facilitiesLoading && !facilityError && !facilities.length && <div className="rounded-2xl border border-sky-200 bg-primary-50 p-6 mb-6"><h2 className="text-lg font-bold text-sky-900">Bắt đầu kinh doanh cùng Travelio</h2><p className="text-sm text-sky-800 mt-2 mb-4">Tài khoản vendor đã được tạo. Bổ sung thông tin cơ sở, tạo hạng vé và thiết lập hạn mức để bắt đầu phát hành vé.</p><Link className="text-sm font-bold text-primary-700" to="/vendor/registration">Bổ sung thông tin kinh doanh →</Link></div>}
      {hasNoServices && (
        <div className="rounded-2xl border border-sky-200 bg-primary-50 p-6 mb-6">
          <h2 className="text-lg font-bold text-sky-900">Chưa có dịch vụ</h2>
          <p className="text-sm text-sky-800 mt-2 mb-4">Tài khoản và cơ sở kinh doanh của bạn đã sẵn sàng. Bạn vẫn có thể sử dụng dashboard khi chưa có dịch vụ. Tạo dịch vụ / hạng vé đầu tiên, sau đó bổ sung lịch bán và hạn mức để bắt đầu kinh doanh.</p>
          <Link className="text-sm font-bold text-primary-700" to={`/vendor/registration?createTicket=${facilities[0]._id}`}>Tạo dịch vụ đầu tiên →</Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" aria-busy={loading}>{stats.map(([label, value]) => <div key={label} data-stat={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900 mt-3">{loading || error ? '—' : value}</p></div>)}</div>
      {payments && <div className="mb-6"><VendorPaymentTransactions period={period} /></div>}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Chi tiết lượt soát QR</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">{[
          ['Hợp lệ', report?.qr_scans?.valid], ['Quét lại', report?.qr_scans?.already_redeemed],
          ['Không hợp lệ', report?.qr_scans?.invalid_code], ['Không thuộc vendor', report?.qr_scans?.not_yours],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 font-bold">{loading || error ? '—' : (value || 0).toLocaleString('vi-VN')}</dd></div>)}</dl>
        <p className="mt-4 text-xs leading-6 text-slate-500">{!loading && !error && !report?.qr_scans?.total ? 'Chưa có bản ghi quét QR trong kỳ. ' : ''}Số lượt quét được lấy từ nhật ký đã ghi nhận, không phải số vé hay số khách. Một QR có thể đại diện nhiều vé. Chức năng soát QR cho Attraction Vendor cần được tích hợp riêng.</p>
      </section>
      <div className={`grid ${payments ? '' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold mb-5">Doanh thu và vé bán theo ngày</h2>{loading ? <p role="status" className="text-sm text-slate-500">Đang tải báo cáo...</p> : error ? <p className="text-sm text-slate-500">Không tải được báo cáo. Hãy thử tải lại.</p> : chartData.length ? <div className="space-y-6">{[
          ['revenue', 'Doanh thu (VND)', '#2563eb'], ['tickets_sold', 'Số vé bán', '#059669'],
        ].map(([metric, label, color]) => <div key={metric}><h3 className="mb-2 text-sm font-semibold">{label}</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickFormatter={day => day.split('-').reverse().join('/')} /><YAxis width={65} allowDecimals={false} tickFormatter={value => metric === 'revenue' ? `${(value / 1000).toLocaleString('vi-VN')}k` : value.toLocaleString('vi-VN')} /><Tooltip labelFormatter={day => day.split('-').reverse().join('/')} formatter={value => metric === 'revenue' ? money(value) : Number(value).toLocaleString('vi-VN')} /><Bar dataKey={metric} name={label} fill={color} /></BarChart></ResponsiveContainer></div></div>)}<p className="text-xs text-slate-500">Biểu đồ hiển thị các ngày có giao dịch bán vé hợp lệ trong kỳ.</p></div> : <p className="text-sm text-slate-500">Chưa có giao dịch bán vé hợp lệ trong kỳ đã chọn.</p>}
          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">{[['Hoa hồng nền tảng', report?.platform_commission], ['Doanh thu sau hoa hồng', report?.vendor_net]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{loading || error ? '—' : money(value)}</dd></div>)}</dl><p className="mt-2 text-xs text-slate-500">Doanh thu sau hoa hồng chưa xác nhận là tiền đã được chuyển khoản.</p>
        </section>
        {!payments && <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex justify-between gap-3 mb-5"><h2 className="font-bold">Cơ sở & Dịch vụ của bạn</h2><Link className="text-xs text-primary-600 font-semibold" to="/vendor/registration">Quản lý →</Link></div>{facilitiesLoading ? <p className="text-sm text-slate-500">Đang tải...</p> : facilities.map(facility => <div key={facility._id} className="py-3 border-b border-slate-100 last:border-0"><h3 className="text-sm font-semibold">{facility.name}</h3><p className="text-xs text-slate-500 mt-1">{categories[facility.attraction_category] || 'Điểm tham quan'} · {facility.city} · {facility.tickets.length} dịch vụ</p><div className="space-y-4 mt-3">{facility.tickets.map(service => <div key={service._id}><strong className="text-sm">{service.name}</strong><p className="text-xs text-slate-500">{service.ticket_types.length} hạng vé</p><TicketTypesSummary types={service.ticket_types} /></div>)}</div></div>)}<Link to="/vendor/inventory" className="mt-5 block text-sm text-primary-600 font-semibold">Cấu hình giá & Hạn mức theo ngày →</Link></section>}
      </div>
      {!payments && <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><h2 className="font-bold p-6">Giao dịch bán vé gần nhất trong kỳ</h2>{loading ? <p className="px-6 pb-6 text-sm text-slate-500">Đang tải giao dịch...</p> : !report?.recent_sales?.length ? <p className="px-6 pb-6 text-sm text-slate-500">{error ? 'Không tải được giao dịch.' : 'Chưa có giao dịch trong kỳ đã chọn.'}</p> : <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-xs text-slate-500 bg-slate-50"><tr>{['Mã đặt vé', 'Ngày ghi nhận (VN)', 'Dịch vụ / Hạng vé', 'Số lượng', 'Doanh thu'].map((label) => <th key={label} className="px-5 py-3 text-left">{label}</th>)}</tr></thead><tbody>{report.recent_sales.map((sale) => <tr key={sale.detail_id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{sale.booking_code}</td><td className="px-5 py-4">{new Date(sale.payment_date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td className="px-5 py-4">{sale.service_name}{sale.ticket_name && <span className="block text-xs text-slate-500">{sale.ticket_name}</span>}</td><td className="px-5 py-4">{sale.quantity.toLocaleString('vi-VN')}</td><td className="px-5 py-4">{money(sale.revenue)}</td></tr>)}</tbody></table></div>}</section>}
      {!payments && <VendorBookings />}
    </AttractionLayout>
  );
}
