const { User, Role, Facility, Service } = require('../models');
const { ROLES, generateToken } = require('../middlewares/authMiddleware');
const { hashPassword, verifyPassword } = require('../utils/password');

const toAuthUser = (user, roleName) => ({
  id: user._id,
  full_name: user.full_name,
  email: user.email,
  role: roleName,
  status: user.status
});

const ensureCustomerRole = async () => {
  let role = await Role.findOne({ role_name: ROLES.CUSTOMER });
  if (!role) {
    role = await Role.create({
      role_name: ROLES.CUSTOMER,
      description: 'Customer'
    });
  }
  return role;
};

const register = async ({
  full_name,
  email,
  password,
  role_name,
  facility_name,
  facility_address,
  facility_city,
  facility_description,
  service_name,
  service_price,
  service_capacity,
  phone
}) => {
  if (!full_name || !email || !password) {
    const error = new Error('Missing required fields: full_name, email, password');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Cho phép đăng ký làm CUSTOMER, HOTEL_OWNER hoặc ACTIVITY_VENDOR
  const allowedRoles = [ROLES.CUSTOMER, ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];
  const targetRoleName = (role_name && allowedRoles.includes(role_name)) ? role_name : ROLES.CUSTOMER;

  // Nếu đăng ký đối tác, bắt buộc phải có thông tin dịch vụ
  if ([ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR].includes(targetRoleName)) {
    if (!facility_name || !facility_address || !facility_city) {
      const error = new Error('Vui lòng điền đầy đủ thông tin cơ sở kinh doanh (tên cơ sở, địa chỉ, thành phố)');
      error.statusCode = 400;
      throw error;
    }
    if (!service_name || service_price === undefined || service_price === null || service_price === '') {
      const error = new Error('Vui lòng điền đầy đủ thông tin dịch vụ cung cấp (tên dịch vụ và giá)');
      error.statusCode = 400;
      throw error;
    }
  }

  let role = await Role.findOne({ role_name: targetRoleName });
  if (!role) {
    role = await Role.create({
      role_name: targetRoleName,
      description: targetRoleName === ROLES.HOTEL_OWNER
        ? 'Chủ sở hữu / Quản lý khách sạn & cơ sở lưu trú'
        : targetRoleName === ROLES.ACTIVITY_VENDOR
          ? 'Nhà cung cấp vé tham quan, tour & hoạt động vui chơi giải trí'
          : 'Customer'
    });
  }

  const user = await User.create({
    full_name: full_name.trim(),
    email: cleanEmail,
    phone: phone ? phone.trim() : null,
    password_hash: await hashPassword(password),
    role_id: role._id,
    status: 'ACTIVE'
  });

  // Nếu là đối tác, tự động khởi tạo cơ sở và dịch vụ kinh doanh
  if ([ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR].includes(targetRoleName)) {
    const facilityType = targetRoleName === ROLES.HOTEL_OWNER ? 'HOTEL' : 'ATTRACTION';
    const facility = await Facility.create({
      vendor_id: user._id,
      type: facilityType,
      name: facility_name.trim(),
      address: facility_address.trim(),
      city: facility_city.trim(),
      description: facility_description ? facility_description.trim() : null,
      status: 'ACTIVE'
    });

    const serviceType = targetRoleName === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
    await Service.create({
      facility_id: facility._id,
      type: serviceType,
      name: service_name.trim(),
      base_price: Number(service_price) || 0,
      capacity: Number(service_capacity) || 1,
      description: facility_description ? facility_description.trim() : null
    });
  }

  const token = generateToken({ id: user._id, email: user.email, role: targetRoleName });
  return { token, user: toAuthUser(user, targetRoleName) };
};

const becomePartner = async (userId, payload) => {
  const {
    role_name,
    facility_name,
    facility_address,
    facility_city,
    facility_description,
    service_name,
    service_price,
    service_capacity,
    phone
  } = payload;

  const allowedRoles = [ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];
  if (!role_name || !allowedRoles.includes(role_name)) {
    const error = new Error('Vai trò không hợp lệ. Chỉ chấp nhận HOTEL_OWNER hoặc ACTIVITY_VENDOR');
    error.statusCode = 400;
    throw error;
  }

  // Bắt buộc nhập đầy đủ thông tin dịch vụ
  if (!facility_name || !facility_address || !facility_city) {
    const error = new Error('Vui lòng điền đầy đủ thông tin cơ sở kinh doanh (tên cơ sở, địa chỉ, thành phố)');
    error.statusCode = 400;
    throw error;
  }

  if (!service_name || service_price === undefined || service_price === null || service_price === '') {
    const error = new Error('Vui lòng điền đầy đủ thông tin dịch vụ cung cấp (tên dịch vụ và giá)');
    error.statusCode = 400;
    throw error;
  }

  let role = await Role.findOne({ role_name });
  if (!role) {
    role = await Role.create({
      role_name,
      description: role_name === ROLES.HOTEL_OWNER
        ? 'Chủ sở hữu / Quản lý khách sạn & cơ sở lưu trú'
        : 'Nhà cung cấp vé tham quan, tour & hoạt động vui chơi giải trí'
    });
  }

  const updateFields = { role_id: role._id };
  if (phone) updateFields.phone = phone.trim();

  const user = await User.findByIdAndUpdate(
    userId,
    updateFields,
    { new: true }
  ).populate('role_id', 'role_name');

  if (!user) {
    const error = new Error('Người dùng không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  // Khởi tạo cơ sở kinh doanh cho đối tác
  const facilityType = role_name === ROLES.HOTEL_OWNER ? 'HOTEL' : 'ATTRACTION';
  const facility = await Facility.create({
    vendor_id: user._id,
    type: facilityType,
    name: facility_name.trim(),
    address: facility_address.trim(),
    city: facility_city.trim(),
    description: facility_description ? facility_description.trim() : null,
    status: 'ACTIVE'
  });

  // Khởi tạo dịch vụ ban đầu cho cơ sở
  const serviceType = role_name === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
  await Service.create({
    facility_id: facility._id,
    type: serviceType,
    name: service_name.trim(),
    base_price: Number(service_price) || 0,
    capacity: Number(service_capacity) || 1,
    description: facility_description ? facility_description.trim() : null
  });

  const token = generateToken({ id: user._id, email: user.email, role: role_name });
  return { token, user: toAuthUser(user, role_name), facility };
};



const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Missing required fields: email, password');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).populate('role_id', 'role_name');
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const error = new Error('Email or password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  if (['LOCKED', 'INACTIVE'].includes(user.status)) {
    const error = new Error('Account is locked or inactive');
    error.statusCode = 403;
    throw error;
  }

  const roleName = user.role_id?.role_name || ROLES.CUSTOMER;
  const token = generateToken({ id: user._id, email: user.email, role: roleName });
  return { token, user: toAuthUser(user, roleName) };
};

const getMe = async (userId) => {
  const user = await User.findById(userId).select('-password_hash').populate('role_id', 'role_name description');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role_id?.role_name || ROLES.CUSTOMER,
    status: user.status,
    total_loyalty_points: user.total_loyalty_points
  };
};

module.exports = { register, login, getMe, becomePartner };

