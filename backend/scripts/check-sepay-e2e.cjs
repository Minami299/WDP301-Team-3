// End-to-end SePay check against the dev DB. Creates one room booking, posts a fake SePay
// webhook to the running backend, verifies the result, then deletes everything it created.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { User, Role, Service, Booking, BookingDetail, Payment } = require('../src/models');
const booking = require('../src/services/booking.service');
const pay = require('../src/services/payment.service');

const base = `http://localhost:${process.env.PORT || 5000}`;
const hook = (body, key = process.env.SEPAY_API_KEY) => fetch(`${base}/api/payments/sepay/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${key}` }, body: JSON.stringify(body) }).then(async r => `${r.status}`);
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const day = n => new Date(Date.now() + n * 86400000 + 7 * 3600000).toISOString().slice(0, 10);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const customerRole = await Role.findOne({ role_name: 'CUSTOMER' });
  const customer = await User.findOne({ role_id: customerRole._id, status: 'ACTIVE' });
  const service = await Service.findOne({ type: 'ROOM' }).populate('facility_id');
  if (!customer || !service) throw new Error('Need one active customer and one ROOM service in the DB');
  const created = [];
  try {
    const request = (extra = {}) => ({ guest_name: 'Test SePay', guest_email: 'sepay-test@example.com', guest_phone: '0900000000', agree_conditions: true, request_id: `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`, service_id: String(service._id), check_in: day(30), check_out: day(32), rooms: 1, guests: 1, expected_total: service.base_price * 2, ...extra });
    const b = await booking.createRoomBooking(customer._id, request());
    created.push(b._id);
    check('room booking created PENDING with 15m hold', b.status === 'PENDING' && b.expires_at > new Date(), `${b.booking_code}, ${b.final_amount} VND`);
    check('stay dates stored', b.details[0].nights === 2 && b.details[0].check_in_date);
    const stale = await booking.createRoomBooking(customer._id, request({ expected_total: 1 })).then(() => false, e => e.statusCode === 409);
    check('wrong expected_total rejected (409)', stale);

    const info = await pay.getPaymentInfo(customer._id, b._id);
    check('payment info', info.content === pay.paymentCodeOf(b.booking_code) && info.amount === b.final_amount, info.content);
    const qr = await fetch(info.qr_url);
    check('VietQR image loads', qr.ok && qr.headers.get('content-type').startsWith('image'));

    const under = await hook({ id: 880000001, transferType: 'in', transferAmount: b.final_amount - 1, content: `${info.content} FT123` });
    const afterUnder = await Booking.findById(b._id);
    check('underpayment does not confirm', under === '200' && afterUnder.status === 'PENDING');

    const sent = { id: 880000002, transferType: 'in', transferAmount: b.final_amount, content: `Thanh toan ${info.content} FT456`, referenceCode: 'FT456', transactionDate: '2026-10-18 10:00:00' };
    check('webhook accepted', await hook(sent) === '200');
    const paid = await Booking.findById(b._id);
    check('booking CONFIRMED after payment', paid.status === 'CONFIRMED');
    const detail = await BookingDetail.findOne({ booking_id: b._id });
    check('QR issued after payment', Boolean(detail.qr_code));
    check('duplicate webhook is idempotent', await hook(sent) === '200' && await Payment.countDocuments({ transaction_id: 'SEPAY-880000002' }) === 1);
    check('wrong API key rejected', await hook(sent, 'nope') === '401');

    const x = await booking.createRoomBooking(customer._id, request());
    created.push(x._id);
    await Booking.updateOne({ _id: x._id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    const n = await booking.expireStaleBookings();
    check('unpaid order expires and frees room', n >= 1 && (await Booking.findById(x._id)).status === 'CANCELLED');
  } finally {
    await Payment.deleteMany({ booking_id: { $in: created } });
    await Payment.deleteMany({ transaction_id: { $in: ['SEPAY-880000001', 'SEPAY-880000002'] } });
    await BookingDetail.deleteMany({ booking_id: { $in: created } });
    await Booking.deleteMany({ _id: { $in: created } });
    await mongoose.disconnect();
    console.log('test data cleaned up');
  }
})().catch(e => { console.error('FAIL', e.message); process.exitCode = 1; mongoose.disconnect(); });
