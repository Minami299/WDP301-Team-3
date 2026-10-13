const { User, Role } = require("../models");
const { ROLES, generateToken } = require("../middlewares/authMiddleware");
const { permissionsOf } = require("../configs/permissions");
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

const toAuthUser = (user, roleName, permissions) => ({
  id: user._id,
  full_name: user.full_name,
  email: user.email,
  role: roleName,
  permissions,
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

const register = async ({ full_name, email, password, confirm_password }) => {
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

  const role = await ensureCustomerRole();
  const user = await User.create({
    full_name: full_name.trim(),
    email: cleanEmail,
    password_hash: await hashPassword(password),
    role_id: role._id,
    status: "ACTIVE",
    is_verified: false,
  });

  const delivery = await issueVerificationOtp(user);
  return {
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

const login = async ({ email, password }) => {
  if (!email || !password) {
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

  return {
    id: user._id,
    full_name: user.full_name,
    email: user.email,
    permissions: permissionsOf(user.role_id),
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
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
