const { User, UserProfile, Role, Facility, Service, Amenity, FacilityAmenity, FacilityImage } = require("../models");
const { ROLES, generateToken } = require("../middlewares/authMiddleware");
const { hashPassword, verifyPassword } = require("../utils/password");
const crypto = require("crypto");
const emailService = require("./email.service");

const OTP_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const createOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");
const invalidOtpError = () => {
  const error = new Error("Invalid or expired verification code");
  error.statusCode = 400;
  return error;
};

const toAuthUser = (user, roleName) => ({
  id: user._id,
  full_name: user.full_name,
  email: user.email,
  role: roleName,
  status: user.status,
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

const register = async (payload) => {
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
  if (!full_name || !email || !password) {
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
    const error = new Error("Email already exists");
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
    status: "ACTIVE",
    is_verified: false,
  });

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
      { upsert: true, new: true }
    ).catch(() => {});
  }

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
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      size: facility_size !== undefined ? Number(facility_size) : null,
      promotions: promotions || {},
      payout_method: payout_method || 'bank_transfer',
      check_in_policy: check_in_policy || {},
      status: 'ACTIVE'
    });

    // Lưu các tiện ích của cơ sở lưu trú nếu có
    if (Array.isArray(amenities) && amenities.length > 0) {
      for (const item of amenities) {
        if (!item || typeof item !== 'string') continue;
        let amenityDoc = await Amenity.findOne({ name: item.trim() });
        if (!amenityDoc) {
          amenityDoc = await Amenity.create({ name: item.trim(), type: 'HOTEL_FACILITY' });
        }
        await FacilityAmenity.create({ facility_id: facility._id, amenity_id: amenityDoc._id }).catch(() => {});
      }
    }

    const serviceType = targetRoleName === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
    if (Array.isArray(rooms) && rooms.length > 0) {
      for (const r of rooms) {
        await Service.create({
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
        });

        if (Array.isArray(r.photos) && r.photos.length > 0) {
          for (let i = 0; i < r.photos.length; i++) {
            if (r.photos[i]) {
              await FacilityImage.create({
                facility_id: facility._id,
                image_url: r.photos[i].trim(),
                is_primary: i === 0 && r === rooms[0]
              }).catch(() => {});
            }
          }
        }
      }
    } else {
      await Service.create({
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
      });

      if (Array.isArray(photos) && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          if (photos[i]) {
            await FacilityImage.create({
              facility_id: facility._id,
              image_url: photos[i].trim(),
              is_primary: i === 0
            }).catch(() => {});
          }
        }
      }
    }
  }

  const delivery = await issueVerificationOtp(user);
  const token = generateToken({ id: user._id, email: user.email, role: targetRoleName });

  return {
    token,
    user: toAuthUser(user, targetRoleName),
    email: user.email,
    verificationEmailSent: delivery.sent,
    verificationEmailError: delivery.error,
  };
};

const issueVerificationOtp = async (user) => {
  const otp = createOtp();
  user.verification_otp_hash = hashValue(otp);
  user.verification_otp_expires_at = new Date(Date.now() + OTP_TTL_MS);
  await user.save();
  try {
    await emailService.sendOtpEmail(user.email, otp, "verification");
  } catch (error) {
    return {
      sent: false,
      error:
        error.code === "SMTP_NOT_CONFIGURED"
          ? error.message
          : "Email delivery failed. Check SMTP settings and backend logs.",
    };
  }
  return { sent: true };
};

const verifyEmail = async ({ email, otp }) => {
  if (!email || !/^\d{6}$/.test(otp || "")) throw invalidOtpError();
  const user = await User.findOneAndUpdate(
    {
      email: email.trim().toLowerCase(),
      is_verified: false,
      verification_otp_hash: hashValue(otp),
      verification_otp_expires_at: { $gt: new Date() },
    },
    {
      $set: { is_verified: true },
      $unset: { verification_otp_hash: 1, verification_otp_expires_at: 1 },
    },
    { new: true },
  );
  if (!user) throw invalidOtpError();
  return { email: user.email, is_verified: true };
};

const resendVerification = async ({ email }) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }
  emailService.assertSmtpConfigured();
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    is_verified: false,
  });
  if (user) await issueVerificationOtp(user);
  return {
    message: "If the account can be verified, a new code has been sent.",
  };
};

const forgotPassword = async ({ email }) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }
  emailService.assertSmtpConfigured();
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    is_verified: true,
  });
  if (user) {
    const otp = createOtp();
    user.reset_otp_hash = hashValue(otp);
    user.reset_otp_expires_at = new Date(Date.now() + OTP_TTL_MS);
    user.password_reset_token_hash = undefined;
    user.password_reset_token_expires_at = undefined;
    await user.save();
    try {
      await emailService.sendOtpEmail(user.email, otp, "password reset");
    } catch {}
  }
  return {
    message: "If an account exists for this email, a reset code has been sent.",
  };
};

const verifyResetOtp = async ({ email, otp }) => {
  if (!email || !/^\d{6}$/.test(otp || "")) throw invalidOtpError();
  const resetToken = crypto.randomBytes(32).toString("hex");
  const user = await User.findOneAndUpdate(
    {
      email: email.trim().toLowerCase(),
      is_verified: true,
      reset_otp_hash: hashValue(otp),
      reset_otp_expires_at: { $gt: new Date() },
    },
    {
      $set: {
        password_reset_token_hash: hashValue(resetToken),
        password_reset_token_expires_at: new Date(
          Date.now() + PASSWORD_RESET_TTL_MS,
        ),
      },
      $unset: { reset_otp_hash: 1, reset_otp_expires_at: 1 },
    },
    { new: true },
  );
  if (!user) throw invalidOtpError();
  return { resetToken };
};

const resetPassword = async ({ email, resetToken, new_password }) => {
  if (!email || !resetToken || !new_password) {
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
      email: email.trim().toLowerCase(),
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

const becomePartner = async (userId, payload) => {
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
      { upsert: true, new: true }
    ).catch(() => {});
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
    latitude: latitude !== undefined ? Number(latitude) : null,
    longitude: longitude !== undefined ? Number(longitude) : null,
    size: facility_size !== undefined ? Number(facility_size) : null,
    promotions: promotions || {},
    payout_method: payout_method || 'bank_transfer',
    check_in_policy: check_in_policy || {},
    status: 'ACTIVE'
  });

  // Lưu các tiện ích của cơ sở lưu trú nếu có
  if (Array.isArray(payload.amenities) && payload.amenities.length > 0) {
    for (const item of payload.amenities) {
      if (!item || typeof item !== 'string') continue;
      let amenityDoc = await Amenity.findOne({ name: item.trim() });
      if (!amenityDoc) {
        amenityDoc = await Amenity.create({ name: item.trim(), type: 'HOTEL_FACILITY' });
      }
      await FacilityAmenity.create({ facility_id: facility._id, amenity_id: amenityDoc._id }).catch(() => {});
    }
  }

  // Khởi tạo dịch vụ ban đầu cho cơ sở
  const serviceType = role_name === ROLES.HOTEL_OWNER ? 'ROOM' : 'TICKET';
  if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
    for (const r of payload.rooms) {
      await Service.create({
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
      });

      if (Array.isArray(r.photos) && r.photos.length > 0) {
        for (let i = 0; i < r.photos.length; i++) {
          if (r.photos[i]) {
            await FacilityImage.create({
              facility_id: facility._id,
              image_url: r.photos[i].trim(),
              is_primary: i === 0 && r === payload.rooms[0]
            }).catch(() => {});
          }
        }
      }
    }
  } else {
    await Service.create({
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
    });

    if (Array.isArray(payload.photos) && payload.photos.length > 0) {
      for (let i = 0; i < payload.photos.length; i++) {
        if (payload.photos[i]) {
          await FacilityImage.create({
            facility_id: facility._id,
            image_url: payload.photos[i].trim(),
            is_primary: i === 0
          }).catch(() => {});
        }
      }
    }
  }

  const token = generateToken({ id: user._id, email: user.email, role: role_name });
  return { token, user: toAuthUser(user, role_name), facility };
};



const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Missing required fields: email, password");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).populate("role_id", "role_name");
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const error = new Error("Email or password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  if (user.is_verified === false) {
    const error = new Error("Verify your email before logging in");
    error.statusCode = 403;
    error.code = "EMAIL_NOT_VERIFIED";
    throw error;
  }

  if (["LOCKED", "INACTIVE"].includes(user.status)) {
    const error = new Error("Account is locked or inactive");
    error.statusCode = 403;
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
  return { token, user: toAuthUser(user, roleName) };
};

const getMe = async (userId) => {
  const user = await User.findById(userId)
    .select("-password_hash")
    .populate("role_id", "role_name description");
  if (!user) {
    const error = new Error("User not found");
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
    total_loyalty_points: user.total_loyalty_points,
  };
};

module.exports = {
  register,
  login,
  getMe,
  becomePartner,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
