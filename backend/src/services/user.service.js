const { User, UserProfile, PartnerApplication, Facility, Service } = require("../models");
const { approvalStatusOf, PARTNER_ROLES } = require('../utils/accountStatus');
const { permissionsOf } = require('../configs/permissions');
const { ROLES } = require("../middlewares/authMiddleware");
const { hashPassword, verifyPassword } = require("../utils/password");
const avatarService = require("./avatar.service");
const emailService = require("./email.service");
const crypto = require("crypto");

const OTP_TTL_MS = 5 * 60 * 1000;
const EMAIL_OTP_COOLDOWN_MS = 60 * 1000;
const EMAIL_OTP_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_OTP_MAX_REQUESTS = 5;
const EMAIL_OTP_MAX_ATTEMPTS = 5;
const EMAIL_OTP_LOCK_MS = 15 * 60 * 1000;
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const createOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");

const rateLimitError = (retryAfterMs, message) => {
  const error = new Error(message);
  error.statusCode = 429;
  error.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return error;
};

const smtpFailureMessage = (error) => {
  if (error.code === "SMTP_NOT_CONFIGURED") return error.message;
  if (error.code === "EDNS" || error.code === "ENOTFOUND") {
    return "SMTP hostname could not be resolved. Check SMTP_HOST and DNS settings.";
  }
  if (error.code === "EAUTH") {
    return "SMTP authentication failed. Check SMTP_USER and the provider app password.";
  }
  if (["ECONNECTION", "ESOCKET", "ETIMEDOUT"].includes(error.code)) {
    return "Could not connect to the SMTP server. Check SMTP_HOST, SMTP_PORT, and network access.";
  }
  return error.code
    ? `SMTP delivery failed (${error.code}). Check backend SMTP diagnostics.`
    : "SMTP delivery failed. Check backend SMTP diagnostics.";
};

const MANAGEMENT_ROLES = [ROLES.ADMIN];

const canManageUsers = (role) => MANAGEMENT_ROLES.includes(role);

const canAccessUser = (actor, targetUserId) => {
  return (
    canManageUsers(actor.role) || String(actor.id) === String(targetUserId)
  );
};

const assertCanAccessUser = (actor, targetUserId) => {
  if (!canAccessUser(actor, targetUserId)) {
    const error = new Error(
      "Forbidden: You can only access your own user resource",
    );
    error.statusCode = 403;
    throw error;
  }
};

const getUsers = async () => {
  return User.find().select("-password_hash").populate("role_id", "role_name");
};

const getUserById = async (actor, id, businessProfile = false) => {
  if (!businessProfile) assertCanAccessUser(actor, id);
  else if (actor.role !== ROLES.MANAGER) throw Object.assign(new Error('Manager access required'), { statusCode: 403 });

  const user = await User.findById(id)
    .select(businessProfile ? "full_name email phone status role_id approvalStatus approvalReviewedBy approvalReviewedAt rejectionReason" : "-password_hash")
    .populate("role_id", "role_name");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (businessProfile) {
    if (!PARTNER_ROLES.includes(user.role_id?.role_name)) throw Object.assign(new Error('Partner not found'), { statusCode: 404 });
    const reviewer = await User.findById(actor.id).populate('role_id');
    if (!permissionsOf(reviewer?.role_id).includes('partners.view')) throw Object.assign(new Error('Forbidden: missing permission partners.view'), { statusCode: 403 });
    const facilities = await Facility.find({ vendor_id: user._id }).lean();
    const services = await Service.find({ facility_id: { $in: facilities.map(facility => facility._id) } }).lean();
    const reviewedBy = user.approvalReviewedBy ? await User.findById(user.approvalReviewedBy).select('full_name email').lean() : null;
    return { ...user.toObject(), approvalStatus: approvalStatusOf(user), reviewedBy, facilities: facilities.map(facility => ({ ...facility, services: services.filter(service => String(service.facility_id) === String(facility._id)) })), profile: await UserProfile.findOne({ user_id: user._id }).lean() };
  }
  return user;
};

const createUser = async (actor, payload) => {
  return require('./admin.service').createUser(actor, payload);
};

const updateUser = async (actor, id, body) => {
  assertCanAccessUser(actor, id);
  if (actor.role === ROLES.ADMIN) return require('./admin.service').updateUser(actor, id, body);
  if (actor.role === ROLES.MANAGER) throw Object.assign(new Error('Managers cannot administer accounts'), { statusCode: 403 });
  if (['approvalStatus', 'approvalReviewedBy', 'approvalReviewedAt', 'rejectionReason'].some(key => Object.hasOwn(body, key))) throw Object.assign(new Error('Use the authorized partner review action to change approval'), { statusCode: 400 });
  const allowed = ["full_name", "phone"];
  if (canManageUsers(actor.role)) {
    allowed.push("status");
  }

  const payload = {};
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  if (Object.keys(payload).length === 0) {
    const error = new Error("No updatable fields provided");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .select("-password_hash")
    .populate("role_id", "role_name");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id).select("-password_hash");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const getMyProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-password_hash")
    .populate("role_id", "role_name");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  const roleName = user.role_id?.role_name;
  if (!roleName) {
    const error = new Error("User role is not configured");
    error.statusCode = 403;
    throw error;
  }
  const result = {
    id: user._id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: roleName,
    status: user.status,
    is_verified: user.is_verified,
    total_loyalty_points: user.total_loyalty_points,
  };
  const [profile, application] = await Promise.all([
    UserProfile.findOne({ user_id: userId }).select(
      "avatar_url address host_type nationality birth_date residence_country province city_residence preferred_language",
    ),
    PartnerApplication.findOne({ user_id: userId }).select("profile business").lean(),
  ]);
  const applicationData = { ...(application?.business || {}), ...(application?.profile || {}) };
  const profileData = { ...applicationData, ...(profile?.toObject?.() || profile || {}) };
  result.avatar_url = profile?.avatar_url || null;
  result.address = profileData.address || "";
  result.host_type = profileData.host_type || "private";
  result.nationality = profileData.nationality || "";
  result.birth_date = profileData.birth_date || profileData.birthDate || null;
  result.residence_country = profileData.residence_country || "";
  result.province = profileData.province || "";
  result.city_residence = profileData.city_residence || "";
  result.preferred_language = profileData.preferred_language || "Tiếng Việt";
  return result;
};

const assertUserExists = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
};

const requestEmailChange = async (userId, newEmail) => {
  await assertUserExists(userId);
  if (
    typeof newEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())
  ) {
    const error = new Error("Enter a valid new email address");
    error.statusCode = 400;
    throw error;
  }
  const normalizedEmail = newEmail.trim().toLowerCase();
  const user = await User.findById(userId).select(
    "email +email_change_request_count +email_change_request_window_start +email_change_last_sent_at +email_change_blocked_until",
  );
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (normalizedEmail === user.email) {
    const error = new Error(
      "New email must be different from the current email",
    );
    error.statusCode = 400;
    throw error;
  }
  if (await User.exists({ email: normalizedEmail })) {
    const error = new Error("That email address is already in use");
    error.statusCode = 409;
    throw error;
  }

  const now = Date.now();
  const blockedUntil = user.email_change_blocked_until?.getTime();
  if (blockedUntil && blockedUntil > now) {
    throw rateLimitError(
      blockedUntil - now,
      "Too many verification attempts. Try again later.",
    );
  }
  const windowStart = user.email_change_request_window_start?.getTime();
  const activeWindow = windowStart && now - windowStart < EMAIL_OTP_WINDOW_MS;
  const requestCount = activeWindow ? user.email_change_request_count || 0 : 0;
  if (requestCount >= EMAIL_OTP_MAX_REQUESTS) {
    throw rateLimitError(
      EMAIL_OTP_WINDOW_MS - (now - windowStart),
      "Too many verification codes requested. Try again later.",
    );
  }
  const lastSentAt = user.email_change_last_sent_at?.getTime();
  if (lastSentAt && now - lastSentAt < EMAIL_OTP_COOLDOWN_MS) {
    throw rateLimitError(
      EMAIL_OTP_COOLDOWN_MS - (now - lastSentAt),
      "Please wait before requesting another verification code.",
    );
  }

  emailService.assertSmtpConfigured();
  const otp = createOtp();
  user.pending_email = normalizedEmail;
  user.email_change_otp_hash = hashOtp(otp);
  user.email_change_otp_expires_at = new Date(now + OTP_TTL_MS);
  user.email_change_request_count = requestCount + 1;
  user.email_change_request_window_start = activeWindow
    ? user.email_change_request_window_start
    : new Date(now);
  user.email_change_last_sent_at = new Date(now);
  user.email_change_verification_attempts = 0;
  user.email_change_blocked_until = undefined;
  await user.save();
  try {
    await emailService.sendOtpEmail(normalizedEmail, otp, "email change");
  } catch (sendError) {
    user.pending_email = undefined;
    user.email_change_otp_hash = undefined;
    user.email_change_otp_expires_at = undefined;
    await user.save();
    const error = new Error(smtpFailureMessage(sendError));
    error.statusCode = sendError.statusCode || 502;
    throw error;
  }
  return {
    message: "Verification code sent to the new email address",
    resendAfterSeconds: Math.ceil(EMAIL_OTP_COOLDOWN_MS / 1000),
  };
};

const verifyEmailChange = async (userId, otp) => {
  await assertUserExists(userId);
  if (!/^\d{6}$/.test(otp || "")) {
    const error = new Error("Enter the 6-digit verification code");
    error.statusCode = 400;
    throw error;
  }
  const user = await User.findById(userId).select(
    "+pending_email +email_change_otp_hash +email_change_otp_expires_at +email_change_verification_attempts +email_change_blocked_until",
  );
  const now = Date.now();
  const blockedUntil = user?.email_change_blocked_until?.getTime();
  if (blockedUntil && blockedUntil > now) {
    throw rateLimitError(
      blockedUntil - now,
      "Too many verification attempts. Try again later.",
    );
  }
  if (
    !user?.pending_email ||
    !user.email_change_otp_hash ||
    !user.email_change_otp_expires_at ||
    user.email_change_otp_expires_at.getTime() <= now ||
    user.email_change_otp_hash !== hashOtp(otp)
  ) {
    if (
      user?.pending_email &&
      user.email_change_otp_hash &&
      user.email_change_otp_expires_at?.getTime() > now
    ) {
      user.email_change_verification_attempts =
        (user.email_change_verification_attempts || 0) + 1;
      if (user.email_change_verification_attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
        user.email_change_blocked_until = new Date(now + EMAIL_OTP_LOCK_MS);
        await user.save();
        throw rateLimitError(
          EMAIL_OTP_LOCK_MS,
          "Too many verification attempts. Try again later.",
        );
      }
      await user.save();
    }
    const error = new Error("Invalid or expired email verification code");
    error.statusCode = 400;
    throw error;
  }
  let updated;
  try {
    updated = await User.findOneAndUpdate(
      {
        _id: userId,
        pending_email: user.pending_email,
        email_change_otp_hash: hashOtp(otp),
        email_change_otp_expires_at: { $gt: new Date() },
      },
      {
        $set: { email: user.pending_email, is_verified: true },
        $unset: {
          pending_email: 1,
          email_change_otp_hash: 1,
          email_change_otp_expires_at: 1,
          email_change_verification_attempts: 1,
          email_change_blocked_until: 1,
        },
      },
      { new: true, runValidators: true },
    );
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error("That email address is already in use");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
  if (!updated) {
    const error = new Error("Invalid or expired email verification code");
    error.statusCode = 400;
    throw error;
  }
  return getMyProfile(userId);
};

const updateMyProfile = async (userId, body) => {
  const protectedFields = [
    "role_id",
    "role",
    "status",
    "permissions",
    "avatar_url",
    "approvalStatus",
    "approvalReviewedBy",
    "approvalReviewedAt",
    "rejectionReason",
  ];
  if (protectedFields.some((field) => Object.hasOwn(body, field))) {
    const error = new Error("Role and account status cannot be changed here");
    error.statusCode = 400;
    throw error;
  }
  await assertUserExists(userId);

  const userPayload = {};
  const profilePayload = {};
  if (body.full_name !== undefined) {
    if (
      typeof body.full_name !== "string" ||
      !body.full_name.trim() ||
      body.full_name.trim().length > 120
    ) {
      const error = new Error("Full name must be between 1 and 120 characters");
      error.statusCode = 400;
      throw error;
    }
    userPayload.full_name = body.full_name.trim();
  }
  if (body.phone !== undefined) {
    if (
      body.phone !== null &&
      (typeof body.phone !== "string" || body.phone.length > 30)
    ) {
      const error = new Error(
        "Phone must be a string no longer than 30 characters",
      );
      error.statusCode = 400;
      throw error;
    }
    userPayload.phone = body.phone?.trim() || null;
  }
  if (body.address !== undefined) {
    if (typeof body.address !== "string" || body.address.length > 500) {
      const error = new Error(
        "Address must be a string no longer than 500 characters",
      );
      error.statusCode = 400;
      throw error;
    }
    profilePayload.address = body.address.trim();
  }
  for (const field of ["host_type", "nationality", "residence_country", "province", "city_residence", "preferred_language"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].length > 120) {
        const error = new Error(`${field} must be a string no longer than 120 characters`);
        error.statusCode = 400;
        throw error;
      }
      profilePayload[field] = body[field].trim();
    }
  }
  if (body.birth_date !== undefined) {
    if (body.birth_date !== null && (typeof body.birth_date !== "string" || Number.isNaN(Date.parse(body.birth_date)))) {
      const error = new Error("Birth date is invalid");
      error.statusCode = 400;
      throw error;
    }
    profilePayload.birth_date = body.birth_date || null;
  }
  if (!Object.keys(userPayload).length && !Object.keys(profilePayload).length) {
    const error = new Error("No editable profile fields provided");
    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(userPayload).length) {
    await User.findByIdAndUpdate(userId, userPayload, { runValidators: true });
  }
  if (Object.keys(profilePayload).length) {
    await UserProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: profilePayload, $setOnInsert: { user_id: userId } },
      { upsert: true, new: true, runValidators: true },
    );
  }
  return getMyProfile(userId);
};

const uploadMyAvatar = async (userId, file) => {
  await getMyProfile(userId);
  const previousProfile = await UserProfile.findOne({ user_id: userId }).select(
    "avatar_url",
  );
  let uploaded;
  try {
    uploaded = await avatarService.uploadBuffer(
      file.buffer,
      userId,
      file.mimetype,
    );
  } catch (error) {
    if (error.statusCode) throw error;
    console.error("Cloudinary avatar upload failed", {
      code: error.code,
      httpCode: error.http_code,
    });
    const detail =
      error.http_code === 401 || error.http_code === 403
        ? "Cloudinary rejected the configured credentials."
        : error.code === "ETIMEDOUT" || error.code === "ECONNRESET"
          ? "Cloudinary could not be reached. Check network access."
          : "Cloudinary rejected the image upload.";
    const uploadError = new Error(`Avatar upload failed. ${detail}`);
    uploadError.statusCode = 502;
    throw uploadError;
  }
  try {
    await UserProfile.findOneAndUpdate(
      { user_id: userId },
      {
        $set: { avatar_url: uploaded.secureUrl },
        $setOnInsert: { user_id: userId },
      },
      { upsert: true, new: true, runValidators: true },
    );
  } catch (error) {
    await avatarService.deleteByPublicId(uploaded.publicId).catch(() => {});
    throw error;
  }

  const previousPublicId = avatarService.publicIdFromUrl(
    previousProfile?.avatar_url,
  );
  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    await avatarService.deleteByPublicId(previousPublicId).catch((error) => {
      console.error("Previous avatar cleanup failed", { code: error.code });
    });
  }
  return getMyProfile(userId);
};

const deleteMyAvatar = async (userId) => {
  await getMyProfile(userId);
  const profile = await UserProfile.findOne({ user_id: userId }).select(
    "avatar_url",
  );
  if (!profile?.avatar_url) return getMyProfile(userId);
  const oldUrl = profile.avatar_url;
  await UserProfile.findOneAndUpdate(
    { user_id: userId },
    { $set: { avatar_url: null } },
  );
  const publicId = avatarService.publicIdFromUrl(oldUrl);
  if (publicId) {
    await avatarService.deleteByPublicId(publicId).catch((error) => {
      console.error("Avatar cleanup failed", { code: error.code });
    });
  }
  return getMyProfile(userId);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    const error = new Error("Current password and new password are required");
    error.statusCode = 400;
    throw error;
  }
  if (newPassword.length < 8) {
    const error = new Error("New password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
  if (currentPassword === newPassword) {
    const error = new Error(
      "New password must differ from the current password",
    );
    error.statusCode = 400;
    throw error;
  }
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }
  user.password_hash = await hashPassword(newPassword);
  await user.save();
  return { message: "Password changed successfully" };
};

module.exports = {
  getPartnerRegistration: (actor, id) => getUserById(actor, id, true),
  canManageUsers,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  requestEmailChange,
  verifyEmailChange,
  uploadMyAvatar,
  deleteMyAvatar,
  changePassword,
};
