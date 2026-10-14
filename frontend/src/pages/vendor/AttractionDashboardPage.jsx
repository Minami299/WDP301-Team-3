import { Link, useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAttractions from '../../hooks/useAttractions';
import useVendorDashboard from '../../hooks/useVendorDashboard';
import AttractionLayout, { Notice } from './AttractionLayout';
import { categories, money } from '../../utils/attractionUi';
import VendorBookings from '../../components/VendorBookings';
import { TicketTypesSummary } from '../../components/TicketTypesFields';

export default function AttractionDashboardPage() {
  const location = useLocation();
  const { facilities, loading: facilitiesLoading, error: facilityError, reload } = useAttractions();
  const { report, loading, error } = useVendorDashboard();
  const hasNoServices = !facilitiesLoading && !facilityError && facilities.length > 0 &&
    facilities.every((facility) => facility.tickets.length === 0);
  const stats = [
    ['Doanh thu bán vé', money(report?.ticket_revenue)],
    ['Số vé đã bán', (report?.tickets_sold || 0).toLocaleString('vi-VN')],
    ['Doanh thu thực nhận', money(report?.vendor_net)],
    ['Cơ sở kinh doanh', facilities.length]
  ];
  return (
    <AttractionLayout activeScreen={6} title="Tổng quan kinh doanh" description="Quản lý điểm tham quan, tour và trải nghiệm. Báo cáo doanh thu và vé đã bán trong tháng hiện tại.">
      <Notice error={error || facilityError} success={location.state?.registrationSuccess} />
      {facilityError && <button className="text-sm text-primary-600 mb-5" onClick={reload}>Tải lại cơ sở kinh doanh</button>}
      {!facilitiesLoading && !facilityError && !facilities.length && <div className="rounded-2xl border border-sky-200 bg-primary-50 p-6 mb-6"><h2 className="text-lg font-bold text-sky-900">Bắt đầu kinh doanh cùng Travelio</h2><p className="text-sm text-sky-800 mt-2 mb-4">Tài khoản vendor đã được tạo. Bổ sung thông tin cơ sở, tạo hạng vé và thiết lập hạn mức để bắt đầu phát hành vé.</p><Link className="text-sm font-bold text-primary-700" to="/vendor/registration">Bổ sung thông tin kinh doanh →</Link></div>}
      {hasNoServices && (
        <div className="rounded-2xl border border-sky-200 bg-primary-50 p-6 mb-6">
          <h2 className="text-lg font-bold text-sky-900">Chưa có dịch vụ</h2>
          <p className="text-sm text-sky-800 mt-2 mb-4">Tài khoản và cơ sở kinh doanh của bạn đã sẵn sàng. Bạn vẫn có thể sử dụng dashboard khi chưa có dịch vụ. Tạo dịch vụ / hạng vé đầu tiên, sau đó bổ sung lịch bán và hạn mức để bắt đầu kinh doanh.</p>
          <Link className="text-sm font-bold text-primary-700" to={`/vendor/registration?createTicket=${facilities[0]._id}`}>Tạo dịch vụ đầu tiên →</Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{stats.map(([label, value], index) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900 mt-3">{(index === 3 ? facilitiesLoading || facilityError : loading || error) ? '—' : value}</p></div>)}</div>
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold mb-5">Doanh thu bán vé</h2>{loading ? <p className="text-sm text-slate-500">Đang tải báo cáo...</p> : report?.monthly?.length ? <div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${(value / 1000).toLocaleString('vi-VN')}k`} /><Tooltip formatter={(value) => money(value)} /><Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" fill="#dbeafe" /></AreaChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500">{error ? 'Không tải được báo cáo.' : 'Chưa có doanh thu trong tháng hiện tại.'}</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex justify-between gap-3 mb-5"><h2 className="font-bold">Cơ sở & Dịch vụ của bạn</h2><Link className="text-xs text-primary-600 font-semibold" to="/vendor/registration">Quản lý →</Link></div>{facilitiesLoading ? <p className="text-sm text-slate-500">Đang tải...</p> : facilities.map(facility => <div key={facility._id} className="py-3 border-b border-slate-100 last:border-0"><h3 className="text-sm font-semibold">{facility.name}</h3><p className="text-xs text-slate-500 mt-1">{categories[facility.attraction_category] || 'Điểm tham quan'} · {facility.city} · {facility.tickets.length} dịch vụ</p><div className="space-y-4 mt-3">{facility.tickets.map(service => <div key={service._id}><strong className="text-sm">{service.name}</strong><p className="text-xs text-slate-500">{service.ticket_types.length} hạng vé</p><TicketTypesSummary types={service.ticket_types} /></div>)}</div></div>)}<Link to="/vendor/inventory" className="mt-5 block text-sm text-primary-600 font-semibold">Cấu hình giá & Hạn mức theo ngày →</Link></section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><h2 className="font-bold p-6">Giao dịch bán vé gần nhất</h2>{loading ? <p className="px-6 pb-6 text-sm text-slate-500">Đang tải giao dịch...</p> : !report?.recent_sales?.length ? <p className="px-6 pb-6 text-sm text-slate-500">{error ? 'Không tải được giao dịch.' : 'Chưa có giao dịch trong tháng hiện tại.'}</p> : <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-xs text-slate-500 bg-slate-50"><tr>{['Mã đặt vé', 'Khách hàng', 'Hạng vé', 'Số lượng', 'Doanh thu'].map((label) => <th key={label} className="px-5 py-3 text-left">{label}</th>)}</tr></thead><tbody>{report.recent_sales.map((sale) => <tr key={sale.booking_code + sale.service_name} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{sale.booking_code}</td><td className="px-5 py-4">{sale.guest_name}</td><td className="px-5 py-4">{sale.service_name}</td><td className="px-5 py-4">{sale.quantity}</td><td className="px-5 py-4">{money(sale.revenue)}</td></tr>)}</tbody></table></div>}</section>
      <VendorBookings />
    </AttractionLayout>
  );
}
