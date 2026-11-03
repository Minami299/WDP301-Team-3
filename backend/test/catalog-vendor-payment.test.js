const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
process.env.JWT_SECRET = 'vendor-mongo-integration-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/travelio_catalog_payment_test';
process.env.CLOUDINARY_CLOUD_NAME = 'travelio-test';
const mongoose = require('mongoose');
const { User, Role, Facility, Service, ServiceInventory, Booking, BookingDetail, Payment } = require('../src/models');
const { randomUUID } = require('node:crypto');

test('vendor catalog tickets reuse booking, stock and PayOS confirmation', { skip: !process.env.MONGOD_BINARY, timeout: 60000 }, async () => {
  const probe = net.createServer(); await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise((resolve) => probe.close(resolve));
  const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-vendor-mongo-'));
  const mongo = spawn(process.env.MONGOD_BINARY, ['--dbpath', dbPath, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'travelioTest', '--quiet', '--logpath', path.join(dbPath, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  const bootstrap = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      try { await bootstrap.connect(); break; }
      catch (error) { if (attempt === 29) throw error; }
    }
    await bootstrap.db('admin').command({ replSetInitiate: { _id: 'travelioTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await bootstrap.db('admin').command({ hello: 1 })).isWritablePrimary) break;
      if (attempt === 99) throw Error('Test replica set failed to become primary');
      await delay(100);
    }
    await bootstrap.close();
    await mongoose.connect(`mongodb://127.0.0.1:${port}/travelio_catalog_payment_test?replicaSet=travelioTest`, { serverSelectionTimeoutMS: 5000 });

    const attraction = require('../src/services/attraction.service');
    const bookings = require('../src/services/booking.service');
    const payments = require('../src/services/payment.service');
    const { today } = require('../src/utils/bookingDate');
    await Promise.all([Facility.init(), Service.init(), ServiceInventory.init(), Booking.init(), BookingDetail.init(), Payment.init()]);
    const vendor = { id: new mongoose.Types.ObjectId() }, customer = new mongoose.Types.ObjectId();
    const role = await Role.create({ role_name: 'CUSTOMER' });
    await User.create({ _id: customer, email: 'buyer@example.test', full_name: 'Test buyer', password_hash: 'unused-test-hash', role_id: role._id });
    const facility = await Facility.create({ vendor_id: vendor.id, type: 'ATTRACTION', listing_mode: 'INFORMATIONAL', catalog_key: 'isolated-fixture', name: 'Isolated fixture', address: 'Test address', city: 'Test city', status: 'ACTIVE' });
    const service = await Service.create({ facility_id: facility._id, type: 'TICKET', name: 'Vendor ticket', informational_only: true, ticket_types: [{ name: 'Adult', price: 80000, status: 'INACTIVE' }] });
    const type = service.ticket_types[0];
    const payload = { name: service.name, ticket_types: service.ticket_types.map(t => t.toObject()) };
    await assert.rejects(attraction.updateTicket({ id: customer }, service._id, payload), { statusCode: 404 });
    await attraction.updateTicket(vendor, service._id, payload);
    assert.equal((await Facility.findById(facility._id)).listing_mode, 'BOOKABLE');
    assert.equal((await Service.findById(service._id)).informational_only, false);
    const date = today();
    const stock = await attraction.saveInventory(vendor, service._id, { ticket_type_id: String(type._id), target_date: date, total_qty: 0, uses_ticket_price: true });
    const item = { inventory_id: String(stock._id), quantity: 1 };
    const order = () => ({ guest_name: 'Test buyer', guest_email: 'buyer@example.test', guest_phone: '0912345678', agree_conditions: true, request_id: randomUUID(), expected_total: 80000, items: [item] });
    await assert.rejects(bookings.createBooking(customer, order()), { statusCode: 409 });
    await attraction.updateTicketType(vendor, service._id, String(type._id), { status: 'ACTIVE' });
    await assert.rejects(bookings.createBooking(customer, order()), { statusCode: 409 });
    await attraction.saveInventory(vendor, service._id, { ticket_type_id: String(type._id), target_date: date, total_qty: 2, uses_ticket_price: true });
    const available = await attraction.publicAvailability(facility._id, { date });
    assert.equal(available[0].ticket_types[0].schedules[0].available_qty, 2);
    await assert.rejects(bookings.quoteBooking(customer, { items: [{ service_id: String(service._id), ticket_type_id: String(type._id), visit_date: date, quantity: 1 }] }), { statusCode: 409 });
    const purchase = order();
    const booking = await bookings.createBooking(customer, purchase);
    assert.equal(booking.status, 'PENDING');
    assert.equal(String(booking.vendor_id), String(vendor.id));
    assert.equal((await ServiceInventory.findById(stock._id)).available_qty, 1);
    assert.equal((await BookingDetail.findOne({ booking_id: booking._id })).qr_code, undefined);
    assert.equal(await Payment.countDocuments(), 0);
    assert.equal(String((await bookings.createBooking(customer, purchase))._id), String(booking._id));
    let paid = false, sent;
    process.env.PAYOS_CLIENT_ID = process.env.PAYOS_API_KEY = process.env.PAYOS_CHECKSUM_KEY = 'isolated-test';
    payments.setClientForTests({ paymentRequests: {
      create: async args => { sent = args; return { paymentLinkId: 'isolated-link', checkoutUrl: 'https://example.test/pay', qrCode: 'isolated-payment-qr', bin: '970422', accountNumber: 'test', accountName: 'Test' }; },
      get: async code => ({ orderCode: code, status: paid ? 'PAID' : 'PENDING', transactions: paid ? [{ amount: 80000, reference: 'ISOLATED-1', description: 'Test bank payment' }] : [] }),
    } });
    const link = await payments.getPaymentInfo(customer, booking._id);
    assert.equal(link.amount, 80000); assert.equal(sent.amount, 80000);
    assert.ok(sent.returnUrl.includes('/my-trips/' + booking._id));
    assert.equal((await payments.verifyPayment(customer, booking._id)).booking_status, 'PENDING');
    paid = true;
    assert.equal((await payments.verifyPayment(customer, booking._id)).booking_status, 'CONFIRMED');
    assert.match((await BookingDetail.findOne({ booking_id: booking._id })).qr_code, /^TVL-QR-/);
    await payments.verifyPayment(customer, booking._id);
    assert.equal(await Payment.countDocuments({ booking_id: booking._id, status: 'SUCCESS' }), 1);
    assert.equal((await Booking.findById(booking._id)).final_amount, 80000);
    assert.equal((await bookings.vendorBooking(vendor.id, booking._id)).status, 'CONFIRMED');
    await assert.rejects(bookings.vendorBooking(new mongoose.Types.ObjectId(), booking._id), { statusCode: 404 });
    // Creating a new service uses the same publication path, without losing the old draft.
    const second = await Facility.create({ vendor_id: vendor.id, type: 'ATTRACTION', listing_mode: 'INFORMATIONAL', name: 'Second fixture', address: 'Test address', city: 'Test city', status: 'ACTIVE' });
    const created = await attraction.createTicket(vendor, second._id, { name: 'Created through vendor', ticket_types: [{ name: 'Adult', price: 90000, status: 'INACTIVE' }] });
    assert.equal(created.informational_only, false);
    assert.equal((await Facility.findById(second._id)).listing_mode, 'BOOKABLE');
  } finally {
    if (mongoose.connection.readyState === 1) { try { await mongoose.connection.db.admin().command({ shutdown: 1 }); } catch {} }
    await mongoose.disconnect(); mongo.kill();
  }
});
