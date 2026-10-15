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

afterEach(() => mock.restoreAll());
const role = { _id: '507f1f77bcf86cd799439012', role_name: 'ACTIVITY_VENDOR' };
const userId = '507f1f77bcf86cd799439011';
const facilityId = '507f1f77bcf86cd799439014';
const sampleService = { name: 'Tour Hội An', service_category: 'TOUR', location: 'Hội An', base_price: 150000, pricing_unit: 'PERSON', duration_minutes: 120, photos: ['https://res.cloudinary.com/travelio-test/image/upload/v1/travelio/attractions/tour.jpg'] };
const payload = { full_name: 'Vendor mới', email: 'vendor@example.com', password: 'password123', confirm_password: 'password123', agree_terms: true, role_name: 'ACTIVITY_VENDOR', facility_name: 'Travelio Tours', facility_address: '123 Trần Phú', facility_city: 'Đà Nẵng', phone: '0912345678', business_type: 'TOUR', services: [sampleService, { name: 'Vé miễn phí', base_price: 0, service_category: 'TICKET', pricing_unit: 'TICKET' }] };
const setup = () => {
  const session = {};
  mock.method(mongoose.connection, 'transaction', async (callback) => callback(session));
  mock.method(User, 'findOne', async () => null);
  mock.method(Role, 'findOne', async () => role);
  mock.method(User, 'create', async (fields, options) => {
    assert.equal(options.session, session);
    return fields.map((field) => ({ ...field, _id: userId }));
  });
  mock.method(Facility, 'create', async (fields, options) => {
    assert.equal(options.session, session);
    return fields.map((field) => ({ ...field, _id: facilityId }));
  });
  mock.method(Service, 'insertMany', async (fields, options) => { assert.equal(options.session, session); return fields; });
  return session;
};

test('đăng ký vendor lưu nhiều dịch vụ và giá 0 trong cùng transaction, không gửi OTP', async () => {
  setup();
  const smtp = mock.method(email, 'assertSmtpConfigured', () => { throw Error('Không cần SMTP'); });
  const mail = mock.method(email, 'sendOtpEmail', async () => { throw Error('Không gửi OTP'); });
  const result = await auth.register(payload);
  assert.equal(result.user.role, 'ACTIVITY_VENDOR');
  assert.equal(result.token, undefined);
  assert.equal(result.user.status, 'PENDING');
  assert.deepEqual(result.user.permissions, []);
  assert.equal(result.registration.facility_name, payload.facility_name);
  const services = Service.insertMany.mock.calls[0].arguments[0];
  assert.equal(services.length, 2);
  assert.equal(services[0].facility_id, facilityId);
  assert.equal(services[0].duration_minutes, 120);
  assert.equal(services[1].base_price, 0);
  assert.equal(smtp.mock.callCount(), 0);
  assert.equal(mail.mock.callCount(), 0);
});

test('payload Review chỉ dùng services: Sapa 150000 không cần service_name/service_price kiểu cũ', async () => {
  setup();
  const service = { ...sampleService, name: 'Khám Phá Sapa', location: 'Sapa', pricing_unit: 'TICKET' };
  const request = JSON.parse(JSON.stringify({ ...payload, services: [service] }));
  assert.equal(request.service_name, undefined);
  assert.equal(request.service_price, undefined);
  assert.equal((await auth.register(request)).user.role, 'ACTIVITY_VENDOR');
  const [stored] = Service.insertMany.mock.calls[0].arguments[0];
  assert.equal(stored.name, service.name);
  assert.equal(stored.base_price, 150000);
  assert.equal(typeof stored.base_price, 'number');
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

test('lỗi lưu dịch vụ được truyền ra transaction, không trả token thành công', async () => {
  setup();
  mock.method(Service, 'insertMany', async () => { throw Error('Service write failed'); });
  await assert.rejects(auth.register(payload), /Service write failed/);
});

test('khách hàng chuyển thành vendor lưu cơ sở và dịch vụ trong transaction', async () => {
  setup();
  const current = { _id: userId, email: payload.email, role_id: { role_name: 'CUSTOMER' }, save: async () => {} };
  mock.method(User, 'findById', () => ({ populate: async () => current }));
  mock.method(Facility, 'findOne', async () => null);
  const result = await auth.becomePartner(userId, payload);
  assert.equal(result.user.role, 'ACTIVITY_VENDOR');
  assert.equal(result.token, undefined);
  assert.equal(result.registration.status, 'PENDING');
  assert.equal(result.registration.facility_name, payload.facility_name);
  assert.equal(Service.insertMany.mock.calls[0].arguments[0].length, 2);
});

test('không thể chuyển admin/hotel owner/vendor thành vendor qua luồng đăng ký', async () => {
  for (const roleName of ['ADMIN', 'HOTEL_OWNER', 'ACTIVITY_VENDOR']) {
    mock.method(User, 'findById', () => ({ populate: async () => ({ role_id: { role_name: roleName } }) }));
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
