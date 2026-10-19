// Checks PayOS end to end against the dev DB: creates a room order, creates a real PayOS payment link,
// posts a correctly signed fake webhook, then deletes everything it created. Usage: node scripts/check-payos.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { PayOS } = require('@payos/node');
const { User, Role, Service, Booking, BookingDetail, Payment } = require('../src/models');
const booking = require('../src/services/booking.service');
const pay = require('../src/services/payment.service');

const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const day = n => new Date(Date.now() + n * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
const payos = new PayOS({ clientId: process.env.PAYOS_CLIENT_ID, apiKey: process.env.PAYOS_API_KEY, checksumKey: process.env.PAYOS_CHECKSUM_KEY });

const signed = async (data) => ({ code: '00', desc: 'success', success: true, data, signature: await payos.crypto.createSignatureFromObj(data, process.env.PAYOS_CHECKSUM_KEY) });
const webhookData = (orderCode, amount, ref) => ({ orderCode, amount, description: 'TVL TEST', accountNumber: '123', reference: ref, transactionDateTime: '2026-10-19 10:00:00', currency: 'VND', paymentLinkId: 'x', code: '00', desc: 'Thành công', counterAccountBankId: '', counterAccountBankName: '', counterAccountName: '', counterAccountNumber: '', virtualAccountName: '', virtualAccountNumber: '' });

(async () => {
  for (const k of ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY']) check(`env ${k}`, Boolean(process.env[k]));
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const customer = await User.findOne({ role_id: (await Role.findOne({ role_name: 'CUSTOMER' }))._id, status: 'ACTIVE' });
  const service = await Service.findOne({ type: 'ROOM' });
  const created = [];
  try {
    const req = (extra = {}) => ({ guest_name: 'Test PayOS', guest_email: 'payos-test@example.com', guest_phone: '0900000000', agree_conditions: true, request_id: `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`, service_id: String(service._id), check_in: day(40), check_out: day(41), rooms: 1, guests: 1, ...extra });
    const b = await booking.createRoomBooking(customer._id, req());
    created.push(b._id);
    check('room order created PENDING', b.status === 'PENDING', `${b.booking_code}, ${b.final_amount} VND`);

    const info = await pay.getPaymentInfo(customer._id, b._id);
    check('PayOS payment link created', Boolean(info.checkout_url && info.qr_code), info.checkout_url);
    const again = await pay.getPaymentInfo(customer._id, b._id);
    check('second call reuses the same link', again.payment_link_id === info.payment_link_id);

    const order = (await Booking.findById(b._id)).payos_order_code;
    const bad = await pay.handleWebhook({ ...(await signed(webhookData(order, b.final_amount, 'T1'))), signature: 'f'.repeat(64) }).then(() => 'accepted', e => e.statusCode);
    check('bad signature rejected (401)', bad === 401);
    await pay.handleWebhook(await signed(webhookData(order, b.final_amount - 1, 'T0')));
    check('underpayment does not confirm', (await Booking.findById(b._id)).status === 'PENDING');

    const ok = await signed(webhookData(order, b.final_amount, 'T2'));
    await pay.handleWebhook(ok);
    check('valid webhook confirms order', (await Booking.findById(b._id)).status === 'CONFIRMED');
    check('QR issued after payment', Boolean((await BookingDetail.findOne({ booking_id: b._id })).qr_code));
    await pay.handleWebhook(ok);
    check('duplicate webhook is idempotent', await Payment.countDocuments({ booking_id: b._id, status: 'SUCCESS' }) === 1);
    const ping = await pay.handleWebhook(await signed(webhookData(123, 2000, 'ping'))).then(() => true, () => false);
    check('unknown order code (PayOS URL test) answered OK', ping);
    check('verifyPayment on confirmed order', (await pay.verifyPayment(customer._id, b._id)).booking_status === 'CONFIRMED');
  } finally {
    await Payment.deleteMany({ booking_id: { $in: created } });
    await BookingDetail.deleteMany({ booking_id: { $in: created } });
    await Booking.deleteMany({ _id: { $in: created } });
    await mongoose.disconnect();
    console.log('test data cleaned up');
  }
})().catch(e => { console.error('FAIL', e.message); process.exitCode = 1; mongoose.disconnect(); });
