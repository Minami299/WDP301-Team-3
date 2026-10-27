// Checks the payout flow against the dev DB with one isolated, fake COMPLETED order, then deletes it.
// Emails are faked so no partner is contacted. Usage: node scripts/check-settlements.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const email = require('../src/services/email.service');
const sent = [];
email.sendPayoutEmail = async (message) => { sent.push(message.status); };
const { User, Service, Booking, BookingDetail, Payment, Payout, PayoutDetail, Role } = require('../src/models');
const payouts = require('../src/services/payout.service');

const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) process.exitCode = 1; };
const status = (promise) => promise.then(() => 0, (error) => error.statusCode || 500);
const DAY = '2001-01-01';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const customer = await User.findOne({ role_id: (await Role.findOne({ role_name: 'CUSTOMER' }))._id });
  const room = await Service.findOne({ type: 'ROOM' }).populate('facility_id');
  const partner = await User.findById(room.facility_id.vendor_id).populate('role_id');
  const actor = { id: String(partner._id), role: partner.role_id.role_name };
  const admin = await User.findOne({ role_id: (await Role.findOne({ role_name: 'ADMIN' }))._id });
  const request = { period_start: DAY, period_end: DAY, bank_account: { bank_name: 'TPBank', account_number: '00004195763', account_name: 'TEST E2E' }, note: 'check-settlements' };
  const created = { payouts: [] };
  try {
    const booking = await Booking.create({ booking_code: `TVL-E2E${Date.now()}`, customer_id: customer._id, vendor_id: partner._id, guest_name: 'E2E', guest_email: 'e2e@example.com', guest_phone: '0900000000', total_amount: 1000000, final_amount: 1000000, status: 'COMPLETED' });
    created.booking = booking._id;
    await BookingDetail.create({ booking_id: booking._id, service_id: room._id, quantity: 1, unit_price: 1000000, service_name: room.name, check_in_date: new Date('2000-12-30'), check_out_date: new Date('2000-12-31'), nights: 1, commission_rate: 10 });
    await Payment.create({ booking_id: booking._id, transaction_id: `E2E-${Date.now()}`, payment_gateway: 'PAYOS', amount: 1000000, status: 'SUCCESS', payment_date: new Date(`${DAY}T05:00:00Z`) });

    const overview = await payouts.getPartnerOverview(actor, { from: DAY, to: DAY });
    check('eligible balance applies the frozen 10% rate', overview.available.line_count === 1 && overview.available.amount === 900000 && overview.available.commission === 100000, JSON.stringify(overview.available));
    check('admin cannot use the partner API', await status(payouts.getPartnerOverview({ id: String(admin._id), role: 'ADMIN' }, {})) === 403);
    check('bank details are required', await status(payouts.createPayoutRequest(actor, { ...request, bank_account: {} })) === 400);

    const first = await payouts.createPayoutRequest(actor, request);
    created.payouts.push(first.id);
    check('request created PENDING with totals', first.status === 'PENDING' && first.amount === 900000 && first.line_count === 1);
    check('same orders cannot be requested twice', await status(payouts.createPayoutRequest(actor, request)) === 409);
    const detail = await payouts.getPartnerPayout(actor, first.id);
    check('partner sees order lines', detail.lines.length === 1 && detail.lines[0].amount === 900000);
    check('another partner cannot read it', await status(payouts.getPartnerPayout({ id: String(admin._id), role: 'HOTEL_OWNER' }, first.id)) === 404);
    const listed = await payouts.listPayouts({ status: 'PENDING', search: partner.email });
    check('admin list finds it by partner email', listed.items.some((item) => String(item.id) === String(first.id)));

    check('reject without reason is blocked', await status(payouts.decidePayout(admin._id, first.id, { status: 'REJECTED' })) === 400);
    const rejected = await payouts.decidePayout(admin._id, first.id, { status: 'REJECTED', reason: 'Sai tài khoản' });
    check('rejected with reason and email', rejected.status === 'REJECTED' && rejected.decision_reason === 'Sai tài khoản' && rejected.emailSent === true);
    check('rejected orders return to the balance', (await payouts.getPartnerOverview(actor, { from: DAY, to: DAY })).available.line_count === 1);

    const second = await payouts.createPayoutRequest(actor, request);
    created.payouts.push(second.id);
    check('pay before approval is blocked', await status(payouts.decidePayout(admin._id, second.id, { status: 'PAID', paid_reference: 'FT0001' })) === 409);
    check('approve works', (await payouts.decidePayout(admin._id, second.id, { status: 'APPROVED' })).status === 'APPROVED');
    check('pay without reference is blocked', await status(payouts.decidePayout(admin._id, second.id, { status: 'PAID' })) === 400);
    const paid = await payouts.decidePayout(admin._id, second.id, { status: 'PAID', paid_reference: 'FT20261022' });
    check('paid stores reference and date', paid.status === 'PAID' && paid.paid_reference === 'FT20261022' && Boolean(paid.paid_at));
    check('paid payout cannot change again', await status(payouts.decidePayout(admin._id, second.id, { status: 'APPROVED' })) === 409);
    check('partner overview counts the paid amount', (await payouts.getPartnerOverview(actor, { from: DAY, to: DAY })).paid_amount >= 900000);
    check('emails sent for each decision', sent.join(',') === 'REJECTED,APPROVED,PAID', sent.join(','));
  } finally {
    const ids = created.payouts.map((id) => new mongoose.Types.ObjectId(String(id)));
    await PayoutDetail.deleteMany({ payout_id: { $in: ids } });
    await Payout.deleteMany({ _id: { $in: ids } });
    if (created.booking) {
      await Payment.deleteMany({ booking_id: created.booking });
      await BookingDetail.deleteMany({ booking_id: created.booking });
      await Booking.deleteMany({ _id: created.booking });
    }
    await mongoose.disconnect();
    console.log('test data cleaned up');
  }
})().catch((error) => { console.error('FAIL', error.message); process.exitCode = 1; mongoose.disconnect(); });
