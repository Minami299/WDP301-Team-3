import { PAYOUT_STATUS, dateTime, downloadLinesCsv, periodLabel, shortDate, vnd } from "../utils/payoutUi";

export function PayoutStatusBadge({ status }) {
  const style = PAYOUT_STATUS[status];
  return <span className={`inline-block px-2 py-0.5 rounded-4 text-xs font-semibold ${style?.className || "bg-slate-100 text-slate-700"}`}>{style?.label || status}</span>;
}

const Row = ({ label, children }) => <><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words font-medium">{children}</dd></>;

// Shared by the partner and admin dialogs; `payout.lines` is empty for rejected requests because their orders were released.
export default function PayoutDetailView({ payout }) {
  const bank = payout.bank_account || {};
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[150px_1fr] gap-2 rounded-xl bg-slate-50 p-4">
        {payout.partner && <Row label="Đối tác">{payout.partner.full_name} · {payout.partner.email}</Row>}
        <Row label="Trạng thái"><PayoutStatusBadge status={payout.status} /></Row>
        <Row label="Kỳ quyết toán">{periodLabel(payout.period_start, payout.period_end)}</Row>
        <Row label="Gửi lúc">{dateTime(payout.created_at)}</Row>
        <Row label="Số đơn">{payout.line_count}</Row>
        <Row label="Doanh thu">{vnd(payout.gross_amount)}</Row>
        <Row label="Hoa hồng sàn">{vnd(payout.commission_amount)}</Row>
        <Row label="Thực nhận"><span className="font-bold text-primary-700">{vnd(payout.amount)}</span></Row>
        <Row label="Ngân hàng">{bank.bank_name}</Row>
        <Row label="Số tài khoản"><span className="font-mono">{bank.account_number}</span></Row>
        <Row label="Chủ tài khoản">{bank.account_name}</Row>
        {payout.note && <Row label="Ghi chú">{payout.note}</Row>}
        {payout.reviewed_by && <Row label="Người xử lý">{payout.reviewed_by} · {dateTime(payout.decided_at)}</Row>}
        {payout.status === "REJECTED" && <Row label="Lý do từ chối">{payout.decision_reason}</Row>}
        {payout.status === "PAID" && <><Row label="Mã giao dịch"><span className="font-mono">{payout.paid_reference}</span></Row><Row label="Chuyển lúc">{dateTime(payout.paid_at)}</Row></>}
      </dl>

      {payout.lines.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Các đơn trong yêu cầu</h3>
            <button type="button" onClick={() => downloadLinesCsv(payout)} className="rounded-8 border border-border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Xuất CSV</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-slate-500">
                  {["Mã đơn", "Dịch vụ", "Kết thúc", "Doanh thu", "Hoa hồng", "Thực nhận"].map((heading, index) => <th key={heading} className={`px-3 py-2 font-semibold ${index > 2 ? "text-right" : ""}`}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {payout.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono">{line.booking_code}</td>
                    <td className="px-3 py-2">{line.service_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{shortDate(line.end_date)}</td>
                    <td className="px-3 py-2 text-right">{vnd(line.gross)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{vnd(line.commission)} ({line.commission_rate}%)</td>
                    <td className="px-3 py-2 text-right font-semibold">{vnd(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : payout.status === "REJECTED" ? (
        <p className="text-slate-500">Các đơn của yêu cầu này đã được trả về số dư của đối tác để gửi lại.</p>
      ) : null}
    </div>
  );
}
