const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'ticket-selection-tests';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/not-connected-unit-tests';
const { User, Service, ServiceInventory, Payment } = require('../src/models');
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
test('thanh toán đang tạm ngưng: không xử lý CASH hoặc tạo Payment', async () => {
  const payment = mock.method(Payment, 'create', async () => { throw Error('Không được tạo thanh toán'); });
  await assert.rejects(createBooking(serviceId, { guest_name: 'Khách', guest_email: 'buyer@example.com', guest_phone: '0912345678', agree_conditions: true, payment_method: 'CASH' }), { statusCode: 400 });
  assert.equal(payment.mock.callCount(), 0);
});
