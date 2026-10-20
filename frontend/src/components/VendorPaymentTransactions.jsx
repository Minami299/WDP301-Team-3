import { useEffect, useState } from 'react';
import { vendorApi } from '../services/api/vendorApi';
import { inputClass, buttonClass } from '../utils/attractionUi';
import { salesMoney } from '../utils/salesStatistics';

const labels = { PENDING: 'Đang chờ', SUCCESS: 'Thành công', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền' };
const bookingLabels = { PENDING: 'Đơn chờ xác nhận', CONFIRMED: 'Đơn đã xác nhận', COMPLETED: 'Đơn hoàn tất', CANCELLED: 'Đơn đã hủy', REFUNDED: 'Đơn đã hoàn tiền' };

export default function VendorPaymentTransactions({ period }) {
  const { from, to } = period;
  const periodKey = `${from}/${to}`;
  const [filter, setFilter] = useState({ periodKey, page: 1, status: '' });
  const page = filter.periodKey === periodKey ? filter.page : 1;
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([from, to, filter.status, page, revision]);
  const [state, setState] = useState({ key, data: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setState({ key, data: null, loading: true, error: '' });
      return vendorApi.getPaymentTransactions({ from, to, status: filter.status || undefined, page, page_size: 10 });
    }).then(response => {
      if (active) setState({ key, data: response.data, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ key, data: null, loading: false, error: error.message || 'Không tải được giao dịch.' });
    });
    return () => { active = false; };
  }, [from, to, filter.status, page, key]);
  const { data, loading, error } = state.key === key ? state : { data: null, loading: true, error: '' };
  const changePage = next => setFilter(value => ({ ...value, periodKey, page: next }));
  return <section data-payment-transactions aria-busy={loading} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="space-y-4 p-5">
      <h2 className="font-bold">Giao dịch thanh toán vé</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Trạng thái thanh toán<select name="payment_status" className={`${inputClass} mt-2`} value={filter.status} onChange={event => setFilter({ periodKey, page: 1, status: event.target.value })}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => setRevision(value => value + 1)}>Tải lại giao dịch</button>
      </div>
      <p className="text-xs leading-6 text-slate-500">Mỗi dòng là một lần thanh toán cho một hạng vé trong đơn. Số lượng có thể xuất hiện lại khi thanh toán nhiều lần; không cộng các dòng để tính tổng vé bán. Chỉ lần thanh toán hoàn tất đơn hợp lệ được ghi nhận doanh thu. Đơn chưa có bản ghi thanh toán chưa xuất hiện ở bảng này.</p>
      <p className="text-xs text-slate-500">Bộ lọc trạng thái chỉ áp dụng cho bảng giao dịch; các chỉ số và biểu đồ phía trên vẫn tính toàn kỳ. Ngày giao dịch theo giờ Việt Nam (UTC+7).</p>
    </div>
    {loading ? <p role="status" className="px-5 pb-5 text-sm text-slate-500">Đang tải giao dịch thanh toán...</p> : error ? <p role="alert" className="px-5 pb-5 text-sm text-rose-700">{error} Hãy thử tải lại giao dịch.</p> : !data?.rows.length ? <p className="px-5 pb-5 text-sm text-slate-500">Không có giao dịch phù hợp trong kỳ và trạng thái đã chọn.</p> : <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Mã đơn', 'Dịch vụ / Hạng vé', 'Số lượng trong đơn', 'Ngày giao dịch (VN)', 'Trạng thái thanh toán', 'Doanh thu ghi nhận'].map(label => <th key={label} className="px-5 py-3 text-left">{label}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={`${row.payment_id}/${row.detail_id}`} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{row.booking_code}<span className="mt-1 block text-xs font-normal text-slate-500">{bookingLabels[row.booking_status] || row.booking_status}</span></td><td className="px-5 py-4">{row.service_name}{row.ticket_name && <span className="block text-xs text-slate-500">{row.ticket_name}</span>}</td><td className="px-5 py-4">{row.quantity.toLocaleString('vi-VN')}</td><td className="px-5 py-4">{new Date(row.payment_date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.payment_status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800' : row.payment_status === 'FAILED' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{labels[row.payment_status] || row.payment_status}</span></td><td className="px-5 py-4 font-semibold">{salesMoney(row.recorded_revenue)}</td></tr>)}</tbody></table>
    </div>}
    {!loading && !error && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 text-sm">
      <p>{data?.total.toLocaleString('vi-VN') || 0} dòng · Trang {page}{data?.total_pages ? ` / ${data.total_pages}` : ''}</p>
      <div className="flex gap-2"><button type="button" className={buttonClass} disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</button><button type="button" className={buttonClass} disabled={!data || page >= data.total_pages} onClick={() => changePage(page + 1)}>Trang sau</button></div>
    </div>}
  </section>;
}
