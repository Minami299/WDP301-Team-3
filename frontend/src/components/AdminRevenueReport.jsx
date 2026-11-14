import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAdminRevenue from '../hooks/useAdminRevenue';
import { currentSalesPeriod, salesPeriodError } from '../utils/salesStatistics';
import ExportReportButton from './ExportReportButton';
import RevenueBreakdown from './RevenueBreakdown';
import useAuth from '../hooks/useAuth';

const money = value => value == null ? 'Chưa xác định' : `${BigInt(value).toLocaleString('vi-VN')} ₫`;
const paymentDate = value => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));
const currentMonth = () => {
  const period = currentSalesPeriod();
  const [year, month] = period.from.split('-').map(Number);
  return { ...period, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
};
const issueLabels = {
  INVALID_VND: 'Số tiền không phải số nguyên VND hợp lệ',
  MISSING_COMMISSION_RATE: 'Thiếu tỷ lệ phí sàn',
  MISSING_BOOKING_DETAILS: 'Thiếu chi tiết booking',
  INVALID_BOOKING_TOTAL: 'Giá trị booking không hợp lệ',
  CURRENT_RATE_FALLBACK: 'Booking cũ: dùng tỷ lệ hiện tại của cơ sở',
  UNSUPPORTED_REFUND_DATA: 'Dữ liệu hoàn tiền chưa có quy tắc xử lý',
  INCOMPLETE_PAYMENT_HISTORY: 'Lịch sử thanh toán chưa đủ để tính',
  REFUND_STATUS_MISMATCH: 'Booking báo đã hoàn nhưng thanh toán chưa xác nhận hoàn',
  CANCELLED_BOOKING_WITH_PAYMENT: 'Booking đã hủy nhưng còn tiền đã thu, cần đối soát',
  MISSING_BOOKING: 'Không tìm thấy booking của giao dịch',
  MISSING_PARTNER: 'Chưa xác định đối tác của một số dòng booking',
  MISSING_FACILITY: 'Chưa xác định cơ sở hoặc loại cơ sở của dòng booking',
};

export default function AdminRevenueReport({ partner = false }) {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPeriod = () => {
    const proposed = { from: searchParams.get('from'), to: searchParams.get('to') };
    return { ...(salesPeriodError(proposed) ? currentMonth() : proposed),
      ...Object.fromEntries(['vendor_id', 'facility_id', 'status', 'interval'].map(key => [key, searchParams.get(key) || ''])),
      facility_type: searchParams.has('facility_type') ? searchParams.get('facility_type') : currentUser?.role === 'ACTIVITY_VENDOR' ? 'ATTRACTION' : 'HOTEL',
    };
  };
  const [filters, setFilters] = useState(initialPeriod);
  const [query, setQuery] = useState(() => ({ ...initialPeriod(), page: Math.max(1, Number(searchParams.get('page')) || 1) }));
  const [validation, setValidation] = useState('');
  const [optionCache, setOptionCache] = useState({});
  const normalized = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''));
  const { report, loading, error, reload } = useAdminRevenue(normalized, partner);
  const applyQuery = next => {
    setQuery(next);
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([key, value]) => key === 'facility_type' || value !== '')), { replace: true });
  };
  const changeFilter = changes => {
    if (report) setOptionCache({ facility_options: report.facility_options, partner_options: report.partner_options });
    setFilters(previous => ({ ...previous, ...changes }));
  };
  const selectFacility = id => {
    const next = { ...query, facility_id: id || '', page: 1 };
    if (report) setOptionCache({ facility_options: report.facility_options, partner_options: report.partner_options });
    setFilters(next); applyQuery(next);
  };
  const submit = event => {
    event.preventDefault();
    const message = salesPeriodError(filters);
    setValidation(message);
    if (!message) { applyQuery({ ...filters, page: 1 }); reload(); }
  };
  return (
    <section aria-label="Doanh thu và khách sạn" aria-busy={loading} className="space-y-4">
      <div>
        <h2 className="font-heading font-700 text-lg">{partner ? 'Báo cáo tài chính đối tác' : 'Doanh thu khách sạn & cơ sở'}</h2>
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        {!partner && <label className="text-sm">Nhóm kinh doanh<select aria-label="Nhóm kinh doanh" value={filters.facility_type} onChange={event => changeFilter({ facility_type: event.target.value, facility_id: '', vendor_id: '' })} className="block mt-1 border rounded-8 px-3 py-2 bg-white"><option value="">Tất cả cơ sở</option><option value="HOTEL">Khách sạn</option><option value="ATTRACTION">Tham quan / hoạt động</option></select></label>}
        <label className="text-sm">{filters.facility_type === 'HOTEL' ? 'Khách sạn' : 'Cơ sở'}<select aria-label="Lọc theo cơ sở" value={filters.facility_id} onChange={event => changeFilter({ facility_id: event.target.value })} className="block mt-1 max-w-64 border rounded-8 px-3 py-2 bg-white"><option value="">Tất cả cơ sở trong phạm vi</option>{(report?.facility_options || optionCache.facility_options || []).filter(item => (!filters.facility_type || item.type === filters.facility_type) && (!filters.vendor_id || item.vendor_id === filters.vendor_id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm">Giao dịch<select aria-label="Trạng thái giao dịch" value={filters.status} onChange={event => changeFilter({ status: event.target.value })} className="block mt-1 border rounded-8 px-3 py-2 bg-white"><option value="">Thành công + đã hoàn</option><option value="SUCCESS">Thành công</option><option value="REFUNDED">Đã hoàn toàn phần</option></select></label>
        <label className="text-sm">Nhóm thời gian<select aria-label="Nhóm thời gian" value={filters.interval} onChange={event => changeFilter({ interval: event.target.value })} className="block mt-1 border rounded-8 px-3 py-2 bg-white"><option value="">Tự động</option><option value="daily">Theo ngày</option><option value="monthly">Theo tháng</option></select></label>
        {!partner && <label className="text-sm">Đối tác<select aria-label="Lọc theo đối tác" value={filters.vendor_id || ''} onChange={event => changeFilter({ vendor_id: event.target.value, facility_id: '' })} className="block mt-1 max-w-64 border border-border rounded-8 px-3 py-2 bg-white"><option value="">Toàn hệ thống</option>{(report?.partner_options || optionCache.partner_options || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="text-sm">Từ ngày<input name="revenue_from" aria-label="Từ ngày" type="date" required value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="block mt-1 border border-border rounded-8 px-3 py-2 bg-white" /></label>
        <label className="text-sm">Đến ngày<input name="revenue_to" aria-label="Đến ngày" type="date" required value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="block mt-1 border border-border rounded-8 px-3 py-2 bg-white" /></label>
        <button className="px-4 py-2 rounded-8 bg-primary-500 text-white text-sm font-semibold">Áp dụng</button>
        <button type="button" onClick={() => { const period = { ...filters, ...currentMonth() }; setFilters(period); setValidation(''); applyQuery({ ...period, page: 1 }); reload(); }} className="px-4 py-2 rounded-8 border border-border bg-white text-sm">Tháng hiện tại</button>
        <button type="button" onClick={reload} className="px-4 py-2 rounded-8 border border-border bg-white text-sm">Làm mới</button>
      </form>
      <ExportReportButton period={query} vendorId={query.vendor_id} partner={partner} disabled={loading || Boolean(error) || !report} empty={Boolean(report && report.total === 0)} />
      {validation && <p role="alert" className="text-sm text-red-700">{validation}</p>}
      {loading && <p role="status" className="text-sm text-text-secondary">Đang tải báo cáo...</p>}
      {error && <div role="alert" className="p-4 bg-danger-100 text-red-700 rounded-8 text-sm">Không tải được báo cáo: {error} <button onClick={reload} className="underline font-semibold">Thử lại</button></div>}
      {!loading && report && <>
        <p className="text-sm text-text-secondary">Kỳ báo cáo: {report.period.from} – {report.period.to} · {report.total} giao dịch</p>
        {report.partner && <p className="text-sm font-semibold">Đối tác: {report.partner.name} · {report.partner.id}</p>}
        <dl className="grid sm:grid-cols-3 gap-3">
          {[
            ['Tổng thanh toán thành công', 'gross_payments', 'Gồm giao dịch thành công đã hoàn toàn phần.'],
            ['Tổng hoàn tiền đã ghi nhận', 'refunds', 'Theo trạng thái hoàn của các thanh toán trong kỳ.'],
            ['Giá trị sau hoàn trả', 'net_revenue', 'Tiền giao dịch còn lại, gồm cả phần thuộc đối tác.'],
          ].map(([label, field, description]) => <div key={field} data-revenue-stat={field} className="bg-white border border-border rounded-8 p-4">
            <dt className="text-sm text-text-secondary">{label}</dt>
            <dd className="font-heading font-700 text-xl mt-2 break-words">{money(report.totals[field])}</dd>
            <p className="text-xs text-text-secondary mt-2">{description}</p>
          </div>)}
        </dl>
        <div className="rounded-8 border border-border bg-white p-4"><p className="text-sm text-text-secondary">Phần doanh thu đối tác</p><p className="font-heading font-700 text-xl mt-2">{money(report.partner_revenue)}</p><p className="text-xs text-text-secondary mt-2">Chưa đồng nhất với tiền đã đối soát hoặc chi trả.</p></div>
        {query.facility_id && <button className="text-primary-600 text-sm underline" onClick={() => selectFacility('')}>← Xem lại tất cả cơ sở trong phạm vi</button>}
        <RevenueBreakdown key={JSON.stringify([query.facility_type, query.vendor_id, query.facility_id, query.status, query.from, query.to])} report={report} onSelect={selectFacility} />
        <div className="bg-amber-50 border border-amber-200 rounded-8 p-4 text-sm text-amber-900 space-y-2">
          {report.limitations.filter(item => !item.toLowerCase().includes('hoa hồng')).map(item => <p key={item}>{item}</p>)}
          {report.quality.issue_count > 0 && <p role="status">{report.quality.issue_count} giao dịch cần kiểm tra: {report.quality.issues.map(issue => issueLabels[issue] || issue).join('; ')}. Chỉ số thiếu dữ liệu hiển thị “Chưa xác định”.</p>}
        </div>
        {report.total === 0 ? <p className="bg-white border border-border rounded-8 p-6 text-sm text-text-secondary">Không có giao dịch đủ điều kiện trong khoảng thời gian này.</p> : <>
          <div data-payment-transactions className="bg-white border border-border rounded-8 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Chi tiết thanh toán</caption>
              <thead><tr className="text-left text-text-secondary border-b border-border">
                {['Giao dịch / Booking', 'Ngày thanh toán', 'Đối tác', 'Số tiền', 'Tiền hoàn', 'Sau hoàn trả', 'Trạng thái'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{label}</th>)}
              </tr></thead>
              <tbody>{report.rows.map(row => <tr key={row.payment_id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3"><div className="font-medium break-all">{row.transaction_id}</div><div className="text-xs text-text-secondary">{row.booking_code || row.booking_id}</div>{row.issues.length > 0 && <p className="text-xs text-amber-800 mt-1">{row.issues.map(issue => issueLabels[issue] || issue).join('; ')}</p>}</td>
                <td className="px-4 py-3 whitespace-nowrap">{paymentDate(row.payment_date)}</td>
                <td className="px-4 py-3">{row.partners?.map(item => item.name).join(' / ') || 'Chưa xác định đối tác'}<p className="text-xs text-text-secondary">{[...new Set(row.lines?.map(item => item.facility_name) || [])].join(' / ')}</p></td>
                <td className="px-4 py-3 whitespace-nowrap">{money(row.amount)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{money(row.refund_amount)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{money(row.net_revenue)}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-1 rounded-4 text-xs font-semibold ${row.status === 'REFUNDED' ? 'bg-amber-50 text-amber-800' : 'bg-success-100 text-emerald-800'}`}>{row.status === 'REFUNDED' ? 'Đã hoàn toàn phần' : 'Thành công'}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
          <nav aria-label="Phân trang giao dịch" className="flex items-center justify-end gap-3 text-sm">
            <button disabled={query.page <= 1} onClick={() => applyQuery({ ...query, page: query.page - 1 })} className="px-3 py-2 rounded-8 border border-border bg-white disabled:opacity-40">Trước</button>
            <span>Trang {report.page} / {report.total_pages}</span>
            <button disabled={query.page >= report.total_pages} onClick={() => applyQuery({ ...query, page: query.page + 1 })} className="px-3 py-2 rounded-8 border border-border bg-white disabled:opacity-40">Sau</button>
          </nav>
        </>}
      </>}
    </section>
  );
}
