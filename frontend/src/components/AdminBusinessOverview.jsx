import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useAdminAnalytics from '../hooks/useAdminAnalytics';
import { ANALYTICS_PRESETS, analyticsFilterError, analyticsInterval, analyticsMoney, analyticsPreset, analyticsValue } from '../utils/adminAnalytics';

const KPI = [
  ['gross_payments', 'Tổng thanh toán thành công', 'money', 'Gồm các giao dịch đã hoàn toàn phần.'],
  ['net_payments', 'Thanh toán thuần sau hoàn', 'money', 'Trừ hoàn toàn phần được ghi nhận ở Payment.'],
  ['platform_commission', 'Hoa hồng sàn', 'money', 'Tính theo thanh toán; chưa đối soát phí thực nhận.'],
  ['total_bookings', 'Tổng booking', 'count', 'Booking tạo trong kỳ, gồm mọi trạng thái.'],
  ['completed_bookings', 'Booking hoàn tất', 'count', 'Booking tạo trong kỳ hiện có trạng thái COMPLETED.'],
  ['cancellation_rate', 'Tỷ lệ hủy booking', 'percent', 'CANCELLED / tổng booking tạo trong kỳ.'],
  ['active_partners', 'Đối tác hoạt động', 'count', 'Hiện đủ điều kiện, có booking xác nhận/hoàn tất tạo trong kỳ.'],
];
const STATUS_LABELS = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền' };
const COLORS = ['#94a3b8', '#3b82f6', '#f43f5e', '#a78bfa', '#10b981'];
const control = 'rounded-8 border border-border bg-white px-3 py-2 text-sm min-w-0';
const compact = value => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function Growth({ metric, inverse = false }) {
  if (metric.growth_state === 'unavailable') return <span className="text-slate-500">Không đủ cơ sở so sánh</span>;
  if (metric.growth_state === 'new') return <span className="text-sky-700">Mới · kỳ trước bằng 0</span>;
  const delta = metric.growth_percent;
  const favorable = inverse ? delta < 0 : delta > 0;
  return <span className={delta === 0 ? 'text-slate-500' : favorable ? 'text-emerald-700' : 'text-rose-700'}>{delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : ''}{delta.toLocaleString('vi-VN')}% so với kỳ trước</span>;
}

function ChartCard({ title, note, empty, children, wide = false }) {
  return <article className={`min-w-0 rounded-xl border border-border bg-white p-4 sm:p-5 ${wide ? 'xl:col-span-2' : ''}`} aria-label={title}>
    <h3 className="font-heading font-700 text-base">{title}</h3>
    <p className="mt-1 mb-4 text-xs text-text-secondary">{note}</p>
    {empty ? <div className="flex h-64 items-center justify-center text-sm text-slate-500">Không có dữ liệu trong kỳ này.</div> : children}
  </article>;
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="max-w-64 rounded-lg border bg-white p-3 text-xs shadow-lg"><p className="mb-2 font-semibold">{label}</p>{payload.map(item => <p key={item.dataKey} className="py-0.5" style={{ color: item.color }}>{item.name}: {analyticsMoney(item.payload[`${item.dataKey}_exact`])}</p>)}</div>;
}

function MoneyTrend({ data, field, name, color }) {
  const points = data.map(row => ({ ...row, [field]: row[field] === null ? null : Number(row[field]), [`${field}_exact`]: row[field] }));
  return <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ left: 5, right: 12, top: 10 }} accessibilityLayer>
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
    <XAxis dataKey="bucket" minTickGap={36} tick={{ fontSize: 11 }} />
    <YAxis tickFormatter={compact} width={70} tick={{ fontSize: 11 }} />
    <Tooltip content={<MoneyTooltip />} filterNull={false} />
    <Legend wrapperStyle={{ fontSize: 12 }} />
    <Line type="monotone" name={name} dataKey={field} stroke={color} strokeWidth={2.5} dot={points.length <= 14} connectNulls={false} isAnimationActive={false} />
  </LineChart></ResponsiveContainer></div>;
}

export default function AdminBusinessOverview() {
  const [params, setParams] = useSearchParams();
  const initial = () => {
    const proposed = { from: params.get('analytics_from'), to: params.get('analytics_to') };
    const period = analyticsFilterError(proposed) ? analyticsPreset() : proposed;
    const interval = ['daily', 'monthly', 'yearly'].includes(params.get('analytics_interval')) ? params.get('analytics_interval') : analyticsInterval(period);
    return { ...period, interval: analyticsFilterError(period, interval) ? analyticsInterval(period) : interval };
  };
  const [query, setQuery] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [preset, setPreset] = useState(params.has('analytics_from') ? 'custom' : '30d');
  const [validation, setValidation] = useState('');
  const { report, loading, error, reload } = useAdminAnalytics(query);
  const apply = next => {
    const message = analyticsFilterError(next, next.interval);
    setValidation(message);
    if (message) return;
    if (JSON.stringify(next) === JSON.stringify(query)) reload();
    else setQuery({ ...next });
    const nextParams = new URLSearchParams(params);
    nextParams.set('analytics_from', next.from); nextParams.set('analytics_to', next.to); nextParams.set('analytics_interval', next.interval);
    setParams(nextParams, { replace: true });
  };
  const choosePreset = value => {
    setPreset(value); setValidation('');
    if (value === 'custom') return;
    const period = analyticsPreset(value);
    const next = { ...period, interval: analyticsInterval(period) };
    setDraft(next); apply(next);
  };
  const totalBookings = report?.summary.total_bookings.current || 0;
  const partners = report?.top_partners.map(row => ({ ...row, booking_value_exact: row.booking_value, booking_value: Number(row.booking_value) })) || [];
  return <section aria-label="Tổng quan hiệu quả kinh doanh" aria-busy={loading} data-admin-analytics className="space-y-5">
    <div><h2 className="font-heading font-700 text-xl text-text-primary">Hiệu quả kinh doanh & tăng trưởng</h2><p className="mt-1 text-sm text-text-secondary">Toàn nền tảng · VND · Giờ Việt Nam (UTC+07)</p></div>
    <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4" onSubmit={event => { event.preventDefault(); apply(draft); }}>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">Khoảng thời gian<select aria-label="Khoảng thời gian analytics" className={control} value={preset} onChange={event => choosePreset(event.target.value)}>{ANALYTICS_PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">Từ ngày<input className={control} aria-label="Analytics từ ngày" name="analytics_from" type="date" required value={draft.from} onChange={event => { setPreset('custom'); setDraft({ ...draft, from: event.target.value }); }} /></label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">Đến ngày<input className={control} aria-label="Analytics đến ngày" name="analytics_to" type="date" required value={draft.to} onChange={event => { setPreset('custom'); setDraft({ ...draft, to: event.target.value }); }} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Nhóm theo<select className={control} aria-label="Nhóm thời gian analytics" value={draft.interval} onChange={event => setDraft({ ...draft, interval: event.target.value })}><option value="daily">Ngày</option><option value="monthly">Tháng</option><option value="yearly">Năm</option></select></label>
      <button className="rounded-8 bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600">Áp dụng bộ lọc</button>
      <button type="button" className={`${control} hover:bg-slate-50`} onClick={reload} disabled={loading}>Làm mới số liệu</button>
    </form>
    {validation && <p role="alert" className="text-sm text-rose-700">{validation}</p>}
    {loading && <div role="status" className="space-y-3"><p className="text-sm text-slate-500">Đang tải dữ liệu kinh doanh...</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{KPI.map(([key]) => <div key={key} className="h-40 animate-pulse rounded-xl bg-slate-200" />)}</div></div>}
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Không tải được analytics: {error} <button type="button" className="ml-2 font-semibold underline" onClick={reload}>Thử lại</button></div>}
    {report && <>
      <p className="text-xs text-text-secondary" data-analytics-period>Kỳ hiện tại: {report.period.from} – {report.period.to} · Kỳ so sánh: {report.previous_period.from} – {report.previous_period.to} ({report.comparison_days} ngày mỗi kỳ).</p>
      {report.empty && <p role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Chưa có booking hoặc thanh toán trong khoảng ngày đã chọn.</p>}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map(([key, label, type, note]) => <div key={key} data-analytics-kpi={key} className="min-w-0 rounded-xl border border-border bg-white p-5">
          <dt className="text-sm font-medium text-text-secondary">{label}</dt>
          <dd className="mt-3 break-words font-heading text-2xl font-700 text-text-primary">{analyticsValue(report.summary[key].current, type)}</dd>
          <dd className="mt-2 text-xs"><Growth metric={report.summary[key]} inverse={key === 'cancellation_rate'} /></dd>
          <dd className="mt-1 break-words text-xs text-slate-500">Kỳ trước: {analyticsValue(report.summary[key].previous, type)}</dd>
          <dd className="mt-3 text-xs leading-relaxed text-slate-500">{note}</dd>
        </div>)}
      </dl>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Xu hướng giá trị thanh toán" note="Thanh toán thành công trước hoàn · theo ngày thanh toán gốc" empty={report.empty}><MoneyTrend data={report.trends} field="gross_payments" name="Thanh toán thành công" color="#3b82f6" /></ChartCard>
        <ChartCard title="Xu hướng hoa hồng sàn" note="Cùng quy tắc Revenue & Commission · khoảng trống biểu thị số chưa xác định" empty={report.empty}><MoneyTrend data={report.trends} field="platform_commission" name="Hoa hồng sàn" color="#10b981" /></ChartCard>
        <ChartCard title="Tăng trưởng booking" note="Số booking theo ngày tạo · gồm tất cả trạng thái" empty={totalBookings === 0}><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.trends} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucket" minTickGap={36} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={45} /><Tooltip /><Bar name="Booking" dataKey="bookings" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Phân bố trạng thái booking" note="Trạng thái hiện tại của booking tạo trong kỳ" empty={totalBookings === 0}><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={report.distribution.map(row => ({ ...row, name: STATUS_LABELS[row.status] || row.status }))} dataKey="count" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2} isAnimationActive={false}>{report.distribution.map((row, i) => <Cell key={row.status} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(value, name) => [`${value} booking (${(Number(value) / totalBookings * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%)`, name]} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Top 5 đối tác theo giá trị booking" note="Booking xác nhận/hoàn tất tạo trong kỳ · giá trị sau giảm giá, phân bổ theo dòng" empty={partners.length === 0} wide><div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={partners} layout="vertical" margin={{ left: 0, right: 20 }} accessibilityLayer><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} tickFormatter={name => name.length > 16 ? `${name.slice(0, 15)}…` : name} /><Tooltip content={<MoneyTooltip />} /><Bar name="Giá trị booking" dataKey="booking_value" fill="#0ea5e9" radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="mt-3 w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="py-2">Đối tác</th><th className="py-2 text-right">Booking</th><th className="py-2 text-right">Giá trị</th></tr></thead><tbody>{report.top_partners.map(row => <tr key={row.id} className="border-b last:border-0"><td className="max-w-48 break-words py-2 pr-3">{row.name}</td><td className="text-right">{row.bookings}</td><td className="whitespace-nowrap py-2 pl-3 text-right">{analyticsMoney(row.booking_value)}</td></tr>)}</tbody></table></div></ChartCard>
      </div>
      {report.quality.issues.length > 0 && <p role="status" className="break-words rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Cần kiểm tra dữ liệu: {report.quality.payment_issue_count} giao dịch trong hai kỳ, {report.quality.allocation_issue_count} booking phân bổ lỗi. Mã: {report.quality.issues.join(', ')}. Giá trị chưa xác định được giữ trống, không thay bằng 0.</p>}
      <details className="rounded-xl border border-border bg-white p-4 text-xs leading-relaxed text-slate-600"><summary className="cursor-pointer font-semibold">Cách tính & giới hạn dữ liệu</summary><div className="mt-3 space-y-2">{Object.entries(report.definitions).map(([key, value]) => <p key={key}>{value}</p>)}{report.limitations.map(value => <p key={value}>{value}</p>)}</div></details>
    </>}
  </section>;
}
