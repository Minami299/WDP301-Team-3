const { Booking, Payment, User } = require('../models');
const { PARTNER_ROLES } = require('../utils/accountStatus');
const { revenuePeriod, revenuePipeline, bookingDetailsLookup } = require('./revenue.service');
const { calculateBookingRevenue, allocateLines, money, round } = require('./revenueCalculation');

const DAY = 86400000;
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const BOOKING_STATUSES = Booking.schema.path('status').enumValues;
const MONEY_FIELDS = { gross_payments: 'amount', net_payments: 'net_revenue', platform_commission: 'platform_commission' };
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const localDate = date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);

function analyticsPeriod(query = {}, now = new Date()) {
  const today = localDate(now);
  const defaults = { from: localDate(new Date(now.getTime() - 29 * DAY)), to: today };
  const current = revenuePeriod({ ...defaults, ...query }, now);
  const days = Math.round((current.end - current.start) / DAY);
  if (days > 3660) throw invalid('Chọn khoảng thời gian không quá 10 năm.');
  const previousStart = new Date(current.start.getTime() - days * DAY);
  if (previousStart.getUTCFullYear() < 1) throw invalid('Khoảng ngày phải có kỳ so sánh hợp lệ.');
  const previous = { from: localDate(previousStart), to: localDate(new Date(current.start - DAY)), start: previousStart, end: current.start, timezone: TIMEZONE };
  const interval = query.interval ?? (days <= 90 ? 'daily' : days <= 730 ? 'monthly' : 'yearly');
  if (!['daily', 'monthly', 'yearly'].includes(interval)) throw invalid('Nhóm thời gian phải là daily, monthly hoặc yearly.');
  const buckets = bucketDates(current, interval);
  if (buckets.length > 400) throw invalid('Biểu đồ có quá 400 mốc. Hãy chọn nhóm theo tháng hoặc năm.');
  return { current, previous, interval, buckets, days };
}

function bucketKey(date, interval) {
  return localDate(new Date(date)).slice(0, interval === 'daily' ? 10 : interval === 'monthly' ? 7 : 4);
}

function bucketDates(period, interval) {
  const cursor = new Date(`${period.from}T00:00:00Z`);
  if (interval === 'monthly') cursor.setUTCDate(1);
  if (interval === 'yearly') { cursor.setUTCMonth(0, 1); }
  const keys = [];
  while (cursor.toISOString().slice(0, 10) <= period.to && keys.length <= 400) {
    keys.push(cursor.toISOString().slice(0, interval === 'daily' ? 10 : interval === 'monthly' ? 7 : 4));
    if (interval === 'daily') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (interval === 'monthly') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
  }
  return keys;
}

// Monetary inputs stay integer strings, including values above Number's safe range.
function comparison(current, previous, type = 'count') {
  if (current === null || previous === null) return { current, previous, growth_percent: null, growth_state: 'unavailable' };
  const scaled = value => type === 'percent' ? BigInt(Math.round(value * 100)) : BigInt(value);
  const a = scaled(current), b = scaled(previous);
  if (b === 0n) return { current, previous, growth_percent: a === 0n ? 0 : null, growth_state: a === 0n ? 'stable' : 'new' };
  const delta = a - b;
  const magnitude = round((delta < 0n ? -delta : delta) * 10000n, b);
  const percent = Number(magnitude) / 100 * (delta < 0n ? -1 : 1);
  return { current, previous, growth_percent: Number.isFinite(percent) ? percent : null, growth_state: delta === 0n ? 'stable' : delta > 0n ? 'up' : 'down' };
}

const emptyMoney = () => ({ gross_payments: 0n, net_payments: 0n, platform_commission: 0n });
const serializeMoney = totals => Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value?.toString() ?? null]));
const addMoney = (totals, row) => {
  for (const [key, field] of Object.entries(MONEY_FIELDS)) {
    totals[key] = totals[key] === null || row[field] === null ? null : totals[key] + BigInt(row[field]);
  }
};

async function getAnalytics(query = {}) {
  const { current, previous, interval, buckets, days } = analyticsPeriod(query);
  const combined = { start: previous.start, end: current.end };
  const cohort = { $cond: [{ $lt: ['$created_at', current.start] }, 'previous', 'current'] };
  const format = interval === 'daily' ? '%Y-%m-%d' : interval === 'monthly' ? '%Y-%m' : '%Y';
  const [counts, eligiblePartners] = await Promise.all([
    Booking.aggregate([
      { $match: { created_at: { $gte: combined.start, $lt: combined.end } } },
      { $facet: {
        statuses: [{ $group: { _id: { period: cohort, status: '$status' }, count: { $sum: 1 } } }],
        trends: [
          { $match: { created_at: { $gte: current.start } } },
          { $group: { _id: { $dateToString: { date: '$created_at', format, timezone: TIMEZONE } }, count: { $sum: 1 } } },
        ],
      } },
    ]),
    User.aggregate([
      { $match: { status: 'ACTIVE', approvalStatus: { $in: ['APPROVED', null] } } },
      { $lookup: { from: 'roles', localField: 'role_id', foreignField: '_id', as: 'role' } },
      { $match: { 'role.role_name': { $in: PARTNER_ROLES } } },
      { $project: { _id: 1 } },
    ]),
  ]);
  const statuses = { current: Object.fromEntries(BOOKING_STATUSES.map(status => [status, 0])), previous: Object.fromEntries(BOOKING_STATUSES.map(status => [status, 0])) };
  for (const row of counts[0]?.statuses || []) statuses[row._id.period][row._id.status] = row.count;
  const bookingTrend = new Map((counts[0]?.trends || []).map(row => [row._id, row.count]));
  const trend = new Map(buckets.map(bucket => [bucket, { bucket, ...emptyMoney(), bookings: bookingTrend.get(bucket) || 0 }]));
  const payments = { current: emptyMoney(), previous: emptyMoney() };
  const issues = new Set();
  let paymentIssueCount = 0, allocationIssueCount = 0, currentPaymentCount = 0;
  const paymentCursor = Payment.aggregate(revenuePipeline(combined)).cursor({ batchSize: 100 });
  for await (const group of paymentCursor) {
    if (group.payments.some(payment => ['SUCCESS', 'REFUNDED'].includes(payment.status) && new Date(payment.payment_date) < current.end && payment.currency != null && payment.currency !== 'VND')) {
      throw Object.assign(new Error('Báo cáo chỉ hỗ trợ VND; chưa có quy tắc quy đổi ngoại tệ.'), { statusCode: 422 });
    }
    // All payment history is resolved before splitting periods. This preserves
    // the commission cap across installments and removes retry transaction IDs.
    const rows = calculateBookingRevenue(group.booking || { _id: group._id }, group.payments, group.details, combined);
    for (const row of rows) {
      const period = new Date(row.payment_date) < current.start ? 'previous' : 'current';
      addMoney(payments[period], row);
      if (row.issues.length) paymentIssueCount++;
      row.issues.forEach(issue => issues.add(issue));
      if (period === 'current') {
        currentPaymentCount++;
        addMoney(trend.get(bucketKey(row.payment_date, interval)), row);
      }
    }
  }

  const eligible = new Set(eligiblePartners.map(partner => String(partner._id)));
  const active = { current: new Set(), previous: new Set() };
  const performance = new Map();
  const partnerCursor = Booking.aggregate([
    { $match: { created_at: { $gte: combined.start, $lt: combined.end }, status: { $in: ['CONFIRMED', 'COMPLETED'] } } },
    bookingDetailsLookup(),
    { $project: { final_amount: 1, created_at: 1, details: 1 } },
  ]).cursor({ batchSize: 100 });
  for await (const booking of partnerCursor) {
    const period = booking.created_at < current.start ? 'previous' : 'current';
    const details = [...booking.details].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const owners = new Set(details.filter(line => line.resolved_vendor_id).map(line => String(line.resolved_vendor_id)));
    owners.forEach(id => { if (eligible.has(id)) active[period].add(id); });
    if (period !== 'current') continue;
    try {
      if (!details.length) throw new Error('MISSING_BOOKING_DETAILS');
      const shares = allocateLines(details, money(booking.final_amount));
      const seen = new Set();
      details.forEach((line, i) => {
        if (!line.resolved_vendor_id) { issues.add('MISSING_PARTNER'); return; }
        const id = String(line.resolved_vendor_id);
        const partner = performance.get(id) || { id, name: line.partner_name || 'Đối tác không còn tồn tại', booking_value: 0n, bookings: 0 };
        partner.booking_value += shares[i];
        if (!seen.has(id)) { partner.bookings++; seen.add(id); }
        performance.set(id, partner);
      });
    } catch (error) { allocationIssueCount++; issues.add(error.message); }
  }
  const bookingTotal = period => Object.values(statuses[period]).reduce((sum, value) => sum + value, 0);
  const cancellationRate = period => bookingTotal(period) === 0 ? null : Number(round(BigInt(statuses[period].CANCELLED) * 10000n, BigInt(bookingTotal(period)))) / 100;
  const currentMoney = serializeMoney(payments.current), previousMoney = serializeMoney(payments.previous);
  const summary = Object.fromEntries(Object.keys(MONEY_FIELDS).map(key => [key, comparison(currentMoney[key], previousMoney[key], 'money')]));
  summary.total_bookings = comparison(bookingTotal('current'), bookingTotal('previous'));
  summary.completed_bookings = comparison(statuses.current.COMPLETED, statuses.previous.COMPLETED);
  summary.cancellation_rate = comparison(cancellationRate('current'), cancellationRate('previous'), 'percent');
  summary.active_partners = comparison(active.current.size, active.previous.size);
  const publicPeriod = period => ({ from: period.from, to: period.to, timezone: TIMEZONE });
  return {
    period: publicPeriod(current), previous_period: publicPeriod(previous), comparison_days: days, interval, currency: 'VND',
    summary,
    trends: [...trend.values()].map(row => ({ ...row, ...serializeMoney(Object.fromEntries(Object.keys(MONEY_FIELDS).map(key => [key, row[key]]))) })),
    distribution: Object.entries(statuses.current).map(([status, count]) => ({ status, count })),
    top_partners: [...performance.values()].sort((a, b) => a.booking_value === b.booking_value ? a.id.localeCompare(b.id) : a.booking_value > b.booking_value ? -1 : 1).slice(0, 5).map(partner => ({ ...partner, booking_value: partner.booking_value.toString() })),
    empty: bookingTotal('current') === 0 && currentPaymentCount === 0,
    quality: { payment_issue_count: paymentIssueCount, allocation_issue_count: allocationIssueCount, issues: [...issues] },
    definitions: {
      payments: 'Theo ngày thanh toán gốc; SUCCESS và REFUNDED, mỗi transaction_id tính một lần. Hoàn tiền chỉ lấy trạng thái Payment.REFUNDED; trạng thái booking/yêu cầu hoàn không chứng minh đã hoàn.',
      bookings: 'Theo ngày tạo booking; hoàn tất = COMPLETED; tỷ lệ hủy = CANCELLED / tổng booking. Trạng thái là trạng thái hiện tại của các booking tạo trong kỳ.',
      partners: 'Đối tác hoạt động: tài khoản đối tác hiện ACTIVE, đã duyệt (hoặc legacy đủ điều kiện), có booking CONFIRMED/COMPLETED tạo trong kỳ. Cùng điều kiện hiện tại được áp dụng cho cả hai kỳ; không phải ảnh chụp trạng thái lịch sử.',
      ranking: 'Top đối tác theo final_amount của booking CONFIRMED/COMPLETED tạo trong kỳ, phân bổ giảm giá theo giá trị từng dòng. Mỗi booking tính một lần cho mỗi đối tác; không phụ thuộc số lần thanh toán.',
      comparison: 'Kỳ so sánh liền trước, có cùng số ngày. Tăng trưởng = (kỳ hiện tại − kỳ trước) / kỳ trước × 100%. Kỳ trước bằng 0 và kỳ này dương: Mới; cả hai bằng 0: 0%.',
    },
    limitations: [
      'Payment.REFUNDED được diễn giải là hoàn toàn phần đã ghi nhận. Chưa có sổ hoàn tiền, ngày hoàn, hoàn từng phần hay bằng chứng đối soát ngân hàng; số thuần được điều chỉnh theo trạng thái hiện tại, không phải dòng tiền hoàn trong kỳ.',
      'Hoa hồng dùng cùng phép tính với Revenue & Commission, chưa phải doanh thu phí đã được đối soát. Thiếu dữ liệu hoặc có trạng thái không nhất quán thì hiển thị Chưa xác định.',
      'Quyền sở hữu đối tác/cơ sở và trạng thái booking được đọc ở thời điểm báo cáo; chưa có dữ liệu lịch sử để phục dựng các thay đổi này.',
    ],
  };
}

module.exports = { getAnalytics, analyticsPeriod, bucketKey, comparison };
