const mongoose = require('mongoose');
const { Payment, User, Facility } = require('../models');
const { calculateBookingRevenue } = require('./revenueCalculation');
const createError = message => Object.assign(new Error(message), { statusCode: 400 });
const TIMEZONE = 'Asia/Ho_Chi_Minh';

const revenuePeriod = (query = {}, now = new Date()) => {
  const local = new Date(now.getTime() + 7 * 3600000).toISOString();
  const first = `${local.slice(0, 7)}-01`;
  const last = new Date(Date.UTC(Number(local.slice(0, 4)), Number(local.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const from = query.from === undefined ? first : query.from;
  const to = query.to === undefined ? last : query.to;
  for (const value of [from, to]) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000') || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw createError('Ngày báo cáo không hợp lệ (YYYY-MM-DD)');
  }
  if (from > to) throw createError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  return { from, to, start: new Date(`${from}T00:00:00+07:00`), end: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000), timezone: TIMEZONE };
};

// Shared ownership resolution for direct services and legacy inventory bookings.
const bookingDetailsLookup = () => ({ $lookup: {
    from: 'booking_details', let: { bookingId: '$_id' }, pipeline: [
      { $match: { $expr: { $eq: ['$booking_id', '$$bookingId'] } } },
      { $lookup: { from: 'service_inventory', localField: 'inventory_id', foreignField: '_id', as: 'inventory' } },
      { $lookup: { from: 'services', let: { serviceId: { $ifNull: ['$service_id', { $arrayElemAt: ['$inventory.service_id', 0] }] } }, pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$serviceId'] } } },
      ], as: 'service' } },
      { $lookup: { from: 'facilities', let: { facilityId: { $ifNull: ['$facility_id', { $arrayElemAt: ['$service.facility_id', 0] }] } }, pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$facilityId'] } } },
      ], as: 'facility' } },
      { $lookup: { from: 'users', localField: 'facility.vendor_id', foreignField: '_id', as: 'partner' } },
      { $project: { quantity: 1, unit_price: 1,
        resolved_vendor_id: { $arrayElemAt: ['$facility.vendor_id', 0] },
        partner_name: { $arrayElemAt: ['$partner.full_name', 0] },
        resolved_rate: { $ifNull: ['$commission_rate', { $arrayElemAt: ['$facility.commission_rate', 0] }] },
        rate_source: { $cond: [{ $ne: [{ $ifNull: ['$commission_rate', null] }, null] }, 'BOOKING_SNAPSHOT', 'FACILITY_CURRENT'] },
      } },
    ], as: 'details',
  } });

const revenuePipeline = ({ start, end }, vendorId) => [
  { $match: { status: { $in: ['SUCCESS', 'REFUNDED'] }, payment_date: { $gte: start, $lt: end } } },
  { $group: { _id: '$booking_id' } },
  { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'booking' } },
  { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
  // Fetch all history before filtering dates: a later receipt must not earn
  // commission again on value already attributed to an earlier receipt.
  { $lookup: { from: 'payments', localField: '_id', foreignField: 'booking_id', as: 'payments' } },
  bookingDetailsLookup(),
  ...(vendorId ? [{ $match: { 'details.resolved_vendor_id': new mongoose.Types.ObjectId(vendorId) } }] : []),
  { $project: { booking: { _id: 1, booking_code: 1, final_amount: 1, status: 1 }, payments: 1, details: 1 } },
];

const getRevenue = async (query = {}, { vendorId: enforcedVendorId, allRows = false } = {}) => {
  if (enforcedVendorId && query.vendor_id !== undefined && query.vendor_id !== String(enforcedVendorId)) throw Object.assign(new Error('Không được truy cập báo cáo của đối tác khác'), { statusCode: 403 });
  const vendorId = enforcedVendorId || query.vendor_id;
  if (vendorId !== undefined && (typeof vendorId !== 'string' || !/^[a-f\d]{24}$/i.test(vendorId))) throw createError('Mã đối tác không hợp lệ');
  const partner = vendorId ? await User.findById(vendorId).select('_id full_name').lean() : null;
  if (vendorId && !partner) throw Object.assign(new Error('Không tìm thấy đối tác'), { statusCode: 404 });
  const period = revenuePeriod(query);
  const integer = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw createError('Phân trang không hợp lệ');
    return Number(value);
  };
  const page = integer(query.page, 1, 10000), pageSize = integer(query.page_size, 20, 100);
  const totals = { gross_payments: 0n, refunds: 0n, net_revenue: 0n, platform_commission: 0n };
  const fields = { gross_payments: 'amount', refunds: 'refund_amount', net_revenue: 'net_revenue', platform_commission: 'platform_commission' };
  const rows = [];
  let total = 0, issueCount = 0;
  const issues = new Set();
  const cursor = Payment.aggregate(revenuePipeline(period, vendorId)).cursor({ batchSize: 100 });
  for await (const group of cursor) {
    if (group.payments.some(payment => ['SUCCESS', 'REFUNDED'].includes(payment.status) && new Date(payment.payment_date) < period.end && payment.currency != null && payment.currency !== 'VND')) throw Object.assign(new Error('Báo cáo chỉ hỗ trợ VND; phát hiện giao dịch khác đơn vị tiền tệ, chưa có quy tắc quy đổi'), { statusCode: 422 });
    const booking = group.booking || { _id: group._id };
    const calculated = calculateBookingRevenue(booking, group.payments, group.details, period);
    for (let row of calculated) {
      if (vendorId) {
        const own = row.partners.find(item => item.id === String(vendorId));
        if (!own) continue;
        row = { ...row, ...Object.fromEntries(['amount', 'refund_amount', 'net_revenue', 'platform_commission', 'commission_rates'].map(key => [key, own[key]])), partners: [own] };
      }
      total += 1;
      if (allRows && total > 50000) throw Object.assign(new Error('Báo cáo vượt 50.000 giao dịch. Vui lòng chọn khoảng thời gian ngắn hơn; chưa xuất file để tránh thiếu dữ liệu.'), { statusCode: 413 });
      if (row.issues.length) issueCount += 1;
      row.issues.forEach(issue => issues.add(issue));
      for (const [key, field] of Object.entries(fields)) {
        totals[key] = totals[key] === null || row[field] === null ? null : totals[key] + BigInt(row[field]);
      }
      rows.push(row);
    }
    // Keep only the requested page's prefix while still reconciling every row.
    if (!allRows) {
      rows.sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.payment_id.localeCompare(a.payment_id));
      rows.length = Math.min(rows.length, page * pageSize);
    }
  }
  if (allRows) rows.sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.payment_id.localeCompare(a.payment_id));
  const partnerOptions = enforcedVendorId ? [] : await User.find({ _id: { $in: await Facility.distinct('vendor_id') } }).select('_id full_name').sort({ full_name: 1 }).lean();
  return {
    period: { from: period.from, to: period.to, timezone: TIMEZONE, basis: 'PAYMENT_DATE_CURRENT_REFUND_STATUS' },
    currency: 'VND', totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value?.toString() ?? null])),
    partner: partner ? { id: String(partner._id), name: partner.full_name } : null,
    partner_options: partnerOptions.map(item => ({ id: String(item._id), name: item.full_name })),
    rows: allRows ? rows : rows.slice((page - 1) * pageSize), total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize),
    quality: { issue_count: issueCount, issues: [...issues] },
    limitations: [
      'Phạm vi đối tác được xác định từ cơ sở của từng dòng booking. Booking có nhiều đối tác được phân bổ theo giá trị dòng trước khi lọc; dòng chưa xác định sở hữu cần Admin kiểm tra, không tự gán cho đối tác.',
      'Hoàn tiền chỉ được suy ra toàn phần từ Payment.REFUNDED. Chưa có sổ hoàn tiền, số tiền hoàn từng phần hoặc ngày hoàn; lọc theo ngày thanh toán gốc và trạng thái hoàn hiện tại, không phải dòng tiền hoàn trong kỳ.',
      'Hoa hồng được tính trên giá trị thanh toán giữ lại, tối đa giá trị booking, theo quy tắc báo cáo Vendor hiện có. Chưa có sổ thu hoa hồng riêng hoặc chính sách giữ/hoàn hoa hồng khi hủy; chưa xác nhận số phí thực nhận qua đối soát.',
      'Chỉ lấy giao dịch SUCCESS/REFUNDED; loại giao dịch chờ, thất bại, hủy. Thanh toán thành công của booking đã hủy vẫn là tiền đã thu, cần đối soát và chưa xác định hoa hồng. Hủy booking không được tự coi là hoàn tiền thành công.',
    ],
  };
};

module.exports = { getRevenue, revenuePeriod, revenuePipeline, bookingDetailsLookup };
