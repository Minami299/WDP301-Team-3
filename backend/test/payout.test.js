const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'payout-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-unit-tests';
const mongoose = require('mongoose');
const { Booking, BookingDetail, Payout, PayoutDetail, SystemConfig } = require('../src/models');
const payouts = require('../src/services/payout.service');
const { completeFinishedBookings } = require('../src/services/booking.service');

const vendor = { id: '507f1f77bcf86cd799439012', role: 'ACTIVITY_VENDOR' };
const bank = { bank_name: 'TPBank', account_number: '00004195763', account_name: 'NGUYEN VAN A' };
const period = { period_start: '2026-01-01', period_end: '2026-12-31' };
const query = value => {
  const chain = { lean: () => chain, populate: () => chain, select: () => chain, session: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  return chain;
};
const transaction = () => mock.method(mongoose, 'startSession', async () => ({ withTransaction: async fn => fn(), endSession: async () => {} }));
const line = (booking_code, allocatedRevenue, platformCommission, commissionRate = 10) => ({ _id: new mongoose.Types.ObjectId(), booking_code, service_name: 'Vé', end_date: new Date('2026-03-01'), allocatedRevenue, platformCommission, commissionRate });
afterEach(() => mock.restoreAll());

test('payout request needs valid bank details and a partner role', async () => {
  const bad = { ...period, bank_account: bank };
  await assert.rejects(payouts.createPayoutRequest({ id: vendor.id, role: 'ADMIN' }, bad), { statusCode: 403 });
  await assert.rejects(payouts.createPayoutRequest(vendor, { ...period }), { statusCode: 400 });
  await assert.rejects(payouts.createPayoutRequest(vendor, { ...period, bank_account: { ...bank, account_number: '12ab' } }), { statusCode: 400 });
  await assert.rejects(payouts.createPayoutRequest(vendor, { ...period, bank_account: { ...bank, bank_name: ' ' } }), { statusCode: 400 });
});

test('activity vendor request stores rounded line snapshots and matching totals', async () => {
  transaction();
  mock.method(SystemConfig, 'find', () => query([]));
  mock.method(BookingDetail, 'aggregate', () => query([line('TVL-A', 100000.4, 10000.04), line('TVL-B', 250000, 25000)]));
  mock.method(PayoutDetail, 'find', () => query([]));
  const create = mock.method(Payout, 'create', async docs => [{ ...docs[0], _id: new mongoose.Types.ObjectId() }]);
  const insert = mock.method(PayoutDetail, 'insertMany', async rows => rows);

  const result = await payouts.createPayoutRequest(vendor, { ...period, bank_account: bank, note: 'Quyết toán quý 1' });
  const saved = create.mock.calls[0].arguments[0][0];
  assert.equal(saved.gross_amount, 350000);
  assert.equal(saved.commission_amount, 35000);
  assert.equal(saved.amount, 315000);
  assert.equal(saved.line_count, 2);
  assert.deepEqual(saved.bank_account, bank);
  assert.equal(insert.mock.calls[0].arguments[0].reduce((total, row) => total + row.amount, 0), saved.amount);
  assert.equal(result.status, 'PENDING');
});

test('request with nothing eligible is refused', async () => {
  transaction();
  mock.method(SystemConfig, 'find', () => query([]));
  mock.method(BookingDetail, 'aggregate', () => query([]));
  mock.method(PayoutDetail, 'find', () => query([]));
  await assert.rejects(payouts.createPayoutRequest(vendor, { ...period, bank_account: bank }), { statusCode: 409 });
});

test('rejecting needs a reason and paying needs a bank reference', async () => {
  const id = '507f1f77bcf86cd799439014';
  await assert.rejects(payouts.decidePayout(vendor.id, id, { status: 'REJECTED', reason: '  ' }), { statusCode: 400 });
  await assert.rejects(payouts.decidePayout(vendor.id, id, { status: 'PAID' }), { statusCode: 400 });
  await assert.rejects(payouts.decidePayout(vendor.id, id, { status: 'DONE' }), { statusCode: 400 });
});

test('a payout can only move forward through the allowed states', async () => {
  transaction();
  const id = '507f1f77bcf86cd799439014';
  mock.method(Payout, 'findById', () => query({ status: 'PENDING', save: async () => {} }));
  await assert.rejects(payouts.decidePayout(vendor.id, id, { status: 'PAID', paid_reference: 'FT123456' }), { statusCode: 409 });
  mock.restoreAll(); transaction();
  mock.method(Payout, 'findById', () => query({ status: 'PAID', save: async () => {} }));
  await assert.rejects(payouts.decidePayout(vendor.id, id, { status: 'APPROVED' }), { statusCode: 409 });
});

test('orders complete after the service date plus hold days, freezing the commission rate', async () => {
  const ready = new mongoose.Types.ObjectId(), waiting = new mongoose.Types.ObjectId();
  const day = n => new Date(Date.now() - n * 86400000);
  mock.method(SystemConfig, 'find', () => query([{ config_key: 'COMMISSION_RATE_DEFAULT', config_value: '12' }, { config_key: 'SETTLEMENT_HOLD_DAYS', config_value: '7' }]));
  mock.method(Booking, 'find', () => query([{ _id: ready }, { _id: waiting }]));
  mock.method(mongoose.connection, 'transaction', async fn => fn({}));
  mock.method(BookingDetail, 'find', filter => query(String(filter.booking_id) === String(ready) ? [{ check_out_date: day(10) }] : [{ check_out_date: day(3) }]));
  const complete = mock.method(Booking, 'updateOne', async () => ({ modifiedCount: 1 }));
  const freeze = mock.method(BookingDetail, 'updateMany', async () => ({}));

  assert.equal(await completeFinishedBookings(), 1);
  assert.equal(complete.mock.callCount(), 1);
  assert.equal(String(complete.mock.calls[0].arguments[0]._id), String(ready));
  assert.deepEqual(freeze.mock.calls[0].arguments[1], { $set: { commission_rate: 12 } });
});
