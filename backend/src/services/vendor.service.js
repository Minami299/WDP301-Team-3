const mongoose = require('mongoose');
const {
  BookingDetail,
  Payout,
  PayoutDetail,
  QrScanLog
} = require('../models');
const { ROLES } = require('../middlewares/authMiddleware');

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

const parsePeriod = (from, to) => {
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to ? new Date(to) : now;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) end.setHours(23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw createError('Invalid reporting period', 400);
  }
  return { start, end };
};

const getVendorScope = async (user, requestedVendorId) => {
  if (MANAGEMENT_ROLES.includes(user.role)) {
    if (requestedVendorId && !mongoose.isValidObjectId(requestedVendorId)) {
      throw createError('Invalid vendor_id', 400);
    }
    return requestedVendorId ? new mongoose.Types.ObjectId(requestedVendorId) : null;
  }
  if (![ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR].includes(user.role)) {
    throw createError('Vendor access required', 403);
  }
  return new mongoose.Types.ObjectId(user.id);
};

const salesPipeline = ({ vendorId, start, end, completedOnly = false }) => {
  const bookingStatuses = completedOnly ? ['COMPLETED'] : ['CONFIRMED', 'COMPLETED'];
  return [
    { $lookup: { from: 'service_inventory', localField: 'inventory_id', foreignField: '_id', as: 'inventory' } },
    { $unwind: '$inventory' },
    { $lookup: { from: 'services', localField: 'inventory.service_id', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    { $lookup: { from: 'facilities', localField: 'service.facility_id', foreignField: '_id', as: 'facility' } },
    { $unwind: '$facility' },
    ...(vendorId ? [{ $match: { 'facility.vendor_id': vendorId } }] : []),
    { $lookup: { from: 'bookings', localField: 'booking_id', foreignField: '_id', as: 'booking' } },
    { $unwind: '$booking' },
    { $match: { 'booking.status': { $in: bookingStatuses } } },
    {
      $lookup: {
        from: 'payments',
        let: { bookingId: '$booking._id' },
        pipeline: [
          {
            $match: {
              status: 'SUCCESS',
              payment_date: { $gte: start, $lte: end },
              $expr: { $eq: ['$booking_id', '$$bookingId'] }
            }
          },
          { $project: { amount: 1, payment_date: 1 } }
        ],
        as: 'payments'
      }
    },
    { $match: { 'payments.0': { $exists: true } } },
    {
      $lookup: {
        from: 'booking_details',
        let: { bookingId: '$booking._id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$booking_id', '$$bookingId'] } } },
          { $addFields: { lineGross: { $multiply: [{ $ifNull: ['$quantity', 1] }, { $ifNull: ['$unit_price', 0] }] } } },
          { $group: { _id: null, gross: { $sum: '$lineGross' } } }
        ],
        as: 'bookingTotals'
      }
    },
    { $unwind: '$bookingTotals' },
    {
      $addFields: {
        lineGross: { $multiply: [{ $ifNull: ['$quantity', 1] }, { $ifNull: ['$unit_price', 0] }] },
        paymentTotal: { $sum: '$payments.amount' },
        latestPaymentDate: { $max: '$payments.payment_date' }
      }
    },
    {
      $addFields: {
        allocatedRevenue: {
          $multiply: [
            { $min: ['$paymentTotal', { $ifNull: ['$booking.final_amount', '$paymentTotal'] }] },
            { $divide: ['$lineGross', '$bookingTotals.gross'] }
          ]
        }
      }
    },
    {
      $addFields: {
        commissionRate: { $ifNull: ['$commission_rate', '$facility.commission_rate'] },
        platformCommission: {
          $multiply: ['$allocatedRevenue', { $divide: [{ $ifNull: ['$commission_rate', '$facility.commission_rate'] }, 100] }]
        }
      }
    },
    {
      $project: {
        _id: 1,
        booking_id: '$booking._id',
        booking_code: '$booking.booking_code',
        guest_name: '$booking.guest_name',
        booking_status: '$booking.status',
        service_type: '$service.type',
        service_name: '$service.name',
        facility_id: '$facility._id',
        facility_name: '$facility.name',
        quantity: { $ifNull: ['$quantity', 1] },
        allocatedRevenue: 1,
        platformCommission: 1,
        vendorNet: { $subtract: ['$allocatedRevenue', '$platformCommission'] },
        paymentDate: '$latestPaymentDate'
      }
    }
  ];
};

const getDashboard = async (user, query) => {
  const { start, end } = parsePeriod(query.from, query.to);
  const vendorId = await getVendorScope(user, query.vendor_id);
  const rows = await BookingDetail.aggregate(salesPipeline({ vendorId, start, end }));

  const report = {
    period: { from: start, to: end },
    total_revenue: 0,
    platform_commission: 0,
    vendor_net: 0,
    room_revenue: 0,
    ticket_revenue: 0,
    rooms_sold: 0,
    tickets_sold: 0,
    facilities: {},
    monthly: {}
  };

  for (const row of rows) {
    const revenue = Number(row.allocatedRevenue || 0);
    const commission = Number(row.platformCommission || 0);
    report.total_revenue += revenue;
    report.platform_commission += commission;
    report.vendor_net += Number(row.vendorNet || 0);
    if (row.service_type === 'ROOM') {
      report.room_revenue += revenue;
      report.rooms_sold += row.quantity;
    }
    if (row.service_type === 'TICKET') {
      report.ticket_revenue += revenue;
      report.tickets_sold += row.quantity;
    }

    const facility = report.facilities[row.facility_id] || {
      facility_id: row.facility_id,
      name: row.facility_name,
      revenue: 0,
      room_revenue: 0,
      rooms_sold: 0,
      commission: 0,
      vendor_net: 0,
      tickets_sold: 0
    };
    facility.revenue += revenue;
    facility.commission += commission;
    facility.vendor_net += Number(row.vendorNet || 0);
    if (row.service_type === 'ROOM') {
      facility.room_revenue += revenue;
      facility.rooms_sold += row.quantity;
    }
    if (row.service_type === 'TICKET') facility.tickets_sold += row.quantity;
    report.facilities[row.facility_id] = facility;

    const monthKey = new Date(row.paymentDate).toISOString().slice(0, 7);
    const month = report.monthly[monthKey] || { month: monthKey, revenue: 0, commission: 0, tickets_sold: 0 };
    month.revenue += revenue;
    month.commission += commission;
    if (row.service_type === 'TICKET') month.tickets_sold += row.quantity;
    report.monthly[monthKey] = month;
  }

  report.recent_sales = [...rows]
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    .slice(0, 10)
    .map((row) => ({
      booking_id: row.booking_id,
      booking_code: row.booking_code,
      guest_name: row.guest_name,
      facility_name: row.facility_name,
      service_name: row.service_name,
      service_type: row.service_type,
      quantity: row.quantity,
      revenue: Number(row.allocatedRevenue || 0),
      status: row.booking_status,
      payment_date: row.paymentDate
    }));

  const scanFilter = { scanned_at: { $gte: start, $lte: end } };
  if (vendorId) scanFilter.vendor_id = vendorId;
  const scans = await QrScanLog.aggregate([
    { $match: scanFilter },
    { $group: { _id: '$result', count: { $sum: 1 } } }
  ]);
  report.qr_scans = {
    total: scans.reduce((sum, item) => sum + item.count, 0),
    valid: scans.find((item) => item._id === 'VALID')?.count || 0,
    already_redeemed: scans.find((item) => item._id === 'ALREADY_REDEEMED')?.count || 0,
    invalid: scans.filter((item) => ['INVALID', 'NOT_YOURS'].includes(item._id)).reduce((sum, item) => sum + item.count, 0)
  };
  report.facilities = Object.values(report.facilities);
  report.monthly = Object.values(report.monthly).sort((a, b) => a.month.localeCompare(b.month));
  return report;
};

const verifyQr = async (user, rawCode) => {
  const qrCode = String(rawCode || '').trim();
  if (!qrCode) throw createError('qr_code is required', 400);

  const detail = await BookingDetail.findOne({ qr_code: qrCode })
    .populate('booking_id', 'booking_code guest_name guest_email status')
    .populate({ path: 'inventory_id', populate: { path: 'service_id', populate: { path: 'facility_id', select: 'name vendor_id' } } });
  const facility = detail?.inventory_id?.service_id?.facility_id;
  const scopeId = await getVendorScope(user);
  let result = 'INVALID';

  if (detail && facility) {
    if (scopeId && String(facility.vendor_id) !== String(scopeId)) {
      result = 'NOT_YOURS';
    } else if (detail.check_in_status === 'CHECKED_IN') {
      result = 'ALREADY_REDEEMED';
    } else if (detail.check_in_status !== 'PENDING' || !['CONFIRMED', 'COMPLETED'].includes(detail.booking_id?.status)) {
      result = 'INVALID';
    } else {
      const updated = await BookingDetail.updateOne(
        { _id: detail._id, check_in_status: 'PENDING' },
        { $set: { check_in_status: 'CHECKED_IN' } }
      );
      result = updated.modifiedCount === 1 ? 'VALID' : 'ALREADY_REDEEMED';
    }
  }

  const logVendorId = facility?.vendor_id || user.id;
  await QrScanLog.create({
    vendor_id: logVendorId,
    facility_id: facility?._id || null,
    booking_detail_id: detail?._id || null,
    scanned_by: user.id,
    qr_code: qrCode,
    result
  });

  return {
    result,
    booking_code: detail?.booking_id?.booking_code || null,
    guest_name: detail?.booking_id?.guest_name || null,
    service_name: detail?.inventory_id?.service_id?.name || null,
    facility_name: facility?.name || null
  };
};

const getQrScans = async (user, query) => {
  const { start, end } = parsePeriod(query.from, query.to);
  const vendorId = await getVendorScope(user, query.vendor_id);
  const filter = { scanned_at: { $gte: start, $lte: end } };
  if (vendorId) filter.vendor_id = vendorId;
  const [logs, counts] = await Promise.all([
    QrScanLog.find(filter)
      .populate('facility_id', 'name')
      .populate('scanned_by', 'full_name')
      .populate({ path: 'booking_detail_id', populate: { path: 'booking_id', select: 'booking_code guest_name' } })
      .sort({ scanned_at: -1 })
      .limit(100),
    QrScanLog.aggregate([
      { $match: filter },
      { $group: { _id: '$result', count: { $sum: 1 } } }
    ])
  ]);
  const stats = {
    total: counts.reduce((sum, item) => sum + item.count, 0),
    valid: counts.find((item) => item._id === 'VALID')?.count || 0,
    already_redeemed: counts.find((item) => item._id === 'ALREADY_REDEEMED')?.count || 0,
    invalid: counts.filter((item) => ['INVALID', 'NOT_YOURS'].includes(item._id)).reduce((sum, item) => sum + item.count, 0)
  };
  return { period: { from: start, to: end }, stats, data: logs };
};

const getSettlements = async (user, query) => {
  const { start, end } = parsePeriod(query.from, query.to);
  const vendorId = await getVendorScope(user, query.vendor_id);
  const filter = vendorId ? { vendor_id: vendorId } : {};
  const history = await Payout.find(filter).populate('manager_id', 'full_name').sort({ created_at: -1 }).limit(100);
  const eligibleLines = await BookingDetail.aggregate(salesPipeline({ vendorId, start, end, completedOnly: true }));
  const detailIds = eligibleLines.map((line) => line._id);
  const claimed = detailIds.length
    ? await PayoutDetail.find({ booking_detail_id: { $in: detailIds } }).distinct('booking_detail_id')
    : [];
  const claimedSet = new Set(claimed.map(String));
  const availableAmount = eligibleLines.reduce((sum, line) => (
    claimedSet.has(String(line._id)) ? sum : sum + Number(line.vendorNet || 0)
  ), 0);
  return {
    period: { from: start, to: end },
    available_amount: availableAmount,
    history
  };
};

const createSettlement = async (user, { vendor_id, period_start, period_end }) => {
  const vendorId = await getVendorScope(user, vendor_id);
  if (!vendorId) throw createError('vendor_id is required for management users', 400);
  const { start, end } = parsePeriod(period_start, period_end);

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const eligibleLines = await BookingDetail.aggregate(
        salesPipeline({ vendorId, start, end, completedOnly: true })
      ).session(session);
      const detailIds = eligibleLines.map((line) => line._id);
      if (!detailIds.length) throw createError('No completed, paid sales are eligible for settlement', 409);

      const claimed = await PayoutDetail.find({ booking_detail_id: { $in: detailIds } })
        .select('booking_detail_id')
        .session(session);
      const claimedSet = new Set(claimed.map((detail) => String(detail.booking_detail_id)));
      const availableLines = eligibleLines.filter((line) => !claimedSet.has(String(line._id)));
      if (!availableLines.length) throw createError('These sales have already been included in a settlement', 409);

      const amount = availableLines.reduce((sum, line) => sum + Number(line.vendorNet || 0), 0);
      const [payout] = await Payout.create([{
        vendor_id: vendorId,
        amount,
        status: 'PENDING',
        period_start: start,
        period_end: end
      }], { session });
      await PayoutDetail.insertMany(availableLines.map((line) => ({
        payout_id: payout._id,
        booking_detail_id: line._id,
        amount: Number(line.vendorNet || 0)
      })), { session });
      created = payout;
    });
  } catch (error) {
    if (error.code === 11000) throw createError('A sale is already reserved by another settlement request', 409);
    throw error;
  } finally {
    await session.endSession();
  }
  return created;
};

const decideSettlement = async (managerId, payoutId, status) => {
  if (!mongoose.isValidObjectId(payoutId)) throw createError('Invalid settlement id', 400);
  if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) throw createError('Invalid settlement status', 400);

  const session = await mongoose.startSession();
  let payout;
  try {
    await session.withTransaction(async () => {
      const current = await Payout.findById(payoutId).session(session);
      if (!current) throw createError('Settlement not found', 404);
      const allowed = status === 'PAID' ? current.status === 'APPROVED' : current.status === 'PENDING';
      if (!allowed) throw createError(`Cannot change settlement from ${current.status} to ${status}`, 409);

      current.status = status;
      current.manager_id = managerId;
      await current.save({ session });
      if (status === 'REJECTED') {
        await PayoutDetail.deleteMany({ payout_id: current._id }, { session });
      }
      payout = current;
    });
  } finally {
    await session.endSession();
  }
  return payout;
};

module.exports = { getDashboard, verifyQr, getQrScans, getSettlements, createSettlement, decideSettlement };