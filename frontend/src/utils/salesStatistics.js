export function currentSalesPeriod(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { from: `${parts.year}-${parts.month}-01`, to: `${parts.year}-${parts.month}-${parts.day}` };
}

export function salesPeriodError({ from, to }) {
  for (const date of [from, to]) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000') || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc hợp lệ.';
    }
  }
  return from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : '';
}

export const salesMoney = value => `${Number(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ`;
