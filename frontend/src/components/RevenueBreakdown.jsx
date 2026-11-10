import { useState } from 'react';
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = value => value == null ? 'Chưa xác định' : `${BigInt(value).toLocaleString('vi-VN')} ₫`;
const fields = ['amount', 'refund_amount', 'net_revenue', 'platform_commission', 'partner_revenue'];
const button = 'rounded-8 border border-border bg-white px-3 py-2 text-sm disabled:opacity-40';

function ExactTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border bg-white p-3 text-xs shadow"><p className="font-semibold">{label}</p>{payload.map(item => <p key={item.dataKey} style={{ color: item.color }}>{item.name}: {money(item.payload[`${item.dataKey}_exact`])}</p>)}</div>;
}

function BreakdownTable({ title, rows, onSelect, selectedId }) {
  const [requestedPage, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const page = Math.min(requestedPage, pages);
  return <section className="rounded-8 border border-border bg-white p-4 space-y-3">
    <h3 className="font-heading font-700">{title}</h3>
    {rows.length === 0 ? <p className="text-sm text-text-secondary">Chưa có dữ liệu phân loại trong kỳ.</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr>{['Cơ sở / Loại phòng, dịch vụ', 'Chủ / Khách sạn', 'Booking', 'Thanh toán', 'Hoàn tiền', 'Sau hoàn', 'Hoa hồng sàn', 'Phần đối tác'].map(label => <th key={label} className="p-3 text-left whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody>{rows.slice((page - 1) * 10, page * 10).map(item => <tr key={item.id || 'unknown'} className="border-t align-top">
          <td className="p-3 min-w-48">{onSelect && item.id ? <button aria-label={`Xem doanh thu ${item.name}`} aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)} className="text-primary-600 font-semibold text-left underline">{item.name}</button> : <span className="font-semibold">{item.name}</span>}<p className="text-xs text-text-secondary break-all">{item.id || 'Thiếu mã cơ sở'} · {item.type || 'Chưa phân loại'}</p>{!item.payment_count && <p className="text-xs text-text-secondary">Chưa có giao dịch đủ điều kiện</p>}{item.issues?.length > 0 && <p className="text-xs text-amber-800">Có dữ liệu cần đối chiếu</p>}</td>
          <td className="p-3">{item.partner_name || item.facility_name || '—'}</td>
          <td className="p-3">{item.booking_count}</td>
          {fields.map(field => <td key={field} className="p-3 whitespace-nowrap">{money(item[field])}</td>)}
        </tr>)}</tbody>
      </table></div>
      <nav aria-label={`Phân trang ${title}`} className="flex justify-end items-center gap-3 text-sm"><button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>{page} / {pages}</span><button className={button} disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</button></nav>
    </>}
  </section>;
}

export default function RevenueBreakdown({ report, onSelect }) {
  const points = (report.timeline || []).map(item => ({ ...item,
    ...Object.fromEntries(['net_revenue', 'platform_commission'].flatMap(field => [[field, item[field] == null ? null : Number(item[field])], [`${field}_exact`, item[field]]])),
  }));
  return <div className="space-y-4">
    <section className="rounded-8 border border-border bg-white p-4" aria-label="Xu hướng doanh thu">
      <h3 className="font-heading font-700">Xu hướng {report.interval === 'monthly' ? 'theo tháng' : 'theo ngày'}</h3>
      <p className="text-xs text-text-secondary mt-1 mb-4">Cùng bộ lọc với bảng và file xuất · {report.booking_count} booking duy nhất có thanh toán · VND.</p>
      {report.total === 0 ? <p className="text-sm text-text-secondary py-8">Chưa có giao dịch trong kỳ.</p> : <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucket" minTickGap={30} tick={{ fontSize: 11 }} /><YAxis width={80} tick={{ fontSize: 11 }} tickFormatter={value => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value)} />
        <Tooltip content={<ExactTooltip />} filterNull={false} /><Legend wrapperStyle={{ fontSize: 12 }} />
        <Line dataKey="net_revenue" name="Doanh thu sau hoàn" stroke="#2563eb" dot={false} connectNulls={false} isAnimationActive={false} />
        <Line dataKey="platform_commission" name="Hoa hồng sàn" stroke="#10b981" dot={false} connectNulls={false} isAnimationActive={false} />
      </LineChart></ResponsiveContainer></div>}
    </section>
    <BreakdownTable title={report.filters?.facility_type === 'HOTEL' ? 'Doanh thu theo từng khách sạn' : 'Doanh thu theo từng cơ sở'} rows={report.facilities || []} onSelect={onSelect} selectedId={report.filters?.facility_id} />
    <BreakdownTable title="Phân loại phòng / dịch vụ đã thanh toán" rows={report.services || []} />
    <p className="text-xs text-text-secondary">Phần đối tác = doanh thu sau hoàn − hoa hồng sàn; chưa phản ánh tiền đã chi trả. Booking gồm nhiều cơ sở có thể xuất hiện ở nhiều nhóm.</p>
  </div>;
}
