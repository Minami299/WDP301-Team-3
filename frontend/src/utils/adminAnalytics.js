import { currentSalesPeriod, salesPeriodError } from './salesStatistics.js';

const DAY = 86400000;
export const ANALYTICS_PRESETS = [
  ['7d', '7 ngày qua'], ['30d', '30 ngày qua'], ['6m', '6 tháng qua'], ['12m', '12 tháng qua'], ['custom', 'Tùy chọn'],
];

export function analyticsPreset(preset = '30d', now = new Date()) {
  const to = currentSalesPeriod(now).to;
  const end = new Date(`${to}T00:00:00Z`);
  let start;
  if (preset === '7d' || preset === '30d') start = new Date(end.getTime() - (preset === '7d' ? 6 : 29) * DAY);
  else {
    const months = preset === '6m' ? 6 : 12;
    start = new Date(end);
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - months);
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(end.getUTCDate(), lastDay));
    start = new Date(start.getTime() + DAY);
  }
  return { from: start.toISOString().slice(0, 10), to };
}

export function analyticsInterval(period) {
  const days = (new Date(period.to) - new Date(period.from)) / DAY + 1;
  return days <= 90 ? 'daily' : days <= 730 ? 'monthly' : 'yearly';
}

export function analyticsFilterError(period, interval) {
  const error = salesPeriodError(period);
  if (error) return error;
  const days = (new Date(period.to) - new Date(period.from)) / DAY + 1;
  if (days > 3660) return 'Chọn khoảng thời gian không quá 10 năm.';
  if (interval === 'daily' && days > 400) return 'Chọn nhóm theo tháng hoặc năm cho khoảng ngày này.';
  return '';
}

export const analyticsMoney = value => value == null ? 'Chưa xác định' : `${BigInt(value).toLocaleString('vi-VN')} ₫`;
export function analyticsValue(value, type = 'count') {
  if (value == null) return 'Chưa xác định';
  return type === 'money' ? analyticsMoney(value) : `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${type === 'percent' ? '%' : ''}`;
}
