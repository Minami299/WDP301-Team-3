export const PAYOUT_STATUS = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-800 border border-amber-200" },
  APPROVED: { label: "Đã duyệt, chờ chuyển khoản", className: "bg-sky-50 text-sky-800 border border-sky-200" },
  PAID: { label: "Đã chi trả", className: "bg-success-100 text-emerald-800" },
  REJECTED: { label: "Từ chối", className: "bg-danger-100 text-red-800" },
};

export const vnd = (value) => `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} đ`;

export const shortDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");
export const dateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");

// A request with no start date covers everything up to its end date.
export const periodLabel = (start, end) => {
  const openStart = !start || new Date(start).getUTCFullYear() <= 1970;
  return openStart ? `Đến ${shortDate(end)}` : `${shortDate(start)} - ${shortDate(end)}`;
};

export const requestCode = (id) => String(id).slice(-8).toUpperCase();

const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const downloadLinesCsv = (payout) => {
  const rows = [
    ["Mã đơn", "Dịch vụ", "Ngày kết thúc", "Doanh thu", "Tỷ lệ hoa hồng (%)", "Hoa hồng", "Thực nhận"],
    ...payout.lines.map((line) => [line.booking_code, line.service_name, shortDate(line.end_date), line.gross, line.commission_rate, line.commission, line.amount]),
    ["Tổng", "", "", payout.gross_amount, "", payout.commission_amount, payout.amount],
  ];
  const csv = `﻿${rows.map((row) => row.map(quote).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `travelio-quyet-toan-${requestCode(payout.id)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
