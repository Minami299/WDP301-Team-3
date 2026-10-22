const { User, UserProfile, Role, Facility } = require("../models");
const { ROLES, generateToken } = require("../middlewares/authMiddleware");
const { permissionsOf } = require("../configs/permissions");
const { hashPassword, verifyPassword } = require("../utils/password");
const crypto = require("crypto");
const emailService = require("./email.service");
const authOtp = require('./authOtp.service');
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

const createDocument = async (Model, fields, session) => session ? (await Model.create([fields], { session }))[0] : Model.create(fields);

const register = async (payload = {}, session) => {
  if (['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(payload.role_name)) {
    return require('./partnerApplication.service').register(payload);
  }
  const {
    full_name, email, password, confirm_password, role_name, phone,
    host_type, nationality, birth_date, residence_country, province, city_residence, preferred_language,
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

  emailService.assertSmtpConfigured();
  let role = await Role.findOne({ role_name: ROLES.CUSTOMER });
  if (!role) role = await Role.create({ role_name: ROLES.CUSTOMER, description: 'Customer' });
  const user = await createDocument(User, {
    full_name: full_name.trim(), email: cleanEmail, phone: phone ? phone.trim() : null,
    password_hash: await hashPassword(password), role_id: role._id,
    status: 'ACTIVE', is_verified: false,
  }, session);

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

const becomePartner = (userId, payload) => require('./partnerApplication.service').startExisting(userId, payload);

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
