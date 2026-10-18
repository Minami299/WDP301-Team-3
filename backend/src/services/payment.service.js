const crypto = require('crypto');
const mongoose = require('mongoose');
const { Booking, BookingDetail, Payment } = require('../models');

const createError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

const config = () => ({
  apiKey: process.env.SEPAY_API_KEY || '',
  account: process.env.SEPAY_BANK_ACCOUNT || '',
  bank: process.env.SEPAY_BANK_NAME || '',
  accountName: process.env.SEPAY_ACCOUNT_NAME || '',
});

// Banks strip punctuation from transfer content, so the code sent to the customer has no hyphen.
const paymentCodeOf = (bookingCode) => String(bookingCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const BOOKING_CODE_PATTERN = /TVL[0-9A-F]{16}/;

const timingSafeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// SePay sends `Authorization: Apikey <key>`.
const assertWebhookAuthorized = (header) => {
  const { apiKey } = config();
  if (!apiKey) throw createError('SePay is not configured', 503, 'SEPAY_NOT_CONFIGURED');
  const match = /^Apikey\s+(.+)$/i.exec(String(header || '').trim());
  if (!match || !timingSafeEqual(match[1], apiKey)) throw createError('Invalid SePay API key', 401);
};

const getPaymentInfo = async (userId, bookingId) => {
  const { account, bank, accountName } = config();
  if (!account || !bank) throw createError('Cổng thanh toán SePay chưa được cấu hình', 503, 'SEPAY_NOT_CONFIGURED');
  if (!mongoose.isValidObjectId(bookingId)) throw createError('Mã đơn không hợp lệ', 400);
  const booking = await Booking.findOne({ _id: bookingId, customer_id: userId }).lean();
  if (!booking) throw createError('Không tìm thấy đơn đặt', 404);
  const content = paymentCodeOf(booking.booking_code);
  const params = new URLSearchParams({ acc: account, bank, amount: String(booking.final_amount), des: content });
  return {
    booking_id: booking._id,
    booking_status: booking.status,
    expires_at: booking.expires_at || null,
    amount: booking.final_amount,
    bank,
    account_number: account,
    account_name: accountName,
    content,
    qr_url: `https://qr.sepay.vn/img?${params}`,
  };
};

// Idempotent: SePay retries a webhook until it gets HTTP 200 + {"success": true}.
const handleWebhook = async (authorization, body) => {
  assertWebhookAuthorized(authorization);
  const payload = body || {};
  if (payload.transferType !== 'in') return { ignored: 'not an incoming transfer' };
  const sepayId = payload.id;
  const amount = Number(payload.transferAmount);
  if (sepayId === undefined || sepayId === null || !Number.isFinite(amount) || amount <= 0) {
    throw createError('Invalid SePay payload', 400);
  }

  const haystack = `${payload.code || ''} ${payload.content || ''}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const found = BOOKING_CODE_PATTERN.exec(haystack);
  if (!found) return { ignored: 'no booking code in transfer content' };
  const booking = await Booking.findOne({ booking_code: `TVL-${found[0].slice(3)}` });
  if (!booking) return { ignored: 'unknown booking code' };

  const transactionId = `SEPAY-${sepayId}`;
  try {
    await mongoose.connection.transaction(async (session) => {
      const fresh = await Booking.findById(booking._id).session(session);
      let status = 'SUCCESS';
      let note = null;
      if (fresh.status !== 'PENDING') {
        status = 'FAILED';
        note = `Booking is ${fresh.status}; manual refund may be required`;
      } else if (amount < fresh.final_amount) {
        status = 'FAILED';
        note = `Underpaid: received ${amount}, expected ${fresh.final_amount}`;
      }
      await Payment.create([{
        booking_id: fresh._id,
        transaction_id: transactionId,
        payment_gateway: 'SEPAY',
        amount,
        status,
        note,
        reference_code: payload.referenceCode || null,
        content: String(payload.content || '').slice(0, 500),
        payment_date: payload.transactionDate ? new Date(`${payload.transactionDate.replace(' ', 'T')}+07:00`) : new Date(),
      }], { session });
      if (status === 'SUCCESS') {
        await Booking.updateOne({ _id: fresh._id, status: 'PENDING' }, { $set: { status: 'CONFIRMED' } }, { session });
        // Issue the entry/check-in QR only once the order is paid.
        const details = await BookingDetail.find({ booking_id: fresh._id, qr_code: { $exists: false } }).session(session);
        for (const detail of details) {
          await BookingDetail.updateOne({ _id: detail._id }, { $set: { qr_code: `TVL-QR-${crypto.randomBytes(12).toString('hex').toUpperCase()}` } }, { session });
        }
      }
    });
  } catch (error) {
    if (error.code !== 11000) throw error; // duplicate delivery of the same transaction
  }
  return { booking_code: booking.booking_code };
};

module.exports = { getPaymentInfo, handleWebhook, paymentCodeOf };
