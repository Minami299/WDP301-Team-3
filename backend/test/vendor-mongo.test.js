const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
process.env.JWT_SECRET = 'vendor-mongo-integration-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/travelio_vendor_integration_test';
const mongoose = require('mongoose');
const express = require('express');
const { User, Role, Facility, Service, ServiceInventory, Booking, BookingDetail, Payment } = require('../src/models');
const { randomUUID } = require('node:crypto');
const { migrateTicketTypes } = require('../src/services/ticketMigration.service');
const bookingRoutes = require('../src/routes/booking.routes');
const facilityRoutes = require('../src/routes/facility.routes');
const authRoutes = require('../src/routes/auth.routes');
const vendorRoutes = require('../src/routes/vendor.routes');

test('MongoDB thật: wizard vendor, nhiều dịch vụ, transaction rollback, phân quyền và quản lý dịch vụ', { skip: !process.env.MONGOD_BINARY, timeout: 60000 }, async (t) => {
  const probe = net.createServer(); await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise((resolve) => probe.close(resolve));
  const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-vendor-mongo-'));
  const mongo = spawn(process.env.MONGOD_BINARY, ['--dbpath', dbPath, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'travelioTest', '--quiet', '--logpath', path.join(dbPath, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  let server;
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
    await mongoose.connect(`mongodb://127.0.0.1:${port}/travelio_vendor_integration_test?replicaSet=travelioTest`, { serverSelectionTimeoutMS: 5000 });
    await Role.create(['CUSTOMER', 'HOTEL_OWNER', 'ACTIVITY_VENDOR'].map((role_name) => ({ role_name })));
    await Promise.all([User.init(), Facility.init(), Service.init(), Booking.init(), BookingDetail.init(), Payment.init(), ServiceInventory.init()]);
    const app = express(); app.use(express.json());
    app.use('/api/auth', authRoutes); app.use('/api/vendor', vendorRoutes);
    app.use('/api/bookings', bookingRoutes); app.use('/api/facilities', facilityRoutes);
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message, errors: error.errors || [] }));
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (route, body, token, method = 'POST') => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, ...(await response.json()) };
    };
    const signup = {
      full_name: 'Vendor Mongo', email: 'vendor@example.com', password: 'password123', confirm_password: 'password123', agree_terms: true,
      role_name: 'ACTIVITY_VENDOR', facility_name: '  Travelio Tours  ', facility_address: '123 Trần Phú', facility_city: 'Đà Nẵng', phone: '+84 912 345 678', business_type: 'MULTIPLE_SERVICES',
      services: [
        { name: 'Tour Hội An', service_category: 'TOUR', location: 'Hội An', description: 'Tour phố cổ', base_price: 150000, pricing_unit: 'PERSON', duration_minutes: 120, photos: ['https://example.com/tour.jpg'] },
        { name: 'Vé miễn phí', service_category: 'TICKET', base_price: 0, pricing_unit: 'TICKET' }
      ]
    };
    for (const [patch, field] of [
      [{ services: [] }, 'services'],
      [{ services: [{ name: '', base_price: 150000 }] }, 'services.0.name'],
      [{ services: [{ name: 'Vé', base_price: -1 }] }, 'services.0.base_price'],
      [{ services: [{ name: 'Vé', base_price: '' }] }, 'services.0.base_price'],
      [{ services: [{ name: 'Vé' }] }, 'services.0.base_price'],
      [{ services: [{ name: 'Vé', base_price: null }] }, 'services.0.base_price'],
      [{ services: [{ name: 'Vé', base_price: '150,000' }] }, 'services.0.base_price'],
      [{ services: [{ name: 'Vé', base_price: '150.000 VND' }] }, 'services.0.base_price'],
      [{ services: [signup.services[0], { name: '', base_price: 0 }] }, 'services.1.name'],
      [{ facility_address: '' }, 'facility_address'], [{ agree_terms: false }, 'agree_terms']
    ]) {
      const rejected = await request('/auth/register', { ...signup, ...patch });
      assert.equal(rejected.status, 400);
      assert.ok(rejected.errors.some((item) => item.field === field));
      assert.notEqual(rejected.message, 'Vui lòng điền đầy đủ thông tin dịch vụ cung cấp (tên dịch vụ và giá)');
      assert.equal(await User.countDocuments(), 0); assert.equal(await Facility.countDocuments(), 0); assert.equal(await Service.countDocuments(), 0);
    }
    // Lỗi sau khi user, cơ sở và dịch vụ đầu tiên đã được ghi trong transaction.
    const insertMany = Service.insertMany.bind(Service);
    mock.method(Service, 'insertMany', async (docs, options) => { await insertMany([docs[0]], options); throw Error('Simulated service failure after first insert'); });
    const failed = await request('/auth/register', signup);
    assert.equal(failed.status, 500);
    assert.equal(await User.countDocuments(), 0); assert.equal(await Facility.countDocuments(), 0); assert.equal(await Service.countDocuments(), 0);
    mock.restoreAll();
    await bootstrap.close();
    const registered = await request('/auth/register', signup);
    assert.equal(registered.status, 201); assert.equal(registered.user.role, 'ACTIVITY_VENDOR');
    const user = await User.findById(registered.user.id).populate('role_id');
    assert.equal(user.role_id.role_name, 'ACTIVITY_VENDOR'); assert.notEqual(user.password_hash, signup.password);
    const facility = await Facility.findOne({ vendor_id: user._id });
    assert.equal(facility.name, 'Travelio Tours'); assert.equal(facility.business_type, 'MULTIPLE_SERVICES'); assert.equal(facility.contact_phone, signup.phone); assert.equal(facility.status, 'ACTIVE');
    const services = await Service.find({ facility_id: facility._id }).sort({ base_price: -1 });
    assert.equal(services.length, 2); assert.equal(services[0].service_category, 'TOUR'); assert.equal(services[0].duration_minutes, 120); assert.equal(services[1].base_price, 0); assert.equal(services[0].pricing_unit, 'PERSON'); assert.deepEqual(services[0].photos, signup.services[0].photos);
    assert.equal(await ServiceInventory.countDocuments(), 0);
    assert.equal((await request('/auth/register', signup)).status, 409);
    const login = await request('/auth/login', { email: signup.email, password: signup.password });
    assert.equal(login.status, 200); assert.ok(login.user.permissions.includes('vendor.dashboard'));
    assert.equal((await request('/vendor/dashboard', null, login.token, 'GET')).status, 200);
    const listed = await request('/vendor/attractions', null, login.token, 'GET');
    assert.equal(listed.data[0].tickets.length, 2);
    // Tái hiện payload thật của Review: không gửi trường dịch vụ cấp cao nhất.
    const sapaService = { ...signup.services[0], name: 'Khám Phá Sapa', location: 'Sapa', pricing_unit: 'TICKET' };
    const sapa = await request('/auth/register', { ...signup, email: 'sapa@example.com', services: [sapaService] });
    assert.equal(sapa.status, 201);
    const sapaFacility = await Facility.findOne({ vendor_id: sapa.user.id });
    const sapaStored = await Service.find({ facility_id: sapaFacility._id });
    assert.equal(sapaStored.length, 1); assert.equal(sapaStored[0].name, 'Khám Phá Sapa');
    assert.equal(sapaStored[0].base_price, 150000); assert.equal(typeof sapaStored[0].base_price, 'number');
    assert.deepEqual(sapaStored[0].photos, sapaService.photos);
    const sapaLogin = await request('/auth/login', { email: 'sapa@example.com', password: signup.password });
    assert.equal(sapaLogin.status, 200); assert.equal(sapaLogin.user.role, 'ACTIVITY_VENDOR');
    const sapaDashboard = await request('/vendor/attractions', null, sapaLogin.token, 'GET');
    assert.equal(sapaDashboard.status, 200); assert.equal(sapaDashboard.data[0].tickets[0].base_price, 150000);
    const invalidTicket = await request(`/vendor/attractions/${facility._id}/tickets`, { name: '', base_price: '' }, login.token);
    assert.equal(invalidTicket.status, 400);
    const ticket = await request(`/vendor/attractions/${facility._id}/tickets`, { name: 'Dịch vụ bổ sung', base_price: 0 }, login.token);
    assert.equal(ticket.status, 201);
    const updated = await request(`/vendor/tickets/${ticket.data._id}`, { name: 'Dịch vụ đã cập nhật', base_price: 180000, service_category: 'EXPERIENCE', location: 'Đà Nẵng', pricing_unit: 'PACKAGE', duration_minutes: 60 }, login.token, 'PUT');
    assert.equal(updated.status, 200); assert.equal(updated.data.base_price, 180000); assert.equal(updated.data.location, 'Đà Nẵng');
    assert.equal((await request(`/vendor/tickets/${ticket.data._id}`, null, login.token, 'DELETE')).status, 200);
    assert.equal(await Service.countDocuments({ facility_id: facility._id }), 2);
    const inventory = await ServiceInventory.create({ service_id: services[0]._id, target_date: new Date('2026-10-20'), time_slot: 'ALL_DAY', available_qty: 9, price: 150000 });
    const booking = await Booking.create({ booking_code: 'TEST-BOOKING', guest_name: 'Khách thử nghiệm', guest_email: 'guest@example.com', guest_phone: '0912345678', status: 'CONFIRMED' });
    await BookingDetail.create({ booking_id: booking._id, inventory_id: inventory._id, quantity: 1, unit_price: 150000 });
    assert.equal((await request(`/vendor/tickets/${services[0]._id}`, null, login.token, 'DELETE')).status, 409);
    for (const businessType of ['ATTRACTION', 'TOUR', 'TICKET']) assert.equal((await request('/auth/register', { ...signup, email: `${businessType.toLowerCase()}@example.com`, business_type: businessType })).status, 201);
    const other = await request('/auth/login', { email: 'tour@example.com', password: signup.password });
    assert.equal((await request(`/vendor/tickets/${services[0]._id}`, null, other.token, 'DELETE')).status, 404);
    const customer = await request('/auth/register', { full_name: 'Customer', email: 'customer@example.com', password: signup.password });
    assert.equal(customer.status, 201); assert.equal(await Facility.countDocuments({ vendor_id: customer.user.id }), 0);
    assert.equal((await request('/vendor/attractions', null, customer.token, 'GET')).status, 403);
    const upgrade = await request('/auth/become-partner', { ...signup }, customer.token);
    assert.equal(upgrade.status, 200); assert.equal(upgrade.user.role, 'ACTIVITY_VENDOR');
    const customerFacility = await Facility.findOne({ vendor_id: customer.user.id });
    assert.equal(await Service.countDocuments({ facility_id: customerFacility._id }), 2);
    const hotel = await request('/auth/register', { full_name: 'Hotel Owner', email: 'hotel@example.com', password: signup.password, role_name: 'HOTEL_OWNER', facility_name: 'Khách sạn', facility_address: '123 Trần Phú', facility_city: 'Đà Nẵng', service_name: 'Phòng Deluxe', service_price: 500000 });
    assert.equal(hotel.status, 201); const hotelFacility = await Facility.findOne({ vendor_id: hotel.user.id }); assert.equal(hotelFacility.type, 'HOTEL'); assert.equal(await Service.countDocuments({ facility_id: hotelFacility._id, type: 'ROOM' }), 1);
    const concurrent = await Promise.all([request('/auth/register', { ...signup, email: 'concurrent@example.com' }), request('/auth/register', { ...signup, email: 'concurrent@example.com' })]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [201, 409]);
    const concurrentUser = await User.findOne({ email: 'concurrent@example.com' });
    assert.equal(await Facility.countDocuments({ vendor_id: concurrentUser._id }), 1);
    const concurrentFacility = await Facility.findOne({ vendor_id: concurrentUser._id });
    assert.equal(await Service.countDocuments({ facility_id: concurrentFacility._id }), 2);

    await t.test('migration bổ sung hạng vé cũ, giữ lịch bán/đơn cũ và chạy lại an toàn', async () => {
      await ServiceInventory.collection.createIndex({ service_id: 1, target_date: 1, time_slot: 1 }, { unique: true });
      const before = await BookingDetail.findOne({ inventory_id: inventory._id }).lean();
      const dry = await migrateTicketTypes(); assert.ok(dry.legacy_services > 0);
      assert.equal((await Service.findById(services[0]._id)).ticket_types, undefined);
      const applied = await migrateTicketTypes({ apply: true }); assert.equal(applied.inventory_index_updated, true);
      const migratedService = await Service.findById(services[0]._id);
      assert.equal(migratedService.ticket_types.length, 1); assert.equal(String(migratedService.ticket_types[0]._id), String(migratedService._id));
      const migratedInventory = await ServiceInventory.findById(inventory._id);
      assert.equal(migratedInventory.price, 150000); assert.equal(migratedInventory.available_qty, 9); assert.equal(migratedInventory.uses_ticket_price, false);
      const after = await BookingDetail.findById(before._id);
      assert.equal(after.unit_price, before.unit_price); assert.equal(after.quantity, before.quantity); assert.equal(String(after.inventory_id), String(before.inventory_id));
      const again = await migrateTicketTypes({ apply: true }); assert.equal(again.legacy_services, 0); assert.equal(again.inventories, 0); assert.equal(again.booking_details, 0);
    });

    const typedService = { name: 'Khám Phá Sapa', service_category: 'TOUR', location: 'Sapa', pricing_unit: 'TICKET', ticket_types: [
      { name: 'Người lớn', price: 150000, min_age: 18, conditions: 'Xuất trình vé tại điểm tập trung' },
      { name: 'Trẻ em', price: 80000, min_age: 6, max_age: 17 },
      { name: 'Miễn phí', price: 0, max_age: 5 }
    ] };
    await t.test('đăng ký một dịch vụ nhiều hạng vé không có base_price cấp dịch vụ', async () => {
      const single = await request('/auth/register', { ...signup, email: 'single-types@example.com', services: [typedService] });
      assert.equal(single.status, 201);
      const f = await Facility.findOne({ vendor_id: single.user.id }); const s = await Service.findOne({ facility_id: f._id });
      assert.equal(await Service.countDocuments({ facility_id: f._id }), 1); assert.equal(s.ticket_types.length, 3); assert.equal(s.base_price, 0);
      assert.equal(new Set(s.ticket_types.map(x => String(x._id))).size, 3);
    });
    const typed = await request('/auth/register', { ...signup, email: 'typed@example.com', services: [typedService, { name: 'Dịch vụ thứ hai', service_category: 'TICKET', ticket_types: [{ name: 'Thường', price: 40000 }, { name: 'Đặc biệt', price: 90000 }] }] });
    let typedFacility; let typedServices; let main; let adult; let child; let free; let schedules;
    await t.test('nhiều dịch vụ mỗi dịch vụ có các ID hạng vé riêng trong MongoDB', async () => {
      assert.equal(typed.status, 201); typedFacility = await Facility.findOne({ vendor_id: typed.user.id });
      typedServices = await Service.find({ facility_id: typedFacility._id }); assert.equal(typedServices.length, 2);
      main = typedServices.find(s => s.name === typedService.name); [adult, child, free] = main.ticket_types;
      assert.equal(main.ticket_types.length, 3); assert.equal(typedServices.find(s => s._id !== main._id).ticket_types.length, 2);
      assert.equal(new Set(typedServices.flatMap(s => s.ticket_types.map(x => String(x._id)))).size, 5);
      const activate = await request(`/vendor/attractions/${typedFacility._id}`, { name: typedFacility.name, address: typedFacility.address, city: typedFacility.city, description: '', status: 'ACTIVE' }, typed.token, 'PUT'); assert.equal(activate.status, 200);
    });
    await t.test('validation tên trùng, thiếu tên/giá, giá sai và khoảng tuổi sai', async () => {
      for (const [ticketTypes, field] of [
        [[], 'services.0.ticket_types'], [[{ name: '', price: 1 }], 'services.0.ticket_types.0.name'],
        [[{ name: 'Vé' }], 'services.0.ticket_types.0.price'], [[{ name: 'Vé', price: -1 }], 'services.0.ticket_types.0.price'],
        [[{ name: 'Vé', price: '150,000' }], 'services.0.ticket_types.0.price'],
        [[{ name: 'Vé', price: 1, min_age: 18, max_age: 6 }], 'services.0.ticket_types.0.max_age'],
        [[{ name: 'Người lớn', price: 1 }, { name: '  NGƯỜI   LỚN ', price: 2 }], 'services.0.ticket_types.1.name']
      ]) { const invalid = await request('/auth/register', { ...signup, services: [{ ...typedService, ticket_types: ticketTypes }] }); assert.equal(invalid.status, 400); assert.ok(invalid.errors.some(e => e.field === field)); }
    });
    await t.test('CRUD từng hạng vé và ngăn Vendor khác sửa', async () => {
      const added = await request(`/vendor/tickets/${main._id}/ticket-types`, { name: 'Hạng tùy chọn', price: 70000 }, typed.token); assert.equal(added.status, 201);
      const changed = await request(`/vendor/tickets/${main._id}/ticket-types/${added.data._id}`, { price: 75000, conditions: 'Điều kiện riêng' }, typed.token, 'PUT'); assert.equal(changed.status, 200); assert.equal(changed.data.price, 75000);
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${adult._id}`, { price: 1 }, other.token, 'PUT')).status, 404);
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types`, { name: ' người lớn ', price: 1 }, typed.token)).status, 400);
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${added.data._id}`, null, typed.token, 'DELETE')).status, 200);
      assert.equal((await Service.findById(main._id)).ticket_types.length, 3);
    });
    const visit = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    await t.test('lịch bán và tồn kho riêng cho từng hạng vé cùng ngày/khung giờ', async () => {
      schedules = [];
      for (const type of [adult, child, free]) { const r = await request(`/vendor/tickets/${main._id}/inventory`, { ticket_type_id: type._id, target_date: visit, total_qty: 10, uses_ticket_price: true }, typed.token, 'PUT'); assert.equal(r.status, 200); schedules.push(r.data); }
      assert.equal(await ServiceInventory.countDocuments({ service_id: main._id, target_date: new Date(visit) }), 3);
      const publicData = await request(`/facilities/${typedFacility._id}/ticket-availability?date=${visit}`, null, null, 'GET'); assert.equal(publicData.status, 200); assert.equal(publicData.data.find(s => s.name === main.name).ticket_types.length, 3);
      assert.equal((await request(`/vendor/tickets/${main._id}/inventory`, { ticket_type_id: typedServices.find(s => s.name === 'Dịch vụ thứ hai').ticket_types[0]._id, target_date: visit, total_qty: 1, price: 1 }, typed.token, 'PUT')).status, 404);
    });
    const buyer = await request('/auth/register', { full_name: 'Khách mua vé', email: 'buyer@example.com', password: signup.password });
    const items = () => [{ inventory_id: schedules[0]._id, quantity: 2 }, { inventory_id: schedules[1]._id, quantity: 1 }];
    const orderPayload = () => ({ guest_name: 'Khách mua vé', guest_email: 'buyer@example.com', guest_phone: '0912345678', items: items(), agree_conditions: true, request_id: randomUUID() });
    let order;
    await t.test('lỗi ghi chi tiết yêu cầu rollback toàn bộ và hoàn tồn kho', async () => {
      const beforeCount = await Booking.countDocuments(); const beforeQty = (await ServiceInventory.findById(schedules[0]._id)).available_qty;
      mock.method(BookingDetail, 'insertMany', async () => { throw Error('Booking detail storage failed'); });
      try { const failed = await request('/bookings', orderPayload(), buyer.token); assert.equal(failed.status, 500); assert.equal(await Booking.countDocuments(), beforeCount); assert.equal((await ServiceInventory.findById(schedules[0]._id)).available_qty, beforeQty); }
      finally { mock.restoreAll(); }
    });
    await t.test('mua nhiều hạng vé: backend tính 380000, lưu snapshot và trừ tồn kho', async () => {
      const quote = await request('/bookings/quote', { items: items(), final_amount: 1 }, buyer.token); assert.equal(quote.status, 200, quote.message); assert.equal(quote.data.final_amount, 380000);
      const input = { ...orderPayload(), final_amount: 1, expected_total: 380000 };
      const r = await request('/bookings', input, buyer.token); assert.equal(r.status, 201); order = r.data;
      assert.equal(order.final_amount, 380000); assert.equal(order.details.length, 2); assert.equal(order.status, 'PENDING'); assert.equal(order.payments.length, 0);
      assert.equal(order.details.find(d => d.ticket_name === 'Người lớn').unit_price, 150000); assert.equal(order.details.find(d => d.ticket_name === 'Trẻ em').unit_price, 80000);
      assert.equal((await ServiceInventory.findById(schedules[0]._id)).available_qty, 8); assert.equal((await ServiceInventory.findById(schedules[1]._id)).available_qty, 9);
      const repeated = await request('/bookings', input, buyer.token); assert.equal(repeated.data._id, order._id); assert.equal((await ServiceInventory.findById(schedules[0]._id)).available_qty, 8);
    });
    await t.test('đổi tên/giá sau khi đặt giữ giá, tên và điều kiện của đơn cũ', async () => {
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${adult._id}`, { name: 'Người lớn mới', price: 180000, conditions: 'Điều kiện mới' }, typed.token, 'PUT')).status, 200);
      const quote = await request('/bookings/quote', { items: items() }, buyer.token); assert.equal(quote.data.final_amount, 440000);
      const old = await request(`/bookings/${order._id}`, null, buyer.token, 'GET'); assert.equal(old.status, 200); assert.equal(old.data.final_amount, 380000);
      const savedAdult = old.data.details.find(d => d.ticket_name === 'Người lớn'); assert.equal(savedAdult.unit_price, 150000); assert.equal(savedAdult.ticket_conditions, typedService.ticket_types[0].conditions);
      assert.equal((await request('/bookings', { ...orderPayload(), expected_total: 380000 }, buyer.token)).status, 409);
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${adult._id}`, null, typed.token, 'DELETE')).status, 409);
    });
    await t.test('Vendor thấy yêu cầu mua vé, phân quyền và thanh toán đang tạm ngưng', async () => {
      assert.equal((await request(`/bookings/${order._id}/collect-cash`, {}, typed.token)).status, 404);
      assert.equal(await Payment.countDocuments({ booking_id: order._id }), 0);
      assert.equal((await request('/bookings/vendor', null, typed.token, 'GET')).data.some(b => b._id === order._id), true);
      assert.equal((await request('/bookings/vendor', null, other.token, 'GET')).data.some(b => b._id === order._id), false);
      assert.equal((await request(`/bookings/${order._id}`, null, customer.token, 'GET')).status, 404);
    });
    await t.test('vé miễn phí lưu giá 0 nhưng không tự tạo thanh toán hay mã vé', async () => {
      const r = await request('/bookings', { ...orderPayload(), items: [{ inventory_id: schedules[2]._id, quantity: 1 }] }, buyer.token); assert.equal(r.status, 201); assert.equal(r.data.final_amount, 0); assert.equal(r.data.payments.length, 0); assert.equal(r.data.details[0].qr_code, undefined);
      assert.equal((await request('/vendor/dashboard', null, typed.token, 'GET')).status, 200);
    });
    await t.test('đặt đồng thời cùng request_id chỉ tạo một đơn và trừ tồn kho một lần', async () => {
      const before = (await ServiceInventory.findById(schedules[2]._id)).available_qty;
      const input = { ...orderPayload(), items: [{ inventory_id: schedules[2]._id, quantity: 1 }] };
      const results = await Promise.all([request('/bookings', input, buyer.token), request('/bookings', input, buyer.token)]);
      assert.ok(results.every(r => r.status === 201), results.map(r => r.message).join('; ')); assert.equal(results[0].data._id, results[1].data._id);
      assert.equal((await ServiceInventory.findById(schedules[2]._id)).available_qty, before - 1);
      assert.equal(await Payment.countDocuments({ booking_id: results[0].data._id }), 0);
    });
    await t.test('giá riêng theo ngày giữ nguyên khi thay đổi giá cơ bản của hạng vé', async () => {
      const calendar = await request(`/vendor/tickets/${main._id}/inventory`, { inventory_id: schedules[0]._id, ticket_type_id: adult._id, target_date: visit, total_qty: 10, price: 175000, uses_ticket_price: false }, typed.token, 'PUT'); assert.equal(calendar.status, 200);
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${adult._id}`, { price: 190000 }, typed.token, 'PUT')).status, 200);
      assert.equal((await request('/bookings/quote', { items: [{ inventory_id: schedules[0]._id, quantity: 1 }] }, buyer.token)).data.final_amount, 175000);
    });
    await t.test('tài khoản bị khóa và token cũ của Vendor bị chặn đặt/xem đơn', async () => {
      await User.updateOne({ _id: buyer.user.id }, { $set: { status: 'LOCKED' } });
      assert.equal((await request('/bookings/quote', { items: [{ inventory_id: schedules[2]._id, quantity: 1 }] }, buyer.token)).status, 403);
      await User.updateOne({ _id: buyer.user.id }, { $set: { status: 'ACTIVE' } });
      await User.updateOne({ _id: typed.user.id }, { $set: { status: 'LOCKED' } });
      assert.equal((await request('/bookings/vendor', null, typed.token, 'GET')).status, 403);
      await User.updateOne({ _id: typed.user.id }, { $set: { status: 'ACTIVE' } });
    });
    await t.test('ngừng bán chặn đơn mới; chống vượt tồn kho khi đặt đồng thời', async () => {
      assert.equal((await request(`/vendor/tickets/${main._id}/ticket-types/${child._id}`, { status: 'INACTIVE' }, typed.token, 'PUT')).status, 200);
      assert.equal((await request('/bookings/quote', { items: [{ inventory_id: schedules[1]._id, quantity: 1 }] }, buyer.token)).status, 409);
      const remaining = (await ServiceInventory.findById(schedules[0]._id)).available_qty;
      const concurrentOrders = await Promise.all([1, 2].map(() => request('/bookings', { ...orderPayload(), items: [{ inventory_id: schedules[0]._id, quantity: remaining }] }, buyer.token)));
      assert.deepEqual(concurrentOrders.map(r => r.status).sort(), [201, 409]); assert.equal((await ServiceInventory.findById(schedules[0]._id)).available_qty, 0);
    });
    await t.test('xóa dịch vụ đồng thời với đặt vé không làm mất liên kết đơn/tồn kho', async () => {
      const created = await request(`/vendor/attractions/${typedFacility._id}/tickets`, { name: 'Dịch vụ kiểm thử xóa', service_category: 'TICKET', ticket_types: [{ name: 'Vé thử', price: 0 }] }, typed.token); assert.equal(created.status, 201);
      const serviceId = created.data._id;
      const inventory = await request(`/vendor/tickets/${serviceId}/inventory`, { ticket_type_id: created.data.ticket_types[0]._id, target_date: visit, total_qty: 1, uses_ticket_price: true }, typed.token, 'PUT'); assert.equal(inventory.status, 200);
      const [booked, deleted] = await Promise.all([
        request('/bookings', { ...orderPayload(), items: [{ inventory_id: inventory.data._id, quantity: 1 }] }, buyer.token),
        request(`/vendor/tickets/${serviceId}`, null, typed.token, 'DELETE')
      ]);
      if (booked.status === 201) { assert.equal(deleted.status, 409); assert.ok(await Service.findById(serviceId)); assert.ok(await ServiceInventory.findById(inventory.data._id)); }
      else { assert.ok([404, 409].includes(booked.status), booked.message); assert.equal(deleted.status, 200); assert.equal(await BookingDetail.countDocuments({ inventory_id: inventory.data._id }), 0); }
    });
  } finally {
    mock.restoreAll();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1) { try { await mongoose.connection.db.admin().command({ shutdown: 1 }); } catch {} }
    await mongoose.disconnect(); mongo.kill();
  }
});
