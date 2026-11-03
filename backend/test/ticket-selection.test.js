const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'ticket-selection-tests';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-unit-tests';
const { User, Service, ServiceInventory, Payment, Promotion } = require('../src/models');
const { quoteBooking, createBooking } = require('../src/services/booking.service');
const serviceId = '507f1f77bcf86cd799439011';
const adultId = '507f1f77bcf86cd799439012';
const childId = '507f1f77bcf86cd799439013';
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
afterEach(() => mock.restoreAll());
const setup = () => {
  mock.method(Service, 'find', () => ({ populate: async () => [{ _id: serviceId, name: 'Dịch vụ thật', facility_id: { _id: serviceId, name: 'Cơ sở', status: 'ACTIVE' }, ticket_types: [{ _id: adultId, name: 'Người lớn', price: 150000, status: 'ACTIVE' }, { _id: childId, name: 'Trẻ em', price: 80000, status: 'ACTIVE' }] }] }));
  mock.method(ServiceInventory, 'exists', async () => null);
  mock.method(User, 'findById', () => ({ select: () => ({ populate: async () => ({ status: 'ACTIVE', role_id: { role_name: 'CUSTOMER' }, total_loyalty_points: 0 }) }) }));
};
test('khách chọn trực tiếp nhiều hạng vé chưa có lịch bán, backend tự tính 380000', async () => {
  setup();
  const quote = await quoteBooking(serviceId, { items: [{ service_id: serviceId, ticket_type_id: adultId, quantity: 2, visit_date: date, price: 1 }, { service_id: serviceId, ticket_type_id: childId, quantity: 1, visit_date: date, price: 1 }] });
  assert.equal(quote.final_amount, 380000); assert.equal(quote.items.length, 2); assert.equal(quote.items[0].unit_price, 150000);
});
test('hạng vé đã có lịch riêng không được bỏ qua tồn kho bằng cách gửi ID trực tiếp', async () => {
  setup(); mock.method(ServiceInventory, 'exists', async () => ({ _id: adultId }));
  await assert.rejects(quoteBooking(serviceId, { items: [{ service_id: serviceId, ticket_type_id: adultId, quantity: 1, visit_date: date }] }), { statusCode: 409 });
});
test('số lượng sai hoặc hạng vé không thuộc dịch vụ bị từ chối', async () => {
  setup();
  await assert.rejects(quoteBooking(serviceId, { items: [{ service_id: serviceId, ticket_type_id: adultId, quantity: -1, visit_date: date }] }), { statusCode: 400 });
  await assert.rejects(quoteBooking(serviceId, { items: [{ service_id: serviceId, ticket_type_id: serviceId, quantity: 1, visit_date: date }] }), { statusCode: 409 });
});
test('scheduled vendor tickets retain voucher and loyalty discounts after catalog merge', async () => {
  setup();
  mock.method(User, 'findById', () => ({ select: () => ({ populate: async () => ({ status: 'ACTIVE', role_id: { role_name: 'CUSTOMER' }, total_loyalty_points: 10 }) }) }));
  mock.method(ServiceInventory, 'find', () => ({ populate: async () => [{
    _id: serviceId, available_qty: 2, price: 100000, target_date: new Date(date),
    ticket_type_id: adultId,
    service_id: { _id: serviceId, type: 'TICKET', name: 'Vendor ticket', facility_id: { _id: serviceId, status: 'ACTIVE', listing_mode: 'BOOKABLE' },
      ticket_types: [{ _id: adultId, name: 'Adult', price: 100000, status: 'ACTIVE' }] },
  }] }));
  mock.method(Promotion, 'findOne', async () => ({
    _id: childId, code: 'MERGE10', status: 'ACTIVE', target_audience: 'ALL', applicable_service: 'ATTRACTION',
    usage_limit: null, discount_type: 'PERCENTAGE', discount_value: 10, max_discount: null,
  }));
  const quote = await quoteBooking(serviceId, { items: [{ inventory_id: serviceId, quantity: 2 }], promotion_code: 'merge10', points_to_redeem: 2 });
  assert.equal(quote.subtotal, 200000);
  assert.equal(quote.promotion_discount_amount, 20000);
  assert.equal(quote.points_discount_amount, 2000);
  assert.equal(quote.final_amount, 178000);
});
test('thanh toán đang tạm ngưng: không xử lý CASH hoặc tạo Payment', async () => {
  const payment = mock.method(Payment, 'create', async () => { throw Error('Không được tạo thanh toán'); });
  await assert.rejects(createBooking(serviceId, { guest_name: 'Khách', guest_email: 'buyer@example.com', guest_phone: '0912345678', agree_conditions: true, payment_method: 'CASH' }), { statusCode: 400 });
  assert.equal(payment.mock.callCount(), 0);
});
