const mongoose = require('mongoose');
const { BookingDetail, Payout, PayoutDetail, User } = require('../models');
const { ROLES } = require('../middlewares/authMiddleware');
const { salesPipeline, parsePeriod } = require('./vendor.service');
const { getSettlementSettings } = require('./settlementSettings');
const { sendPayoutEmail } = require('./email.service');

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const PARTNER_ROLES = [ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];
const STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
const MAX_PAGE_SIZE = 50;

const assertPartner = (user) => {
  if (!PARTNER_ROLES.includes(user.role)) throw createError('Partner access required', 403);
  return new mongoose.Types.ObjectId(user.id);
};

const assertObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw createError('Mã yêu cầu không hợp lệ', 400);
};

const text = (value, label, { min = 0, max }) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length < min || trimmed.length > max) {
    throw createError(`${label} phải từ ${min} đến ${max} ký tự`, 400);
  }
  return trimmed;
};

const cleanBankAccount = (input = {}) => {
  const accountNumber = String(input.account_number || '').replace(/\s/g, '');
  if (!/^\d{6,20}$/.test(accountNumber)) throw createError('Số tài khoản phải gồm 6 đến 20 chữ số', 400);
  return {
    bank_name: text(input.bank_name, 'Tên ngân hàng', { min: 2, max: 100 }),
    account_number: accountNumber,
    account_name: text(input.account_name, 'Tên chủ tài khoản', { min: 2, max: 100 }),
  };
};

const money = (value) => Math.round(Number(value) || 0);

// One snapshot per sale line: amounts are rounded here so the totals always equal the sum of the lines.
const toLine = (row) => {
  const gross = money(row.allocatedRevenue);
  const commission = money(row.platformCommission);
  return {
    booking_detail_id: row._id,
    gross,
    commission,
    amount: gross - commission,
    commission_rate: Number(row.commissionRate) || 0,
    booking_code: row.booking_code,
    service_name: row.service_name,
    end_date: row.end_date || null,
  };
};

const sum = (lines, key) => lines.reduce((total, line) => total + line[key], 0);

const eligibleLines = async (vendorId, start, end, session) => {
  const { commission_rate: defaultRate } = await getSettlementSettings();
  const query = BookingDetail.aggregate(salesPipeline({ vendorId, start, end, completedOnly: true, defaultRate }));
  const rows = await (session ? query.session(session) : query);
  const claimedQuery = PayoutDetail.find({ booking_detail_id: { $in: rows.map((row) => row._id) } }).select('booking_detail_id');
  const claimed = new Set((await (session ? claimedQuery.session(session) : claimedQuery)).map((d) => String(d.booking_detail_id)));
  return rows.filter((row) => !claimed.has(String(row._id))).map(toLine);
};

const publicPayout = (payout) => ({
  id: payout._id,
  status: payout.status,
  amount: payout.amount,
  gross_amount: payout.gross_amount,
  commission_amount: payout.commission_amount,
  line_count: payout.line_count,
  period_start: payout.period_start,
  period_end: payout.period_end,
  bank_account: payout.bank_account,
  note: payout.note,
  decision_reason: payout.decision_reason,
  decided_at: payout.decided_at,
  paid_reference: payout.paid_reference,
  paid_at: payout.paid_at,
  created_at: payout.created_at,
});

const linesOf = async (payoutId) => (await PayoutDetail.find({ payout_id: payoutId }).sort({ end_date: 1 }).lean()).map((line) => ({
  id: line._id,
  booking_code: line.booking_code,
  service_name: line.service_name,
  end_date: line.end_date,
  gross: line.gross,
  commission_rate: line.commission_rate,
  commission: line.commission,
  amount: line.amount,
}));

// Partner side

const getPartnerOverview = async (user, query) => {
  const vendorId = assertPartner(user);
  const { start, end } = parsePeriod(query.from, query.to);
  const [settings, lines, history] = await Promise.all([
    getSettlementSettings(),
    eligibleLines(vendorId, start, end),
    Payout.find({ vendor_id: vendorId }).sort({ created_at: -1 }).limit(100),
  ]);
  const open = history.filter((payout) => ['PENDING', 'APPROVED'].includes(payout.status));
  return {
    period: { from: start, to: end },
    rules: { commission_rate: settings.commission_rate, hold_days: settings.hold_days },
    available: { amount: sum(lines, 'amount'), gross: sum(lines, 'gross'), commission: sum(lines, 'commission'), line_count: lines.length },
    in_review_amount: open.reduce((total, payout) => total + payout.amount, 0),
    paid_amount: history.filter((payout) => payout.status === 'PAID').reduce((total, payout) => total + payout.amount, 0),
    last_bank_account: history.find((payout) => payout.bank_account?.account_number)?.bank_account || null,
    history: history.map(publicPayout),
  };
};

const createPayoutRequest = async (user, body = {}) => {
  const vendorId = assertPartner(user);
  const { start, end } = parsePeriod(body.period_start, body.period_end);
  const bankAccount = cleanBankAccount(body.bank_account);
  const note = body.note ? text(body.note, 'Ghi chú', { max: 500 }) : null;

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const lines = await eligibleLines(vendorId, start, end, session);
      if (!lines.length) throw createError('Không có đơn nào đủ điều kiện quyết toán trong kỳ này', 409);
      const [payout] = await Payout.create([{
        vendor_id: vendorId,
        status: 'PENDING',
        period_start: start,
        period_end: end,
        bank_account: bankAccount,
        note,
        amount: sum(lines, 'amount'),
        gross_amount: sum(lines, 'gross'),
        commission_amount: sum(lines, 'commission'),
        line_count: lines.length,
      }], { session });
      await PayoutDetail.insertMany(lines.map((line) => ({ ...line, payout_id: payout._id })), { session });
      created = payout;
    });
  } catch (error) {
    if (error.code === 11000) throw createError('Có đơn đã nằm trong một yêu cầu khác. Vui lòng tải lại.', 409);
    throw error;
  } finally {
    await session.endSession();
  }
  return publicPayout(created);
};

const getPartnerPayout = async (user, id) => {
  const vendorId = assertPartner(user);
  assertObjectId(id);
  const payout = await Payout.findOne({ _id: id, vendor_id: vendorId });
  if (!payout) throw createError('Không tìm thấy yêu cầu quyết toán', 404);
  return { ...publicPayout(payout), lines: await linesOf(payout._id) };
};

// Admin side

const listPayouts = async ({ status, search, page = 1, limit = 15 }) => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 15));
  const filter = {};
  if (status) {
    if (!STATUSES.includes(status)) throw createError('Trạng thái không hợp lệ', 400);
    filter.status = status;
  }
  const term = String(search || '').trim().slice(0, 100);
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const partners = await User.find({ $or: [{ full_name: pattern }, { email: pattern }] }).select('_id').limit(200);
    filter.vendor_id = { $in: partners.map((partner) => partner._id) };
  }
  const [items, total] = await Promise.all([
    Payout.find(filter).populate('vendor_id', 'full_name email').sort({ created_at: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
    Payout.countDocuments(filter),
  ]);
  return {
    items: items.map((payout) => ({ ...publicPayout(payout), partner: payout.vendor_id ? { id: payout.vendor_id._id, full_name: payout.vendor_id.full_name, email: payout.vendor_id.email } : null })),
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

const getPayout = async (id) => {
  assertObjectId(id);
  const payout = await Payout.findById(id).populate('vendor_id', 'full_name email').populate('manager_id', 'full_name');
  if (!payout) throw createError('Không tìm thấy yêu cầu quyết toán', 404);
  return {
    ...publicPayout(payout),
    partner: payout.vendor_id ? { id: payout.vendor_id._id, full_name: payout.vendor_id.full_name, email: payout.vendor_id.email } : null,
    reviewed_by: payout.manager_id?.full_name || null,
    lines: await linesOf(payout._id),
  };
};

const decidePayout = async (managerId, id, { status, reason, paid_reference: reference } = {}) => {
  assertObjectId(id);
  if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) throw createError('Trạng thái không hợp lệ', 400);
  const decisionReason = status === 'REJECTED' ? text(reason, 'Lý do từ chối', { min: 1, max: 1000 }) : null;
  const paidReference = status === 'PAID' ? text(reference, 'Mã giao dịch', { min: 3, max: 100 }) : null;

  const session = await mongoose.startSession();
  let payout;
  try {
    await session.withTransaction(async () => {
      const current = await Payout.findById(id).session(session);
      if (!current) throw createError('Không tìm thấy yêu cầu quyết toán', 404);
      const allowed = status === 'PAID' ? current.status === 'APPROVED' : current.status === 'PENDING';
      if (!allowed) throw createError(`Không thể chuyển yêu cầu từ ${current.status} sang ${status}`, 409);

      current.status = status;
      current.manager_id = managerId;
      current.decided_at = new Date();
      if (status === 'REJECTED') current.decision_reason = decisionReason;
      if (status === 'PAID') Object.assign(current, { paid_reference: paidReference, paid_at: new Date() });
      await current.save({ session });
      // Rejected lines go back to the partner's balance so they can be requested again.
      if (status === 'REJECTED') await PayoutDetail.deleteMany({ payout_id: current._id }, { session });
      payout = current;
    });
  } finally {
    await session.endSession();
  }

  const result = await getPayout(payout._id);
  try {
    await sendPayoutEmail({ email: result.partner.email, fullName: result.partner.full_name, status, amount: payout.amount, reason: decisionReason, reference: paidReference });
    result.emailSent = true;
  } catch (error) {
    console.error('Payout email failed', error.code || error.message);
    result.emailSent = false;
  }
  return result;
};

module.exports = {
  getPartnerOverview,
  createPayoutRequest,
  getPartnerPayout,
  listPayouts,
  getPayout,
  decidePayout,
};
