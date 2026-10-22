const { validateBusinessDetails } = require('./vendorRegistration.service');
const { normalizeServices } = require('./vendorServiceFields');
const { normalizeImageUrls } = require('../utils/cloudinaryImage');

const ROLES = ['HOTEL_OWNER', 'ACTIVITY_VENDOR'];
const EDITABLE = ['DRAFT', 'NEEDS_ADDITIONAL_INFO'];
const DOCUMENT_KINDS = ['BUSINESS_REGISTRATION', 'IDENTITY_PROOF', 'AUTHORITY_PROOF', 'AUTHORIZATION', 'LICENSE', 'INSURANCE'];
const CHECKS = ['business_identity', 'authority', 'documents', 'service_details'];
const TERMS_VERSION = '2026-10-19.1';
const TERMS = [
  { key: 'authority', title: 'Cam kết tư cách đại diện', text: 'Tôi cung cấp thông tin, tài liệu trung thực và có quyền đại diện đơn vị, quản lý cơ sở hoặc tổ chức/phân phối dịch vụ được đăng ký.' },
  { key: 'agreement', title: 'Thỏa thuận đối tác Travelio', text: 'Tôi cam kết cập nhật chính xác giá, hình ảnh, phòng/vé và mô tả; cung cấp dịch vụ đúng cam kết; phối hợp xử lý hủy, hoàn tiền và khiếu nại theo chính sách đã công bố. Tôi duy trì điều kiện hoạt động, cập nhật giấy tờ khi thay đổi hoặc hết hạn. Travelio được yêu cầu bổ sung, từ chối hoặc đình chỉ theo chính sách và vẫn thực hiện trách nhiệm của nền tảng theo quy định áp dụng.' },
  { key: 'privacy', title: 'Thông báo xử lý hồ sơ', text: 'Travelio xử lý thông tin và tài liệu để xác minh, xét duyệt và quản lý quan hệ đối tác. Chủ hồ sơ và nhân sự được phân quyền mới được truy cập. Bản demo chỉ sử dụng tài liệu giả lập, xét duyệt thủ công; không phải dịch vụ eKYC hoặc chữ ký số. Liên hệ Travelio để yêu cầu sửa hoặc xóa hồ sơ theo chính sách áp dụng.' },
];
const fail = (message, statusCode = 400, errors = []) => Object.assign(new Error(message), { statusCode, errors });
const text = (value, field, max = 200, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw fail('Vui lòng kiểm tra thông tin hồ sơ', 400, [{ field, message: `Thông tin bắt buộc, tối đa ${max} ký tự` }]);
  }
  return value.trim();
};
const number = (value, field, min, max, integer = false) => {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (integer && !Number.isInteger(Number(value)))) {
    throw fail('Thông tin số không hợp lệ', 400, [{ field, message: `Giá trị phải từ ${min} đến ${max}${integer ? ', là số nguyên' : ''}` }]);
  }
  return Number(value);
};

function normalizeBusiness(payload, role) {
  if (!ROLES.includes(role) || !payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Loại đối tác không hợp lệ');
  const details = validateBusinessDetails(payload, role === 'ACTIVITY_VENDOR');
  const business = {
    facility_name: details.name, facility_address: details.address, facility_city: details.city,
    facility_description: details.description, phone: details.contact_phone || '',
  };
  if (role === 'ACTIVITY_VENDOR') return { ...business, business_type: details.business_type, services: normalizeServices(payload.services) };
  if (!business.phone) throw fail('Vui lòng nhập số điện thoại liên hệ', 400, [{ field: 'phone', message: 'Số điện thoại là bắt buộc' }]);
  business.latitude = payload.latitude == null ? null : number(payload.latitude, 'latitude', -90, 90);
  business.longitude = payload.longitude == null ? null : number(payload.longitude, 'longitude', -180, 180);
  business.facility_size = payload.facility_size == null ? null : number(payload.facility_size, 'facility_size', 1, 10000000);
  business.service_capacity = number(payload.service_capacity ?? 2, 'service_capacity', 1, 100, true);
  business.bathrooms = number(payload.bathrooms ?? 1, 'bathrooms', 1, 100, true);
  business.host_type = payload.host_type === 'professional' ? 'professional' : 'private';
  if (!Array.isArray(payload.rooms) || !payload.rooms.length || payload.rooms.length > 20) throw fail('Vui lòng nhập từ 1 đến 20 loại phòng', 400, [{ field: 'rooms', message: 'Vui lòng nhập từ 1 đến 20 loại phòng' }]);
  business.rooms = payload.rooms.map((room, i) => {
    if (!room || typeof room !== 'object') throw fail('Thông tin phòng không hợp lệ');
    const photos = normalizeImageUrls(room.photos, 10, `rooms.${i}.photos`);
    if (photos.length < 3) throw fail('Mỗi loại phòng cần ít nhất 3 ảnh', 400, [{ field: `rooms.${i}.photos`, message: 'Cần ít nhất 3 ảnh phòng' }]);
    if (!Array.isArray(room.beds) || !room.beds.length || room.beds.length > 10) throw fail('Vui lòng kiểm tra thông tin giường');
    return {
      name: text(room.name, `rooms.${i}.name`), price: number(room.price, `rooms.${i}.price`, 0, Number.MAX_SAFE_INTEGER), photos,
      beds: room.beds.map((bed, j) => ({ bed_type: text(bed.bed_type, `rooms.${i}.beds.${j}.bed_type`, 80), count: number(bed.count, `rooms.${i}.beds.${j}.count`, 1, 100, true) })),
    };
  });
  business.amenities = Array.isArray(payload.amenities) ? [...new Set(payload.amenities.map(a => text(a, 'amenities', 120)))].slice(0, 100) : [];
  business.payout_method = ['bank_transfer', 'paypal'].includes(payload.payout_method) ? payload.payout_method : 'bank_transfer';
  const policy = payload.check_in_policy || {};
  business.check_in_policy = {
    total_rooms: number(policy.total_rooms ?? 1, 'check_in_policy.total_rooms', 1, 100000, true),
    price_management_method: policy.price_management_method === 'channel_manager' ? 'channel_manager' : 'manual',
    earliest_check_in_type: policy.earliest_check_in_type === 'specific_date' ? 'specific_date' : 'immediate',
    earliest_check_in_date: policy.earliest_check_in_date ? text(policy.earliest_check_in_date, 'check_in_policy.earliest_check_in_date', 40) : null,
  };
  const promotions = payload.promotions || {};
  business.promotions = {
    first_three_bookings: promotions.first_three_bookings === true, weekly_promo: promotions.weekly_promo === true,
    monthly_promo: promotions.monthly_promo === true,
    weekly_discount: number(promotions.weekly_discount ?? 0, 'promotions.weekly_discount', 0, 100),
    monthly_discount: number(promotions.monthly_discount ?? 0, 'promotions.monthly_discount', 0, 100),
  };
  business.has_common_area_bed = payload.has_common_area_bed === true;
  business.common_area_beds = business.has_common_area_bed && Array.isArray(payload.common_area_beds)
    ? payload.common_area_beds.slice(0, 10).map(bed => ({ bed_type: text(bed.bed_type, 'common_area_beds.bed_type', 80), count: number(bed.count, 'common_area_beds.count', 1, 100, true) })) : [];
  return business;
}

function normalizeProfile(payload, role, complete = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Thông tin chủ thể không hợp lệ');
  const profile = {};
  const limits = { legal_name: 200, trading_name: 200, registered_address: 300, tax_number: 50, registration_number: 80, representative_name: 120, representative_title: 120, operator_name: 200, accommodation_type: 100 };
  for (const [key, limit] of Object.entries(limits)) profile[key] = text(payload[key] ?? '', `profile.${key}`, limit, complete && ['legal_name', 'registered_address', 'representative_name', 'representative_title'].includes(key));
  const enums = {
    entity_type: ['COMPANY', 'HOUSEHOLD', 'INDIVIDUAL'],
    authority: ['OWNER', 'LEGAL_REPRESENTATIVE', 'AUTHORIZED', 'LESSEE', 'OPERATOR'],
    supply_type: ['DIRECT_OPERATOR', 'DISTRIBUTOR'],
  };
  for (const [key, values] of Object.entries(enums)) {
    const required = complete && (key !== 'supply_type' || role === 'ACTIVITY_VENDOR');
    if ((required || payload[key]) && !values.includes(payload[key])) throw fail('Vui lòng chọn thông tin chủ thể hợp lệ', 400, [{ field: `profile.${key}`, message: 'Vui lòng chọn giá trị hợp lệ' }]);
    profile[key] = values.includes(payload[key]) ? payload[key] : '';
  }
  profile.requires_license = payload.requires_license === true;
  profile.requires_insurance = payload.requires_insurance === true;
  if (complete && profile.entity_type !== 'INDIVIDUAL') {
    text(profile.registration_number, 'profile.registration_number', 80);
    text(profile.tax_number, 'profile.tax_number', 50);
  }
  if (complete && role === 'ACTIVITY_VENDOR') text(profile.operator_name, 'profile.operator_name');
  if (complete && role === 'HOTEL_OWNER') text(profile.accommodation_type, 'profile.accommodation_type', 100);
  return profile;
}

function requiredDocuments(profile, extra = []) {
  return [...new Set([
    'AUTHORITY_PROOF', profile.entity_type === 'INDIVIDUAL' ? 'IDENTITY_PROOF' : 'BUSINESS_REGISTRATION',
    ...(profile.authority === 'AUTHORIZED' ? ['AUTHORIZATION'] : []),
    ...(profile.requires_license ? ['LICENSE'] : []), ...(profile.requires_insurance ? ['INSURANCE'] : []), ...extra,
  ])];
}

function validateSubmission(application) {
  normalizeBusiness(application.business, application.role);
  const profile = normalizeProfile(application.profile, application.role, true);
  const missing = requiredDocuments(profile, application.required_documents).filter(kind => !application.documents.some(document => document.kind === kind));
  if (missing.length) throw fail('Hồ sơ còn thiếu tài liệu', 400, missing.map(kind => ({ field: `documents.${kind}`, message: 'Vui lòng bổ sung tài liệu này' })));
  if (application.consent?.version !== TERMS_VERSION || !TERMS.every(term => application.consent[term.key] === true)) throw fail('Vui lòng đọc và chấp nhận đầy đủ cam kết hiện hành', 400, [{ field: 'consent', message: 'Cần chấp nhận đủ ba cam kết' }]);
}

module.exports = { ROLES, EDITABLE, DOCUMENT_KINDS, CHECKS, TERMS_VERSION, TERMS, fail, normalizeBusiness, normalizeProfile, requiredDocuments, validateSubmission };
