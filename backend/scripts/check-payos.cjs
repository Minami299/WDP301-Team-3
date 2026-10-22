// Checks PayOS reconciliation (no webhook) against the dev DB. A real PayOS payment link is created, then a fake
// PayOS client reports a paid transaction. Everything created is deleted afterwards. Usage: node scripts/check-payos.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { User, Role, Service, Booking, BookingDetail, Payment } = require('../src/models');
const booking = require('../src/services/booking.service');
const pay = require('../src/services/payment.service');

const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const day = n => new Date(Date.now() + n * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
const tx = (amount, reference) => ({ amount, reference, description: 'TVL TEST', transactionDateTime: '2026-10-19T23:40:00+07:00' });
const fakePayos = (state) => ({ paymentRequests: { get: async (code) => ({ orderCode: code, status: state.status, amountPaid: state.transactions.reduce((a, t) => a + t.amount, 0), transactions: state.transactions }) } });

(async () => {
  for (const k of ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY']) check(`env ${k}`, Boolean(process.env[k]));
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const customer = await User.findOne({ role_id: (await Role.findOne({ role_name: 'CUSTOMER' }))._id, status: 'ACTIVE' });
  const service = await Service.findOne({ type: 'ROOM' });
  const created = [];
  const make = async (offset) => {
    const b = await booking.createRoomBooking(customer._id, { guest_name: 'Test PayOS', guest_email: 'payos-test@example.com', guest_phone: '0900000000', agree_conditions: true, request_id: `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`, service_id: String(service._id), check_in: day(offset), check_out: day(offset + 1), rooms: 1, guests: 1 });
    created.push(b._id);
    return b;
  };
  try {
    const b = await make(40);
    check('room order created PENDING', b.status === 'PENDING', `${b.booking_code}, ${b.final_amount} VND`);
    const info = await pay.getPaymentInfo(customer._id, b._id);
    check('PayOS payment link created (real API)', Boolean(info.checkout_url && info.qr_code), info.checkout_url);
    const order = (await Booking.findById(b._id)).payos_order_code;

    const state = { status: 'PENDING', transactions: [] };
    pay.setClientForTests(fakePayos(state));
    await pay.reconcilePendingPayments();
    check('nothing paid: order stays PENDING', (await Booking.findById(b._id)).status === 'PENDING');

    state.transactions = [tx(b.final_amount - 1, 'FT-SHORT')];
    await pay.reconcilePendingPayments();
    check('underpayment does not confirm', (await Booking.findById(b._id)).status === 'PENDING');

    state.status = 'PAID'; state.transactions = [tx(b.final_amount, 'FT-OK-1')];
    const confirmed = await pay.reconcilePendingPayments();
    const paid = await Booking.findById(b._id);
    check('background job confirms the paid order', paid.status === 'CONFIRMED' && confirmed >= 1);
    const payment = await Payment.findOne({ booking_id: b._id, status: 'SUCCESS' });
    check('Payment stores matching PayOS ids', payment?.transaction_id === `PAYOS-${order}-FT-OK-1` && payment.reference_code === 'FT-OK-1');
    check('QR issued after payment', Boolean((await BookingDetail.findOne({ booking_id: b._id })).qr_code));
    await pay.reconcilePendingPayments(); await pay.verifyPayment(customer._id, b._id);
    check('repeated reconciliation is idempotent', await Payment.countDocuments({ booking_id: b._id, status: 'SUCCESS' }) === 1);

    const late = await make(42);
    await pay.getPaymentInfo(customer._id, late._id);
    await Booking.updateOne({ _id: late._id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    state.status = 'PAID'; state.transactions = [tx(late.final_amount, 'FT-LATE')];
    await booking.expireStaleBookings();
    check('paid-but-page-closed order is confirmed, not cancelled, at expiry', (await Booking.findById(late._id)).status === 'CONFIRMED');
  } finally {
    await Payment.deleteMany({ booking_id: { $in: created } });
    await BookingDetail.deleteMany({ booking_id: { $in: created } });
    await Booking.deleteMany({ _id: { $in: created } });
    await mongoose.disconnect();
    console.log('test data cleaned up');
  }
})().catch(e => { console.error('FAIL', e.message); process.exitCode = 1; mongoose.disconnect(); });
