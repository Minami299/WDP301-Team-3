const crypto = require('crypto');
const mongoose = require('mongoose');
const { PayOS } = require('@payos/node');
const { Booking, BookingDetail, Payment } = require('../models');

const createError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

let client;
const payos = () => {
  const { PAYOS_CLIENT_ID: clientId, PAYOS_API_KEY: apiKey, PAYOS_CHECKSUM_KEY: checksumKey } = process.env;
  if (!clientId || !apiKey || !checksumKey) throw createError('Cổng thanh toán PayOS chưa được cấu hình', 503, 'PAYOS_NOT_CONFIGURED');
  client ||= new PayOS({ clientId, apiKey, checksumKey, ...(process.env.PAYOS_API_URL ? { baseURL: process.env.PAYOS_API_URL } : {}) });
  return client;
};

// PAYOS_RETURN_URL / PAYOS_CANCEL_URL may contain {bookingId}; otherwise the order page is used.
const redirectUrl = (envValue, fallback, bookingId) =>
  envValue ? envValue.replace('{bookingId}', String(bookingId)) : fallback;

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

// PayOS needs a unique integer per payment link (max 2^53-1).
const newOrderCode = () => Date.now() * 1000 + crypto.randomInt(1000);
// PayOS limits the description to 25 characters.
const descriptionOf = (bookingCode) => `TVL ${String(bookingCode).slice(-8)}`;

const publicLink = (booking) => ({
  booking_id: booking._id,
  booking_status: booking.status,
  expires_at: booking.expires_at || null,
  amount: booking.final_amount,
  ...booking.payment_link,
});

const loadOwnBooking = async (userId, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) throw createError('Mã đơn không hợp lệ', 400);
  const booking = await Booking.findOne({ _id: bookingId, customer_id: userId });
  if (!booking) throw createError('Không tìm thấy đơn đặt', 404);
  return booking;
};

// PayOS answers HTTP 200 with code 101 when the order is unknown to the configured channel
// (for example it was created with the keys of another payment channel).
const isUnknownOrder = (error) => String(error?.code) === '101' || /code: 101/.test(error?.message || '');

const inflight = new Map();

const createLink = async (booking) => {
  const orderCode = newOrderCode();
  const description = descriptionOf(booking.booking_code);
  const base = `${frontendUrl()}/my-trips/${booking._id}`;
  const link = await payos().paymentRequests.create({
    orderCode,
    amount: booking.final_amount,
    description,
    // PayOS appends ?code&id&cancel&status&orderCode; the page only uses these to pick a message.
    returnUrl: redirectUrl(process.env.PAYOS_RETURN_URL, `${base}?payment=return`, booking._id),
    cancelUrl: redirectUrl(process.env.PAYOS_CANCEL_URL, `${base}?payment=cancel`, booking._id),
    buyerName: booking.guest_name,
    buyerEmail: booking.guest_email,
    ...(booking.expires_at ? { expiredAt: Math.floor(booking.expires_at.getTime() / 1000) } : {}),
  });
  const payment_link = {
    order_code: orderCode,
    payment_link_id: link.paymentLinkId,
    checkout_url: link.checkoutUrl,
    qr_code: link.qrCode,
    bin: link.bin,
    account_number: link.accountNumber,
    account_name: link.accountName,
    description,
  };
  await Booking.updateOne({ _id: booking._id }, { $set: { payment_link, payos_order_code: orderCode } });
  return payment_link;
};

// Returns the payment link of a pending order, creating a new one when none exists or the old one is dead.
const getPaymentInfo = async (userId, bookingId) => {
  const booking = await loadOwnBooking(userId, bookingId);
  if (booking.status !== 'PENDING') return publicLink(booking);
  if (booking.expires_at && booking.expires_at < new Date()) throw createError('Đơn đã hết thời gian giữ chỗ', 409);

  const key = String(booking._id);
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      let existing = booking.payment_link?.order_code ? booking.payment_link : null;
      if (existing) {
        try {
          const status = (await payos().paymentRequests.get(existing.order_code)).status;
          if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(status)) existing = null;
        } catch (error) {
          if (error.code === 'PAYOS_NOT_CONFIGURED') throw error;
          if (isUnknownOrder(error)) existing = null; // link belongs to another channel; issue a new one
        }
      }
      return existing || createLink(booking);
    })().finally(() => inflight.delete(key)));
  }
  const payment_link = await inflight.get(key);
  return publicLink({ ...booking.toObject(), payment_link });
};

// Idempotent: one Payment per bank transaction, so repeated reconciliation never double-counts.
const recordPayment = async (booking, { orderCode, amount, reference, content, paidAt }) => {
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
        transaction_id: `PAYOS-${orderCode}-${reference || 'NA'}`,
        payment_gateway: 'PAYOS',
        amount,
        status,
        note,
        reference_code: reference || null,
        content: String(content || '').slice(0, 500),
        payment_date: paidAt || new Date(),
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
    // Only a duplicate Payment (same PayOS order) means "already recorded".
    const duplicatePayment = error.code === 11000 && /transaction_id/.test(error.message);
    if (!duplicatePayment) throw error;
  }
};

// PayOS gives "2026-10-19T23:40:00+07:00"; a bare "2026-10-19 23:40:00" is treated as Vietnam time.
const parseBankTime = (value) => {
  const text = String(value || '').trim();
  if (!text) return new Date();
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text.replace(' ', 'T')}+07:00`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Asks PayOS about one pending order and matches its bank transactions to our order:
// the order code (our payos_order_code) must equal PayOS's, and each bank transaction is stored once by its reference.
const reconcileBooking = async (booking) => {
  if (booking.status !== 'PENDING' || !booking.payos_order_code) return false;
  let link;
  try {
    link = await payos().paymentRequests.get(booking.payos_order_code);
  } catch (error) {
    if (!isUnknownOrder(error)) throw error;
    return false; // order belongs to another PayOS channel; leave it PENDING
  }
  if (link.orderCode !== undefined && Number(link.orderCode) !== Number(booking.payos_order_code)) return false;
  for (const tx of link.transactions || []) {
    await recordPayment(booking, {
      orderCode: booking.payos_order_code,
      amount: tx.amount,
      reference: tx.reference,
      content: tx.description,
      paidAt: parseBankTime(tx.transactionDateTime),
    });
  }
  return true;
};

// Called by the payment page; the customer only ever sees their own order.
const verifyPayment = async (userId, bookingId) => {
  const booking = await loadOwnBooking(userId, bookingId);
  await reconcileBooking(booking);
  const current = await Booking.findById(booking._id).select('status').lean();
  return { booking_id: booking._id, booking_status: current.status };
};

let reconciling = false;
// Background job: no webhook is used, so the server itself checks every unpaid order against PayOS.
const reconcilePendingPayments = async () => {
  if (reconciling) return 0;
  reconciling = true;
  try {
    const pending = await Booking.find({ status: 'PENDING', payos_order_code: { $exists: true } }).sort({ created_at: 1 }).limit(50);
    let confirmed = 0;
    for (const booking of pending) {
      try {
        await reconcileBooking(booking);
        if ((await Booking.findById(booking._id).select('status').lean()).status === 'CONFIRMED') confirmed += 1;
      } catch (error) {
        if (error.code === 'PAYOS_NOT_CONFIGURED') return confirmed;
        console.error('PayOS reconcile failed for', booking.booking_code, error.message);
      }
    }
    return confirmed;
  } finally {
    reconciling = false;
  }
};

// Test hook: lets scripts replace the PayOS client with a fake.
const setClientForTests = (fake) => { client = fake; };

module.exports = { getPaymentInfo, verifyPayment, reconcileBooking, reconcilePendingPayments, setClientForTests, descriptionOf };
