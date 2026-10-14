// Opt-in integration check against the running Travelio API and its current database.
// Creates clearly named test accounts/orders through normal APIs; never creates a database.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const api = process.argv.includes('--api') ? process.argv[process.argv.indexOf('--api') + 1] : 'http://localhost:5000/api';
const results = [];
const checks = async (name, run) => { await run(); results.push(name); console.log('PASS ' + name); };
async function call(route, token, method = 'GET', body, expected = 200) {
  const r = await fetch(api + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json();
  assert.equal(r.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
  return data.data ?? data;
}
async function main() {
  const stamp = Date.now();
  const password = 'TravelioTest123';
  const vendorEmail = `orders-vendor-${stamp}@example.com`, customerEmail = `orders-customer-${stamp}@example.com`;
  const signup = (email, role, extra = {}) => call('/auth/register', null, 'POST', { full_name: 'MVP Orders Test', email, password, confirm_password: password, agree_terms: true, role_name: role, ...extra }, 201);
  const vendor = await signup(vendorEmail, 'ACTIVITY_VENDOR', { facility_name: 'MVP Orders Test ' + stamp, facility_address: '123 Test Street', facility_city: 'Lào Cai', phone: '0912345678', business_type: 'ATTRACTION', services: [{ name: 'Khám Phá Sapa', ticket_types: [{ name: 'Người lớn', price: 150000, description: 'Vé tham quan người lớn' }, { name: 'Trẻ em', price: 80000, description: 'Vé tham quan trẻ em' }, { name: 'Ngừng bán', price: 1, status: 'INACTIVE' }] }, { name: 'Trải nghiệm thứ hai', ticket_types: [{ name: 'VIP', price: 300000 }] }] });
  const customer = await signup(customerEmail, 'CUSTOMER');
  const outsider = await signup(`orders-other-${stamp}@example.com`, 'CUSTOMER');
  // A separate test vendor proves ownership checks, without changing existing users.
  const otherVendor = await signup(`orders-other-vendor-${stamp}@example.com`, 'ACTIVITY_VENDOR', { facility_name: 'Other Orders Test ' + stamp, facility_address: '456 Test Street', facility_city: 'Hà Nội', phone: '0912345678', business_type: 'TICKET', services: [{ name: 'Other service', base_price: 1000 }] });
  const facilities = await call('/vendor/attractions', vendor.token);
  const facility = facilities[0]; const service = facility.tickets.find(s => s.name === 'Khám Phá Sapa');
  const adult = service.ticket_types[0], child = service.ticket_types[1];
  const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const lines = [{ service_id: service._id, ticket_type_id: adult._id, visit_date: date, quantity: 2, price: 1 }, { service_id: service._id, ticket_type_id: child._id, visit_date: date, quantity: 1, price: 1 }];
  const payload = { items: lines, guest_name: 'Khách Test Sapa', guest_email: customerEmail, guest_phone: '0912345678', agree_conditions: true, request_id: crypto.randomUUID(), expected_total: 380000 };
  let first, second, scheduled;
  await checks('Public services/ticket types are real; inactive tiers hidden; quote recomputes 380000', async () => {
    const publicData = await call(`/facilities/${facility._id}/ticket-availability?date=${date}`);
    assert.equal(publicData.length, 2); assert.equal(publicData.find(s => s._id === service._id).ticket_types.length, 2);
    assert.equal((await call('/bookings/quote', customer.token, 'POST', { items: lines })).final_amount, 380000);
  });
  await checks('Concurrent create is idempotent; new order PENDING, no payment/QR', async () => {
    const created = await Promise.all([call('/bookings', customer.token, 'POST', payload, 201), call('/bookings', customer.token, 'POST', payload, 201)]);
    first = created[0]; assert.equal(first._id, created[1]._id); assert.equal(first.status, 'PENDING'); assert.equal(first.final_amount, 380000); assert.equal(first.details.length, 2); assert.equal(first.payments.length, 0); assert.ok(first.details.every(d => !d.qr_code)); assert.equal(first.vendor_id, vendor.user.id);
  });
  await checks('Customer history, Vendor list/detail/search/filter; foreign access denied', async () => {
    assert.ok((await call('/bookings', customer.token)).some(b => b._id === first._id));
    assert.equal((await call(`/bookings/vendor?q=${first.booking_code}&status=PENDING`, vendor.token)).length, 1);
    assert.equal((await call(`/bookings/vendor/${first._id}`, vendor.token)).details.length, 2);
    await call(`/bookings/${first._id}`, outsider.token, 'GET', undefined, 404);
    await call(`/bookings/vendor/${first._id}`, otherVendor.token, 'GET', undefined, 404);
    assert.ok(!(await call('/bookings/vendor', otherVendor.token)).some(b => b._id === first._id));
    await call(`/bookings/${first._id}/cancellations`, vendor.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Wrong role' }, 403);
  });
  await checks('Request requires reason; customer ownership; duplicate and concurrent requests', async () => {
    await call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', { request_id: crypto.randomUUID(), reason: ' ' }, 400);
    await call(`/bookings/${first._id}/cancellations`, outsider.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Other customer' }, 404);
    const req = { request_id: crypto.randomUUID(), reason: 'Thay đổi lịch trình' };
    const [a, b] = await Promise.all([call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', req), call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', req)]);
    assert.equal(a.cancellation_requests.length, 1); assert.equal(b.cancellation_requests.length, 1); first = a;
    await call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Duplicate pending' }, 409);
  });
  await checks('Vendor rejects; keeps Pending; reason and history preserved; conflicting decisions denied', async () => {
    const request = first.cancellation_requests[0]; const route = `/bookings/vendor/${first._id}/cancellations/${request._id}`;
    await call(route, otherVendor.token, 'PATCH', { status: 'APPROVED' }, 404);
    await call(route, customer.token, 'PATCH', { status: 'APPROVED' }, 403);
    first = await call(route, vendor.token, 'PATCH', { status: 'REJECTED', reason: 'Vui lòng xác nhận lại lịch trình' });
    assert.equal(first.status, 'PENDING'); assert.equal(first.cancellation_requests[0].status, 'REJECTED');
    await call(route, vendor.token, 'PATCH', { status: 'REJECTED' });
    await call(route, vendor.token, 'PATCH', { status: 'APPROVED' }, 409);
  });
  await checks('Resubmit after rejection; concurrent approve once; Cancelled remains in history', async () => {
    first = await call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Đã xác nhận không thể tham gia' });
    const request = first.cancellation_requests.at(-1), route = `/bookings/vendor/${first._id}/cancellations/${request._id}`;
    const [a, b] = await Promise.all([call(route, vendor.token, 'PATCH', { status: 'APPROVED' }), call(route, vendor.token, 'PATCH', { status: 'APPROVED' })]);
    assert.equal(a.status, 'CANCELLED'); assert.equal(b.status, 'CANCELLED'); assert.equal(a.cancellation_requests.length, 2); first = a;
    const history = await call(`/bookings/${first._id}`, customer.token); assert.equal(history.payments.length, 0); assert.equal(history.status, 'CANCELLED'); assert.equal(history.can_request_cancellation, false);
    await call(`/bookings/${first._id}/cancellations`, customer.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Already cancelled' }, 409);
    assert.equal((await call(`/bookings/vendor?cancellations=true&cancellation_status=APPROVED&q=${first.booking_code}`, vendor.token)).length, 1);
  });
  await checks('Price changes recompute new quotes but preserve previous order snapshots', async () => {
    await call(`/vendor/tickets/${service._id}/ticket-types/${adult._id}`, vendor.token, 'PUT', { price: 180000, description: 'Giá mới' });
    assert.equal((await call('/bookings/quote', customer.token, 'POST', { items: lines })).final_amount, 440000);
    await call('/bookings', customer.token, 'POST', { ...payload, request_id: crypto.randomUUID() }, 409);
    second = await call('/bookings', customer.token, 'POST', { ...payload, request_id: crypto.randomUUID(), expected_total: 440000 }, 201);
    const old = await call(`/bookings/${first._id}`, customer.token); assert.equal(old.final_amount, 380000); assert.equal(old.details.find(d => d.ticket_name === adult.name).unit_price, 150000);
    const fresh = await call(`/facilities/${facility._id}/ticket-availability?date=${date}`); assert.equal(fresh.find(s => s._id === service._id).ticket_types[0].price, 180000);
  });
  await checks('Multiple services in one order; scheduled inventory restored exactly once on approval', async () => {
    const inventoryService = await call(`/vendor/attractions/${facility._id}/tickets`, vendor.token, 'POST', { name: 'Scheduled Orders Test', ticket_types: [{ name: 'Scheduled Adult', price: 10000 }] }, 201);
    const inventory = await call(`/vendor/tickets/${inventoryService._id}/inventory`, vendor.token, 'PUT', { ticket_type_id: inventoryService.ticket_types[0]._id, target_date: date, time_slot: '10:00', total_qty: 10, uses_ticket_price: true });
    const secondService = facility.tickets.find(s => s.name === 'Trải nghiệm thứ hai');
    scheduled = await call('/bookings', customer.token, 'POST', { ...payload, request_id: crypto.randomUUID(), expected_total: 320000, items: [{ inventory_id: inventory._id, quantity: 2 }, { service_id: secondService._id, ticket_type_id: secondService.ticket_types[0]._id, visit_date: date, quantity: 1 }] }, 201);
    let rows = await call(`/vendor/tickets/${inventoryService._id}/inventory?from=${date}&to=${date}`, vendor.token); assert.equal(rows.find(r => r._id === inventory._id).available_qty, 8);
    scheduled = await call(`/bookings/${scheduled._id}/cancellations`, customer.token, 'POST', { request_id: crypto.randomUUID(), reason: 'Không thể tham gia' });
    const route = `/bookings/vendor/${scheduled._id}/cancellations/${scheduled.cancellation_requests[0]._id}`;
    await Promise.all([call(route, vendor.token, 'PATCH', { status: 'APPROVED' }), call(route, vendor.token, 'PATCH', { status: 'APPROVED' })]);
    rows = await call(`/vendor/tickets/${inventoryService._id}/inventory?from=${date}&to=${date}`, vendor.token); assert.equal(rows.find(r => r._id === inventory._id).available_qty, 10);
  });
  await checks('Attraction QR/settlement endpoints blocked; payment/refund endpoints absent', async () => {
    await call('/vendor/qr/scans', vendor.token, 'GET', undefined, 403); await call('/vendor/settlements', vendor.token, 'GET', undefined, 403);
    await call(`/bookings/${second._id}/collect-cash`, customer.token, 'POST', {}, 404); await call(`/bookings/${second._id}/refund`, vendor.token, 'POST', {}, 404);
  });
  const evidence = { at: new Date().toISOString(), api, vendorEmail, customerEmail, facilityId: facility._id, serviceId: service._id, bookingIds: [first._id, second._id, scheduled._id], checks: results };
  if (process.argv.includes('--verify-mongo')) {
    require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
    const mongoose = require('mongoose');
    try {
      await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false });
      const { Booking, BookingDetail, Payment } = require('../src/models');
      await checks('Current MongoDB readback: persisted orders/history/prices, no Payment or QR', async () => {
        const bookings = await Booking.find({ _id: { $in: evidence.bookingIds } }).lean(); assert.equal(bookings.length, 3);
        const savedFirst = bookings.find(b => String(b._id) === first._id); assert.equal(savedFirst.status, 'CANCELLED'); assert.equal(savedFirst.cancellation_requests.length, 2); assert.equal(savedFirst.cancellation_requests[0].decision_reason, 'Vui lòng xác nhận lại lịch trình'); assert.equal(savedFirst.cancellation_requests[1].status, 'APPROVED');
        const details = await BookingDetail.find({ booking_id: { $in: evidence.bookingIds } }).lean(); assert.equal(details.length, 6); assert.ok(details.every(d => !d.qr_code)); assert.equal(await Payment.countDocuments({ booking_id: { $in: evidence.bookingIds } }), 0);
        evidence.database = mongoose.connection.name;
        evidence.persistedOrders = bookings.map(b => ({ id: b._id, code: b.booking_code, status: b.status, total: b.final_amount, cancellationStatuses: b.cancellation_requests?.map(r => r.status) || [] }));
      });
    } finally { await mongoose.disconnect(); }
  }
  evidence.checks = results;
  fs.writeFileSync(path.join(__dirname, '../test/ticket-orders-results.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
