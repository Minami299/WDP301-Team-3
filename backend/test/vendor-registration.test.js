const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'vendor-registration-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/vendor-registration-test';
process.env.CLOUDINARY_CLOUD_NAME = 'travelio-test';
const mongoose = require('mongoose');
const { User, Role, Facility, Service } = require('../src/models');
const email = require('../src/services/email.service');
const auth = require('../src/services/auth.service');
const { hashPassword } = require('../src/utils/password');
const { normalizeServices } = require('../src/services/vendorServiceFields');
const Application = require('../src/models/PartnerApplication');
const { query, draftSetup } = require('./partner-fixtures.cjs');

afterEach(() => mock.restoreAll());
const role = { _id: '507f1f77bcf86cd799439012', role_name: 'ACTIVITY_VENDOR' };
const userId = '507f1f77bcf86cd799439011';
const facilityId = '507f1f77bcf86cd799439014';
const sampleService = { name: 'Tour Hội An', service_category: 'TOUR', location: 'Hội An', base_price: 150000, pricing_unit: 'PERSON', duration_minutes: 120, photos: ['https://res.cloudinary.com/travelio-test/image/upload/v1/travelio/attractions/tour.jpg'] };
const payload = { full_name: 'Vendor mới', email: 'vendor@example.com', password: 'password123', confirm_password: 'password123', agree_terms: true, role_name: 'ACTIVITY_VENDOR', facility_name: 'Travelio Tours', facility_address: '123 Trần Phú', facility_city: 'Đà Nẵng', phone: '0912345678', business_type: 'TOUR', services: [sampleService, { name: 'Vé miễn phí', base_price: 0, service_category: 'TICKET', pricing_unit: 'TICKET' }] };
const setup = draftSetup;

test('vendor registration stores an unverified customer and private draft, sends OTP, grants no business access', async () => {
  setup();
  const result = await auth.register(payload);
  assert.equal(result.verificationRequired, true);
  assert.equal(result.token, undefined); assert.equal(result.user, undefined);
  assert.equal(result.registration.status, 'DRAFT');
  const storedUser = User.create.mock.calls[0].arguments[0][0];
  assert.equal(storedUser.role_id, role._id); assert.equal(storedUser.status, 'ACTIVE'); assert.equal(storedUser.is_verified, false);
  const stored = Application.create.mock.calls[0].arguments[0][0];
  assert.equal(stored.business.services.length, 2); assert.equal(stored.business.services[1].base_price, 0);
  assert.equal(stored.business.password, undefined); assert.equal(stored.business.role_id, undefined);
  assert.equal(Facility.create.mock.callCount(), 0); assert.equal(Service.insertMany.mock.callCount(), 0);
});

test('vendor draft keeps normalized multiple services and photos without hotel service fields', async () => {
  setup();
  const service = { ...sampleService, name: 'Sapa', location: 'Sapa', pricing_unit: 'TICKET' };
  const result = await auth.register({ ...payload, services: [service] });
  assert.equal(result.registration.role, 'ACTIVITY_VENDOR');
  const [stored] = Application.create.mock.calls[0].arguments[0][0].business.services;
  assert.equal(stored.name, 'Sapa'); assert.equal(stored.base_price, 150000); assert.equal(typeof stored.base_price, 'number');
  assert.deepEqual(stored.photos, service.photos);
});

test('lỗi từng dịch vụ trả đúng đường dẫn; không dùng lỗi tên/giá cấp cao nhất của Hotel Owner', async () => {
  for (const [patch, field] of [
    [{ name: '' }, 'name'], [{ base_price: undefined }, 'base_price'],
    [{ base_price: null }, 'base_price'], [{ base_price: '150,000' }, 'base_price'],
    [{ base_price: '150.000 VND' }, 'base_price']
  ]) {
    await assert.rejects(auth.register({ ...payload, services: [sampleService, { ...sampleService, ...patch }] }), (error) => {
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.some((item) => item.field === `services.1.${field}`));
      assert.notEqual(error.message, 'Vui lòng điền đầy đủ thông tin dịch vụ cung cấp (tên dịch vụ và giá)');
      return true;
    });
  }
});

test('vendor bắt buộc cơ sở, dịch vụ, mật khẩu mạnh và đồng ý điều khoản', async () => {
  const create = mock.method(User, 'create', async () => { throw Error('Không tạo dữ liệu sai'); });
  for (const patch of [{ facility_name: '' }, { facility_address: '' }, { facility_city: '' }, { phone: '123' }, { business_type: 'HOTEL' }, { full_name: [] }, { email: 'invalid' }, { password: 'aaaaaaaa', confirm_password: 'aaaaaaaa' }, { agree_terms: false }, { services: [] }, { services: undefined }]) await assert.rejects(auth.register({ ...payload, ...patch }), { statusCode: 400 });
  assert.equal(create.mock.callCount(), 0);
});

test('tên, giá thiếu/rỗng/âm/vô hạn và dữ liệu dịch vụ không hợp lệ bị từ chối', () => {
  for (const patch of [{ name: '' }, { base_price: '' }, { base_price: -1 }, { base_price: Infinity }, { base_price: true }, { service_category: 'HOTEL' }, { pricing_unit: 'INVALID' }, { location: '' }, { duration_minutes: -1 }, { photos: ['javascript:alert(1)'] }]) assert.throws(() => normalizeServices([{ ...sampleService, ...patch }]), { statusCode: 400 });
  assert.throws(() => normalizeServices(Array(21).fill(sampleService)), { statusCode: 400 });
});

test('giá từ frontend được chuẩn hóa; không nhận type, facility_id, vendor_id hoặc quyền do client gửi', () => {
  const [service] = normalizeServices([{ ...sampleService, base_price: '0', type: 'ROOM', facility_id: userId, vendor_id: userId, status: 'APPROVED' }]);
  assert.equal(service.base_price, 0);
  assert.equal(service.type, undefined);
  assert.equal(service.facility_id, undefined);
  assert.equal(service.status, undefined);
});

test('ticket không bắt buộc địa điểm hay thời lượng; tour có địa điểm và thời lượng tùy chọn', () => {
  const [ticket] = normalizeServices([{ name: 'Vé', base_price: 0, duration_minutes: 'invalid' }]);
  assert.equal(ticket.duration_minutes, null);
  assert.equal(ticket.location, '');
  assert.equal(normalizeServices([{ ...sampleService, duration_minutes: undefined }])[0].duration_minutes, null);
});

test('draft write failures propagate rather than returning a successful registration', async () => {
  setup();
  mock.method(Application, 'create', async () => { throw Error('Draft write failed'); });
  await assert.rejects(auth.register(payload), /Draft write failed/);
});

test('existing customer opens a draft without changing role or account status', async () => {
  setup();
  const current = { _id: userId, email: payload.email, status: 'ACTIVE', is_verified: true, role_id: { _id: role._id, role_name: 'CUSTOMER' } };
  mock.method(User, 'findById', () => query(current));
  mock.method(Facility, 'exists', async () => null);
  mock.method(Application, 'findOne', async () => null);
  const changeUser = mock.method(User, 'findByIdAndUpdate', async () => { throw Error('Do not change customer role'); });
  const result = await auth.becomePartner(userId, payload);
  assert.equal(result.registration.role, 'ACTIVITY_VENDOR'); assert.equal(result.registration.status, 'DRAFT'); assert.equal(result.token, undefined);
  assert.equal(current.status, 'ACTIVE'); assert.equal(current.role_id.role_name, 'CUSTOMER');
  assert.equal(changeUser.mock.callCount(), 0); assert.equal(Service.insertMany.mock.callCount(), 0);
});

test('admins and existing business partners cannot use the customer application endpoint', async () => {
  for (const roleName of ['ADMIN', 'HOTEL_OWNER', 'ACTIVITY_VENDOR']) {
    mock.method(User, 'findById', () => query({ status: 'ACTIVE', is_verified: true, role_id: { role_name: roleName } }));
    await assert.rejects(auth.becomePartner(userId, payload), { statusCode: 403 });
    mock.restoreAll();
  }
});

test('customer vẫn đăng ký mà không cần cơ sở hoặc dịch vụ', async () => {
  mock.method(User, 'findOne', async () => null);
  mock.method(Role, 'findOne', async () => ({ _id: role._id, role_name: 'CUSTOMER' }));
  mock.method(User, 'create', async (fields) => ({ ...fields, _id: userId }));
  mock.method(email, 'assertSmtpConfigured', () => {});
  const otp = mock.method(require('../src/services/authOtp.service'), 'send', async (user, kind) => {
    assert.equal(user.is_verified, false); assert.equal(kind, 'verification');
    return { resendAfterSeconds: 60 };
  });
  const facility = mock.method(Facility, 'create', async () => { throw Error('Không tạo cơ sở'); });
  const result = await auth.register({ full_name: 'Customer', email: 'customer@example.com', password: payload.password });
  assert.equal(result.verificationRequired, true);
  assert.equal(result.token, undefined);
  assert.equal(otp.mock.callCount(), 1);
  assert.equal(facility.mock.callCount(), 0);
});

test('hotel owner vẫn bắt buộc cơ sở và phòng đầu tiên', async () => {
  mock.method(User, 'findOne', async () => null);
  await assert.rejects(auth.register({ ...payload, role_name: 'HOTEL_OWNER' }), { statusCode: 400 });
});

test('vendor vẫn phải xác nhận mật khẩu đúng', async () => {
  await assert.rejects(auth.register({ ...payload, confirm_password: 'different' }), { statusCode: 400 });
});

test('tài khoản vendor cũ chưa có dịch vụ và chưa xác thực email vẫn đăng nhập được', async () => {
  const current = { _id: userId, email: payload.email, password_hash: await hashPassword(payload.password), role_id: role, status: 'ACTIVE', is_verified: false };
  mock.method(User, 'findOne', () => ({ populate: async () => current }));
  const result = await auth.login({ email: payload.email, password: payload.password });
  assert.ok(result.token);
  assert.equal(result.user.role, 'ACTIVITY_VENDOR');
});

test('vẫn từ chối mật khẩu sai và tài khoản bị khóa', async () => {
  const current = { password_hash: await hashPassword(payload.password), role_id: role, status: 'LOCKED' };
  mock.method(User, 'findOne', () => ({ populate: async () => current }));
  await assert.rejects(auth.login({ email: payload.email, password: 'wrong-password' }), { statusCode: 401 });
  await assert.rejects(auth.login({ email: payload.email, password: payload.password }), { statusCode: 403 });
});

test('luồng khôi phục mật khẩu bằng OTP được giữ nguyên', async () => {
  const current = { email: payload.email, is_verified: false, save: async () => {} };
  mock.method(email, 'assertSmtpConfigured', () => {});
  const send = mock.method(email, 'sendOtpEmail', async () => {});
  mock.method(User, 'findOne', () => ({ select: async () => current }));
  mock.method(User, 'findOneAndUpdate', async (filter, update) => { Object.assign(current, update.$set); return current; });
  await auth.forgotPassword({ email: payload.email });
  mock.method(User, 'findOneAndUpdate', async (filter) => { assert.ok(filter.reset_otp_expires_at.$gt instanceof Date); assert.equal(filter.reset_otp_hash, current.reset_otp_hash); return current; });
  assert.ok((await auth.verifyResetOtp({ email: payload.email, otp: send.mock.calls[0].arguments[1] })).resetToken);
});
