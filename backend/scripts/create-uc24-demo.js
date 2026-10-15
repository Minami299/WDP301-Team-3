// Usage: node scripts/create-uc24-demo.js --vendor vendor@example.com
// Seeds two historical demo orders in the existing database, including for an
// inactive facility. It does not change its selling status or create payments/QRs.
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { User, Facility, Service, ServiceInventory, Booking, BookingDetail, Payment } = require('../src/models');
const auth = require('../src/services/auth.service');
const bookings = require('../src/services/booking.service');
const { ticketTypesOf } = require('../src/services/ticketTypes');
const { today } = require('../src/utils/bookingDate');

async function main() {
  const index = process.argv.indexOf('--vendor');
  const email = index >= 0 ? process.argv[index + 1]?.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Vui lòng truyền --vendor email@example.com');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const vendor = await User.findOne({ email }).populate('role_id');
  if (!vendor || vendor.status !== 'ACTIVE' || vendor.role_id?.role_name !== 'ACTIVITY_VENDOR') throw Error('Không tìm thấy Attraction Vendor đang hoạt động với email này.');
  const facilities = await Facility.find({ vendor_id: vendor._id, type: 'ATTRACTION' }).lean();
  const services = await Service.find({ facility_id: { $in: facilities.map(f => f._id) }, type: 'TICKET' }).lean();
  const service = services.find(s => ticketTypesOf(s).some(t => t.status === 'ACTIVE'));
  if (!service) throw Error('Vendor cần có ít nhất một dịch vụ và hạng vé để tạo đơn demo.');
  const customerEmail = `uc24-demo-${vendor._id}@example.com`;
  let customer = await User.findOne({ email: customerEmail }).populate('role_id');
  if (!customer) {
    const password = crypto.randomBytes(24).toString('hex');
    const result = await auth.register({ full_name: 'Khách demo UC24', email: customerEmail, password, confirm_password: password, role_name: 'CUSTOMER' });
    customer = await User.findById(result.user.id).populate('role_id');
  }
  if (customer.status !== 'ACTIVE' || customer.role_id?.role_name !== 'CUSTOMER') throw Error('Tài khoản khách demo không hợp lệ.');
  const created = [];
  for (let n = 1; n <= 2; n++) {
    const requestId = `uc24-demo-${vendor._id}-0${n}`;
    let booking = await Booking.findOne({ customer_id: customer._id, request_id: requestId });
    if (!booking) {
      await mongoose.connection.transaction(async session => {
        const current = await Service.findById(service._id).session(session);
        const facility = await Facility.findOne({ _id: current?.facility_id, vendor_id: vendor._id, type: 'ATTRACTION' }).session(session);
        if (!facility || current.type !== 'TICKET') throw Error('Dịch vụ không còn thuộc Vendor này.');
        const types = ticketTypesOf(current).filter(t => t.status === 'ACTIVE');
        const adult = types.find(t => /lớn|adult/i.test(t.name)) || types[0];
        const child = types.find(t => /trẻ|child/i.test(t.name)) || types[1];
        if (!adult) throw Error('Dịch vụ không có hạng vé đang hoạt động.');
        const selected = n === 1 ? [{ type: adult, quantity: 2 }, ...(child ? [{ type: child, quantity: 1 }] : [])] : [{ type: adult, quantity: 1 }];
        const lines = [];
        for (const { type, quantity } of selected) {
          const calendarFilter = { service_id: current._id, $or: [{ ticket_type_id: type._id }, ...(String(type._id) === String(current._id) ? [{ ticket_type_id: null }] : [])] };
          const scheduled = await ServiceInventory.exists(calendarFilter).session(session);
          const inventory = scheduled ? await ServiceInventory.findOne({ ...calendarFilter, available_qty: { $gte: quantity }, target_date: { $gte: new Date(today()) } }).sort({ target_date: 1 }).session(session) : null;
          if (scheduled && !inventory) throw Error(`Hạng vé ${type.name} chưa có lịch còn vé từ hôm nay. Không tạo lịch hoặc tăng hạn mức tự động.`);
          if (inventory) {
            const reserved = await ServiceInventory.updateOne({ _id: inventory._id, available_qty: { $gte: quantity } }, { $inc: { available_qty: -quantity } }, { session });
            if (reserved.modifiedCount !== 1) throw Error('Tồn kho vừa thay đổi; vui lòng chạy lại.');
          }
          lines.push({ service_id: current._id, inventory_id: inventory?._id, ticket_type_id: type._id, ticket_name: type.name, service_name: current.name, facility_name: facility.name, quantity, unit_price: inventory && !inventory.uses_ticket_price ? inventory.price : type.price, ticket_description: type.description || '', ticket_conditions: type.conditions || '', min_age: type.min_age ?? null, max_age: type.max_age ?? null, visit_date: inventory?.target_date || new Date(today()), time_slot: inventory?.time_slot || 'ALL_DAY' });
        }
        const total = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
        const [saved] = await Booking.create([{ booking_code: `UC24-DEMO-${String(vendor._id).slice(-8).toUpperCase()}-0${n}`, request_id: requestId, vendor_id: vendor._id, customer_id: customer._id, guest_name: n === 1 ? 'Nguyễn Minh Anh (Demo UC24)' : 'Trần Hoàng Nam (Demo UC24)', guest_email: n === 1 ? 'minhanh.uc24@example.com' : 'hoangnam.uc24@example.com', guest_phone: n === 1 ? '0900000024' : '0900000025', total_amount: total, final_amount: total, status: 'PENDING' }], { session });
        await BookingDetail.insertMany(lines.map(line => ({ ...line, booking_id: saved._id })), { session });
        await Service.updateOne({ _id: current._id }, { $inc: { booking_revision: 1 } }, { session });
        booking = saved;
      });
    }
    // The second sample uses the existing cancellation workflow, including restock.
    if (n === 2 && booking.status === 'PENDING') {
      const requested = await bookings.requestCancellation(customer._id, booking._id, { request_id: `uc24-demo-cancel-${vendor._id}-02`, reason: 'Đơn mẫu UC24: khách thay đổi lịch tham quan.' });
      const request = requested.cancellation_requests.find(r => r.request_id === `uc24-demo-cancel-${vendor._id}-02`);
      await bookings.decideCancellation(vendor._id, String(booking._id), String(request._id), { status: 'APPROVED', reason: 'Chấp thuận hủy đơn mẫu UC24.' });
    }
    const verified = await bookings.vendorBooking(vendor._id, booking._id);
    assert.equal(await Payment.countDocuments({ booking_id: booking._id }), 0);
    assert.ok(verified.details.every(d => !d.qr_code));
    created.push({ id: verified._id, code: verified.booking_code, customer: verified.guest_name, status: verified.status, total: verified.final_amount, tickets: verified.details.map(d => ({ name: d.ticket_name, quantity: d.quantity, price: d.unit_price })), url: `http://localhost:5173/vendor/orders/${verified._id}` });
  }
  const visible = await bookings.listVendorBookings(vendor._id, { q: 'UC24-DEMO' });
  assert.ok(created.every(b => visible.some(v => String(v._id) === String(b.id))));
  console.log(JSON.stringify({ database: mongoose.connection.name, vendor: email, ordersPage: 'http://localhost:5173/vendor/orders', orders: created }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
