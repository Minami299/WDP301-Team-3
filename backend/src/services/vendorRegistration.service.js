const mongoose = require('mongoose');
const { User, Facility, Service } = require('../models');
const { hashPassword } = require('../utils/password');
const { normalizeServices } = require('./vendorServiceFields');

const BUSINESS_TYPES = ['ATTRACTION', 'TOUR', 'TICKET', 'MULTIPLE_SERVICES'];
const validationError = (errors) => Object.assign(new Error('Vui lòng kiểm tra thông tin đăng ký'), { statusCode: 400, errors });

const validateBusinessDetails = (payload, requireContact = true) => {
  const errors = [];
  const read = (field, label, limit, required = true) => {
    const value = typeof payload[field] === 'string' ? payload[field].trim() : '';
    if ((required && !value) || (payload[field] !== undefined && typeof payload[field] !== 'string')) {
      errors.push({ field, message: `Vui lòng nhập ${label}` });
    } else if (value.length > limit) errors.push({ field, message: `${label} không được quá ${limit} ký tự` });
    return value;
  };
  const name = read('facility_name', 'tên cơ sở kinh doanh', 200);
  const address = read('facility_address', 'địa chỉ kinh doanh', 300);
  const city = read('facility_city', 'tỉnh / thành phố', 120);
  const phone = read('phone', 'số điện thoại liên hệ', 30, requireContact);
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || !/^\d{9,15}$/.test(phone.replace(/\D/g, '')))) {
    errors.push({ field: 'phone', message: 'Số điện thoại phải có từ 9 đến 15 chữ số' });
  }
  const businessType = payload.business_type;
  if ((requireContact || businessType !== undefined) && !BUSINESS_TYPES.includes(businessType)) {
    errors.push({ field: 'business_type', message: 'Vui lòng chọn loại hình kinh doanh hợp lệ' });
  }
  const description = read('facility_description', 'mô tả', 5000, false);
  if (errors.length) throw validationError(errors);
  return { name, address, city, description, ...(phone ? { contact_phone: phone } : {}), ...(businessType !== undefined ? { business_type: businessType } : {}) };
};

const validatePartnerAccount = (payload) => {
  const errors = [];
  if (typeof payload.full_name !== 'string' || !payload.full_name.trim() || payload.full_name.trim().length > 120) errors.push({ field: 'full_name', message: 'Họ tên bắt buộc và không được quá 120 ký tự' });
  if (typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) errors.push({ field: 'email', message: 'Vui lòng nhập email hợp lệ' });
  if (typeof payload.password !== 'string' || payload.password.length < 8) errors.push({ field: 'password', message: 'Mật khẩu phải có ít nhất 8 ký tự' });
  else if (!/[A-Za-z]/.test(payload.password) || !/\d/.test(payload.password)) errors.push({ field: 'password', message: 'Mật khẩu phải có chữ cái và chữ số' });
  if (payload.confirm_password !== payload.password) errors.push({ field: 'confirm_password', message: 'Mật khẩu xác nhận không khớp' });
  if (payload.agree_terms !== true) errors.push({ field: 'agree_terms', message: 'Vui lòng đồng ý Terms & Privacy Policy' });
  return errors;
};

const validateVendorSignup = (payload) => {
  const errors = validatePartnerAccount(payload);
  let business;
  try { business = validateBusinessDetails(payload); }
  catch (error) { errors.push(...error.errors); }
  try { normalizeServices(payload.services); }
  catch (error) { errors.push(...error.errors); }
  if (errors.length) throw validationError(errors);
  return business;
};

const createVendorAccount = async (payload, role, business) => {
  const services = normalizeServices(payload.services);
  const passwordHash = await hashPassword(payload.password);
  try {
    return await mongoose.connection.transaction(async (session) => {
      const [user] = await User.create([{
        full_name: payload.full_name.trim(), email: payload.email.trim().toLowerCase(),
        password_hash: passwordHash, phone: business.contact_phone,
        role_id: role._id, status: 'PENDING', approvalStatus: 'PENDING', is_verified: true
      }], { session });
      const facility = await createVendorBusiness(user._id, business, services, session);
      return { user, facility };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw Object.assign(new Error('Email already exists'), { statusCode: 409, errors: [{ field: 'email', message: 'Email này đã được đăng ký' }] });
    }
    throw error;
  }
};

const createVendorBusiness = async (vendorId, business, services, session) => {
  const [facility] = await Facility.create([{ ...business, vendor_id: vendorId, type: 'ATTRACTION', status: 'PENDING' }], { session });
  await Service.insertMany(services.map((service) => ({ ...service, ...(service.ticket_types ? { ticket_types: service.ticket_types.map(t => ({ ...t, _id: new mongoose.Types.ObjectId() })) } : {}), facility_id: facility._id, type: 'TICKET', capacity: 1 })), { session });
  return facility;
};

module.exports = { validateBusinessDetails, validatePartnerAccount, validateVendorSignup, createVendorAccount, createVendorBusiness };
