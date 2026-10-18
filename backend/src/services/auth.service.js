const { User, UserProfile, Role, Facility, Service, Amenity, FacilityAmenity, FacilityImage } = require("../models");
const { ROLES, generateToken } = require("../middlewares/authMiddleware");
const { permissionsOf } = require("../configs/permissions");
const { hashPassword, verifyPassword } = require("../utils/password");
const crypto = require("crypto");
const emailService = require("./email.service");
const authOtp = require('./authOtp.service');
const mongoose = require('mongoose');
const { validateBusinessDetails, validatePartnerAccount, validateVendorSignup, createVendorAccount, createVendorBusiness } = require('./vendorRegistration.service');
const { normalizeServices } = require('./vendorServiceFields');
const { validateHotelImages } = require('../utils/cloudinaryImage');
const { assertActiveAccount, approvalStatusOf } = require('../utils/accountStatus');

const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const invalidOtpError = () => {
  const error = new Error("Invalid or expired verification code");
  error.statusCode = 400;
  return error;
};
const normalizeEmail = email => {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw Object.assign(new Error('A valid email address is required'), { statusCode: 400 });
  }
  return email.trim().toLowerCase();
};

const toAuthUser = (user, roleName, permissions) => ({
  id: user._id,
  full_name: user.full_name,
  email: user.email,
  role: roleName,
  permissions,
  status: user.status,
  approvalStatus: approvalStatusOf(user),
});

const ensureCustomerRole = async () => {
  const role = await Role.findOne({ role_name: ROLES.CUSTOMER });
  if (!role) {
    const error = new Error("Customer role is not configured");
    error.statusCode = 500;
    throw error;
  }
  return role;
};

const pendingRegistration = (user, role, facility) => ({
  user: toAuthUser(user, role, []),
  email: user.email,
  registration: { status: 'PENDING', approvalStatus: 'PENDING', full_name: user.full_name, email: user.email, role, facility_name: facility.name }
});
const createDocument = async (Model, fields, session) => session ? (await Model.create([fields], { session }))[0] : Model.create(fields);

const register = async (payload = {}, session) => {
  if (payload.role_name === ROLES.HOTEL_OWNER) {
    const errors = validatePartnerAccount(payload);
    if (errors.length) throw Object.assign(new Error('Vui lòng kiểm tra thông tin tài khoản'), { statusCode: 400, errors });
  }
  const vendorBusiness = payload.role_name === ROLES.ACTIVITY_VENDOR ? validateVendorSignup(payload) : null;
  const {
    full_name,
    email,
    password,
    confirm_password,
    role_name,
    facility_name,
    facility_address,
    facility_city,
    facility_description,
    latitude,
    longitude,
    facility_size,
    promotions,
    payout_method,
    check_in_policy,
    service_name,
    service_price,
    service_capacity,
    bedrooms,
    bathrooms,
    has_common_area_bed,
    common_area_beds,
    amenities,
    phone,
    rooms,
    photos,
    host_type,
    nationality,
    birth_date,
    residence_country,
    province,
    city_residence,
    preferred_language
  } = payload;
  if (typeof full_name !== 'string' || !full_name.trim() || full_name.trim().length > 120 || typeof password !== 'string' || !password || typeof email !== 'string') {
    const error = new Error(
      "Missing required fields: full_name, email, password",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }

  if (confirm_password !== undefined && confirm_password !== password) {
    const error = new Error("Password confirmation does not match");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    if (existing.is_verified === false && (!role_name || role_name === ROLES.CUSTOMER)) {
      throw Object.assign(new Error('This email is awaiting verification. Request a verification code to continue.'), { statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
    }
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  // Cho phép đăng ký làm CUSTOMER, HOTEL_OWNER hoặc ACTIVITY_VENDOR
  const allowedRoles = [ROLES.CUSTOMER, ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];
  const targetRoleName = (role_name && allowedRoles.includes(role_name)) ? role_name : ROLES.CUSTOMER;
  if (targetRoleName === ROLES.CUSTOMER) emailService.assertSmtpConfigured();

  const createPartnerFacility = targetRoleName === ROLES.HOTEL_OWNER;
  if (createPartnerFacility) {
    validateHotelImages(payload);
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

  // Partner identity and business data must be committed together before review.
  if (createPartnerFacility && !session) return mongoose.connection.transaction(session => register(payload, session));
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

  if (targetRoleName === ROLES.ACTIVITY_VENDOR) {
    const { user, facility } = await createVendorAccount(payload, role, vendorBusiness);
    return pendingRegistration(user, targetRoleName, facility);
  }

  const user = await createDocument(User, {
    full_name: full_name.trim(),
    email: cleanEmail,
    phone: phone ? phone.trim() : null,
    password_hash: await hashPassword(password),
    role_id: role._id,
    status: createPartnerFacility ? 'PENDING' : 'ACTIVE',
    ...(createPartnerFacility ? { approvalStatus: 'PENDING' } : {}),
    is_verified: targetRoleName !== ROLES.CUSTOMER,
  }, session);

  // Tạo hoặc cập nhật UserProfile với thông tin đối tác nếu có
  if (host_type || nationality || birth_date || residence_country || province || city_residence || preferred_language) {
    await UserProfile.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          user_id: user._id,
          host_type: host_type || "private",
          nationality: nationality || null,
          birth_date: birth_date ? new Date(birth_date) : null,
          residence_country: residence_country || null,
          province: province || null,
          city_residence: city_residence || null,
          preferred_language: preferred_language || "Tiếng Việt"
        }
      },
      { upsert: true, new: true, session }
    ).catch(() => {});
  }

  // Nếu là đối tác, tự động khởi tạo cơ sở và dịch vụ kinh doanh
  if (createPartnerFacility) {
    const facilityType = targetRoleName === ROLES.HOTEL_OWNER ? 'HOTEL' : 'ATTRACTION';
    const facility = await createDocument(Facility, {
      vendor_id: user._id,
      type: facilityType,
      name: facility_name.trim(),
      address: facility_address.trim(),
      city: facility_city.trim(),
      description: facility_description ? facility_description.trim() : null,
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      size: facility_size !== undefined ? Number(facility_size) : null,
      promotions: promotions || {},
      payout_method: payout_method || 'bank_transfer',
      check_in_policy: check_in_policy || {},
      status: 'PENDING'
    }, session);

    // Lưu các tiện ích của cơ sở lưu trú nếu có
    if (Array.isArray(amenities) && amenities.length > 0) {
      for (const item of amenities) {
        if (!item || typeof item !== 'string') continue;
        let amenityDoc = await Amenity.findOne({ name: item.trim() });
        if (!amenityDoc) {
          amenityDoc = await createDocument(Amenity, { name: item.trim(), type: 'HOTEL_FACILITY' }, session);
        }
        await createDocument(FacilityAmenity, { facility_id: facility._id, amenity_id: amenityDoc._id }, session).catch(() => {});
      }
    }

    const serviceType = targetRoleName === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
    if (Array.isArray(rooms) && rooms.length > 0) {
      for (const r of rooms) {
        await createDocument(Service, {
          facility_id: facility._id,
          type: serviceType,
          name: (r.name || 'Phòng nghỉ').trim(),
          base_price: Number(r.price) || 0,
          capacity: Number(service_capacity) || 2,
          bathrooms: Number(bathrooms) || 1,
          bedrooms: Array.isArray(r.beds) ? [{
            bedroom_name: r.name || 'Phòng ngủ',
            beds: r.beds.map((b) => ({ bed_type: b.bed_type, count: Number(b.count) || 1 }))
          }] : [],
          has_common_area_bed: Boolean(has_common_area_bed),
          common_area_beds: Array.isArray(common_area_beds) ? common_area_beds : [],
          photos: Array.isArray(r.photos) ? r.photos : [],
          description: facility_description ? facility_description.trim() : null
        }, session);

        if (Array.isArray(r.photos) && r.photos.length > 0) {
          for (let i = 0; i < r.photos.length; i++) {
            if (r.photos[i]) {
              await createDocument(FacilityImage, {
                facility_id: facility._id,
                image_url: r.photos[i].trim(),
                is_primary: i === 0 && r === rooms[0]
              }, session).catch(() => {});
            }
          }
        }
      }
    } else {
      await createDocument(Service, {
        facility_id: facility._id,
        type: serviceType,
        name: service_name.trim(),
        base_price: Number(service_price) || 0,
        capacity: Number(service_capacity) || 1,
        bathrooms: Number(bathrooms) || 1,
        bedrooms: Array.isArray(bedrooms) ? bedrooms : [],
        has_common_area_bed: Boolean(has_common_area_bed),
        common_area_beds: Array.isArray(common_area_beds) ? common_area_beds : [],
        description: facility_description ? facility_description.trim() : null
      }, session);

      if (Array.isArray(photos) && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          if (photos[i]) {
            await createDocument(FacilityImage, {
              facility_id: facility._id,
              image_url: photos[i].trim(),
              is_primary: i === 0
            }, session).catch(() => {});
          }
        }
      }
    }
    return pendingRegistration(user, targetRoleName, facility);
  }

  const delivery = await authOtp.send(user, 'verification', 'verification');
  return {
    verificationRequired: true,
    email: user.email,
    ...delivery,
  };
};

const resendVerification = async ({ email } = {}) => {
  const cleanEmail = normalizeEmail(email);
  const user = await User.findOne({ email: cleanEmail, is_verified: false, status: 'ACTIVE' })
    .select(authOtp.fields('verification')).populate('role_id');
  let delivery = { resendAfterSeconds: 60 };
  if (user?.role_id?.role_name === ROLES.CUSTOMER) delivery = await authOtp.send(user, 'verification', 'verification');
  return { message: 'If this email is awaiting verification, a code has been sent.', ...delivery };
};

const verifyEmail = async ({ email, otp } = {}) => {
  const cleanEmail = normalizeEmail(email);
  const role = await ensureCustomerRole();
  await authOtp.consume(cleanEmail, otp, 'verification', { role_id: role._id, is_verified: false, status: 'ACTIVE' }, { $set: { is_verified: true } });
  return { message: 'Email verified successfully. You can now log in.' };
};

const forgotPassword = async ({ email } = {}) => {
  const cleanEmail = normalizeEmail(email);
  emailService.assertSmtpConfigured();
  const user = await User.findOne({
    email: cleanEmail,
  }).select(authOtp.fields('reset'));
  if (user) await authOtp.send(user, 'reset', 'password reset');
  return {
    message: "If an account exists for this email, a reset code has been sent.",
    resendAfterSeconds: 60,
  };
};

const verifyResetOtp = async ({ email, otp } = {}) => {
  const cleanEmail = normalizeEmail(email);
  const resetToken = crypto.randomBytes(32).toString("hex");
  await authOtp.consume(cleanEmail, otp, 'reset', {},
    {
      $set: {
        password_reset_token_hash: hashValue(resetToken),
        password_reset_token_expires_at: new Date(
          Date.now() + PASSWORD_RESET_TTL_MS,
        ),
      },
      $unset: { reset_otp_hash: 1, reset_otp_expires_at: 1 },
    },
  );
  return { resetToken };
};

const resetPassword = async ({ email, resetToken, new_password } = {}) => {
  const cleanEmail = normalizeEmail(email);
  if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken) || typeof new_password !== 'string' || !new_password) {
    const error = new Error(
      "Email, reset token, and new password are required",
    );
    error.statusCode = 400;
    throw error;
  }
  if (new_password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
  const user = await User.findOneAndUpdate(
    {
      email: cleanEmail,
      password_reset_token_hash: hashValue(resetToken),
      password_reset_token_expires_at: { $gt: new Date() },
    },
    {
      $set: { password_hash: await hashPassword(new_password) },
      $unset: {
        password_reset_token_hash: 1,
        password_reset_token_expires_at: 1,
        reset_otp_hash: 1,
        reset_otp_expires_at: 1,
      },
    },
    { new: true, runValidators: true },
  );
  if (!user) throw invalidOtpError();
  return { message: "Password reset successfully" };
};

const becomePartner = async (userId, payload, session) => {
  const {
    role_name,
    facility_name,
    facility_address,
    facility_city,
    facility_description,
    latitude,
    longitude,
    facility_size,
    promotions,
    payout_method,
    check_in_policy,
    service_name,
    service_price,
    service_capacity,
    bedrooms,
    bathrooms,
    has_common_area_bed,
    common_area_beds,
    phone,
    host_type,
    nationality,
    birth_date,
    residence_country,
    province,
    city_residence,
    preferred_language
  } = payload;

  const allowedRoles = [ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];
  if (payload.agree_terms !== true) throw Object.assign(new Error('Vui lòng đồng ý Terms & Privacy Policy'), { statusCode: 400, errors: [{ field: 'agree_terms', message: 'Vui lòng đồng ý Terms & Privacy Policy' }] });
  if (!role_name || !allowedRoles.includes(role_name)) {
    const error = new Error('Vai trò không hợp lệ. Chỉ chấp nhận HOTEL_OWNER hoặc ACTIVITY_VENDOR');
    error.statusCode = 400;
    throw error;
  }

  // Attraction Vendor luôn hoàn tất trước luồng tạo cơ sở + phòng của Hotel Owner.
  if (role_name === ROLES.ACTIVITY_VENDOR) {
    const business = validateBusinessDetails(payload);
    const services = normalizeServices(payload.services);
    if (payload.agree_terms !== true) throw Object.assign(new Error('Vui lòng đồng ý Terms & Privacy Policy'), { statusCode: 400, errors: [{ field: 'agree_terms', message: 'Vui lòng đồng ý Terms & Privacy Policy' }] });
    const current = await User.findById(userId).populate('role_id');
    if (!current) throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });
    if (current.role_id?.role_name !== ROLES.CUSTOMER) {
      throw Object.assign(new Error('Chỉ tài khoản khách hàng có thể đăng ký trở thành vendor'), { statusCode: 403 });
    }
    if (await Facility.findOne({ vendor_id: userId })) {
      throw Object.assign(new Error('Tài khoản đã đăng ký cơ sở kinh doanh'), { statusCode: 400 });
    }
    let role = await Role.findOne({ role_name });
    if (!role) role = await Role.create({ role_name, description: 'Nhà cung cấp vé tham quan, tour & trải nghiệm' });
    const facility = await mongoose.connection.transaction(async (session) => {
      const created = await createVendorBusiness(current._id, business, services, session);
      current.role_id = role._id;
      current.phone = business.contact_phone;
      current.status = 'PENDING';
      current.approvalStatus = 'PENDING';
      await current.save({ session });
      return created;
    });
    return pendingRegistration(current, role_name, facility);
  }

  validateHotelImages(payload);
  const current = await User.findById(userId).populate('role_id');
  if (!current || current.role_id?.role_name !== ROLES.CUSTOMER || current.status !== 'ACTIVE') throw Object.assign(new Error('Chỉ tài khoản khách hàng đang hoạt động có thể đăng ký trở thành đối tác'), { statusCode: 403 });

  // Mỗi tài khoản chỉ có thể đăng ký 1 cơ sở kinh doanh
  const existingFacility = await Facility.findOne({ vendor_id: userId });
  if (existingFacility) {
    const error = new Error('Tài khoản đã đăng ký một cơ sở kinh doanh. Mỗi tài khoản chỉ có thể quản lý tối đa 1 cơ sở.');
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

  if (!session) return mongoose.connection.transaction(session => becomePartner(userId, payload, session));
  let role = await Role.findOne({ role_name });
  if (!role) {
    role = await Role.create({
      role_name,
      description: role_name === ROLES.HOTEL_OWNER
        ? 'Chủ sở hữu / Quản lý khách sạn & cơ sở lưu trú'
        : 'Nhà cung cấp vé tham quan, tour & hoạt động vui chơi giải trí'
    });
  }

  const updateFields = { role_id: role._id, status: 'PENDING', approvalStatus: 'PENDING' };
  if (phone) updateFields.phone = phone.trim();

  const user = await User.findByIdAndUpdate(
    userId,
    updateFields,
    { new: true, session }
  ).populate('role_id', 'role_name');

  if (!user) {
    const error = new Error('Người dùng không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  // Tạo hoặc cập nhật UserProfile với thông tin đối tác nếu có
  if (host_type || nationality || birth_date || residence_country || province || city_residence || preferred_language) {
    await UserProfile.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          user_id: user._id,
          host_type: host_type || "private",
          nationality: nationality || null,
          birth_date: birth_date ? new Date(birth_date) : null,
          residence_country: residence_country || null,
          province: province || null,
          city_residence: city_residence || null,
          preferred_language: preferred_language || "Tiếng Việt"
        }
      },
      { upsert: true, new: true, session }
    ).catch(() => {});
  }

  // Khởi tạo cơ sở kinh doanh cho đối tác
  const facilityType = role_name === ROLES.HOTEL_OWNER ? 'HOTEL' : 'ATTRACTION';
  const facility = await createDocument(Facility, {
    vendor_id: user._id,
    type: facilityType,
    name: facility_name.trim(),
    address: facility_address.trim(),
    city: facility_city.trim(),
    description: facility_description ? facility_description.trim() : null,
    latitude: latitude !== undefined ? Number(latitude) : null,
    longitude: longitude !== undefined ? Number(longitude) : null,
    size: facility_size !== undefined ? Number(facility_size) : null,
    promotions: promotions || {},
    payout_method: payout_method || 'bank_transfer',
    check_in_policy: check_in_policy || {},
    status: 'PENDING'
  }, session);

  // Lưu các tiện ích của cơ sở lưu trú nếu có
  if (Array.isArray(payload.amenities) && payload.amenities.length > 0) {
    for (const item of payload.amenities) {
      if (!item || typeof item !== 'string') continue;
      let amenityDoc = await Amenity.findOne({ name: item.trim() });
      if (!amenityDoc) {
        amenityDoc = await createDocument(Amenity, { name: item.trim(), type: 'HOTEL_FACILITY' }, session);
      }
      await createDocument(FacilityAmenity, { facility_id: facility._id, amenity_id: amenityDoc._id }, session).catch(() => {});
    }
  }

  // Khởi tạo dịch vụ ban đầu cho cơ sở
  const serviceType = role_name === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
  if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
    for (const r of payload.rooms) {
      await createDocument(Service, {
        facility_id: facility._id,
        type: serviceType,
        name: (r.name || 'Phòng nghỉ').trim(),
        base_price: Number(r.price) || 0,
        capacity: Number(service_capacity) || 2,
        bathrooms: Number(bathrooms) || 1,
        bedrooms: Array.isArray(r.beds) ? [{
          bedroom_name: r.name || 'Phòng ngủ',
          beds: r.beds.map((b) => ({ bed_type: b.bed_type, count: Number(b.count) || 1 }))
        }] : [],
        has_common_area_bed: Boolean(has_common_area_bed),
        common_area_beds: Array.isArray(common_area_beds) ? common_area_beds : [],
        photos: Array.isArray(r.photos) ? r.photos : [],
        description: facility_description ? facility_description.trim() : null
      }, session);

      if (Array.isArray(r.photos) && r.photos.length > 0) {
        for (let i = 0; i < r.photos.length; i++) {
          if (r.photos[i]) {
            await createDocument(FacilityImage, {
              facility_id: facility._id,
              image_url: r.photos[i].trim(),
              is_primary: i === 0 && r === payload.rooms[0]
            }, session).catch(() => {});
          }
        }
      }
    }
  } else {
    await createDocument(Service, {
      facility_id: facility._id,
      type: serviceType,
      name: service_name.trim(),
      base_price: Number(service_price) || 0,
      capacity: Number(service_capacity) || 1,
      bathrooms: Number(bathrooms) || 1,
      bedrooms: Array.isArray(bedrooms) ? bedrooms : [],
      has_common_area_bed: Boolean(has_common_area_bed),
      common_area_beds: Array.isArray(common_area_beds) ? common_area_beds : [],
      description: facility_description ? facility_description.trim() : null
    }, session);

    if (Array.isArray(payload.photos) && payload.photos.length > 0) {
      for (let i = 0; i < payload.photos.length; i++) {
        if (payload.photos[i]) {
          await createDocument(FacilityImage, {
            facility_id: facility._id,
            image_url: payload.photos[i].trim(),
            is_primary: i === 0
          }, session).catch(() => {});
        }
      }
    }
  }

  return pendingRegistration(user, role_name, facility);
};



const login = async ({ email, password }) => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    const error = new Error("Missing required fields: email, password");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).populate("role_id");
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const error = new Error("Email or password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  try {
    assertActiveAccount(user);
  } catch (error) {
    if (['PENDING_APPROVAL', 'REGISTRATION_REJECTED'].includes(error.code)) {
      const facility = await Facility.findOne({ vendor_id: user._id }).select('name').sort({ created_at: 1 });
      error.registration = {
        status: error.code === 'PENDING_APPROVAL' ? 'PENDING' : 'REJECTED',
        approvalStatus: approvalStatusOf(user),
        full_name: user.full_name,
        email: user.email,
        role: user.role_id?.role_name,
        facility_name: facility?.name || user.full_name,
        rejectionReason: user.rejectionReason || null,
      };
    }
    throw error;
  }

  if (!user.password_hash.startsWith("$2")) {
    user.password_hash = await hashPassword(password);
    await user.save();
  }

  const roleName = user.role_id?.role_name || ROLES.CUSTOMER;
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: roleName,
  });
  return {
    token,
    user: toAuthUser(user, roleName, permissionsOf(user.role_id)),
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId)
    .select("-password_hash")
    .populate("role_id");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  assertActiveAccount(user);
  return {
    id: user._id,
    full_name: user.full_name,
    email: user.email,
    permissions: permissionsOf(user.role_id),
    phone: user.phone,
    role: user.role_id?.role_name || ROLES.CUSTOMER,
    status: user.status,
    approvalStatus: approvalStatusOf(user),
    total_loyalty_points: user.total_loyalty_points,
  };
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  becomePartner,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
