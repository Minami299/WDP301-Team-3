const mongoose = require('mongoose');
const { Payment, User, Facility } = require('../models');
const { calculateBookingRevenue } = require('./revenueCalculation');
const { scopeRow, createBreakdown } = require('./revenueBreakdown');
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
        resolved_facility_id: { $ifNull: ['$facility_id', { $arrayElemAt: ['$service.facility_id', 0] }] },
        facility_name: { $arrayElemAt: ['$facility.name', 0] },
        facility_type: { $arrayElemAt: ['$facility.type', 0] },
        resolved_service_id: { $arrayElemAt: ['$service._id', 0] },
        service_name: { $arrayElemAt: ['$service.name', 0] },
        service_type: { $arrayElemAt: ['$service.type', 0] },
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
  const facilityId = query.facility_id;
  if (facilityId !== undefined && (typeof facilityId !== 'string' || !/^[a-f\d]{24}$/i.test(facilityId))) throw createError('Mã cơ sở không hợp lệ');
  if (query.facility_type !== undefined && !['HOTEL', 'ATTRACTION'].includes(query.facility_type)) throw createError('Loại cơ sở không hợp lệ');
  if (query.status !== undefined && !['SUCCESS', 'REFUNDED'].includes(query.status)) throw createError('Trạng thái giao dịch không hợp lệ');
  if (facilityId) {
    const facility = await Facility.findById(facilityId).select('vendor_id type').lean();
    if (!facility) throw Object.assign(new Error('Không tìm thấy cơ sở'), { statusCode: 404 });
    if (vendorId && String(facility.vendor_id) !== String(vendorId)) throw Object.assign(new Error('Không được xem cơ sở của đối tác khác'), { statusCode: 403 });
    if (query.facility_type && query.facility_type !== facility.type) throw createError('Cơ sở không thuộc loại đã chọn');
  }
  const facilityFilter = { ...(vendorId ? { vendor_id: vendorId } : {}), ...(query.facility_type ? { type: query.facility_type } : {}) };
  const facilities = await Facility.find(facilityFilter).select('_id name type vendor_id').populate('vendor_id', 'full_name').sort({ name: 1 }).lean();
  const period = revenuePeriod(query);
  if ((period.end - period.start) / 86400000 > 3660) throw createError('Chọn khoảng thời gian không quá 10 năm');
  const interval = query.interval ?? ((period.end - period.start) / 86400000 <= 90 ? 'daily' : 'monthly');
  if (!['daily', 'monthly'].includes(interval)) throw createError('Nhóm thời gian phải là daily hoặc monthly');
  const breakdown = createBreakdown(facilities.filter(item => !facilityId || String(item._id) === facilityId), period, interval);
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
      // Apply status only AFTER calculating the complete payment history.
      if (query.status && row.status !== query.status) continue;
      if (vendorId || facilityId || query.facility_type) row = scopeRow(row, line =>
        (!vendorId || line.vendor_id === String(vendorId)) && (!facilityId || line.facility_id === facilityId) && (!query.facility_type || line.facility_type === query.facility_type));
      if (!row) continue;
      breakdown.add(row);
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
  const partnerOptions = enforcedVendorId ? [] : await User.find({ _id: { $in: await Facility.distinct('vendor_id', query.facility_type ? { type: query.facility_type } : {}) } }).select('_id full_name').sort({ full_name: 1 }).lean();
  return {
    period: { from: period.from, to: period.to, timezone: TIMEZONE, basis: 'PAYMENT_DATE_CURRENT_REFUND_STATUS' },
    currency: 'VND', totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value?.toString() ?? null])),
    partner_revenue: totals.net_revenue === null || totals.platform_commission === null ? null : (totals.net_revenue - totals.platform_commission).toString(),
    filters: { facility_id: facilityId || null, facility_type: query.facility_type || null, status: query.status || null, interval },
    facility_options: facilities.map(item => ({ id: String(item._id), name: item.name, type: item.type, vendor_id: item.vendor_id?._id ? String(item.vendor_id._id) : null })),
    ...breakdown.result(),
    partner: partner ? { id: String(partner._id), name: partner.full_name } : null,
    partner_options: partnerOptions.map(item => ({ id: String(item._id), name: item.full_name })),
    rows: allRows ? rows : rows.slice((page - 1) * pageSize), total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize),
    quality: { issue_count: issueCount, issues: [...issues] },
    limitations: [
      'Phạm vi đối tác/khách sạn được xác định từ từng dòng booking. Phân bổ toàn bộ booking trước khi lọc khách sạn hoặc đối tác. Nhóm chưa xác định cơ sở được hiển thị riêng để Manager đối chiếu.',
      'Sau hoàn = tiền thanh toán − tiền hoàn; phần đối tác = sau hoàn − hoa hồng sàn. Đây là doanh thu tính toán, không phải tiền đã chi trả. Xem thanh toán thực tế ở mục Đối soát. Số booking là booking duy nhất có thanh toán đủ điều kiện trong kỳ; booking nhiều cơ sở có thể xuất hiện ở nhiều nhóm.',
      'Hoàn tiền chỉ được suy ra toàn phần từ Payment.REFUNDED. Chưa có sổ hoàn tiền, số tiền hoàn từng phần hoặc ngày hoàn; lọc theo ngày thanh toán gốc và trạng thái hoàn hiện tại, không phải dòng tiền hoàn trong kỳ.',
      'Hoa hồng được tính trên giá trị thanh toán giữ lại, tối đa giá trị booking, theo quy tắc báo cáo Vendor hiện có. Chưa có sổ thu hoa hồng riêng hoặc chính sách giữ/hoàn hoa hồng khi hủy; chưa xác nhận số phí thực nhận qua đối soát.',
      'Chỉ lấy giao dịch SUCCESS/REFUNDED; loại giao dịch chờ, thất bại, hủy. Thanh toán thành công của booking đã hủy vẫn là tiền đã thu, cần đối soát và chưa xác định hoa hồng. Hủy booking không được tự coi là hoàn tiền thành công.',
    ],
  };
};

module.exports = { getRevenue, revenuePeriod, revenuePipeline, bookingDetailsLookup };
