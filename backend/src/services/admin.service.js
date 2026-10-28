const mongoose = require("mongoose");
const { User, Role, Facility, SystemConfig, Promotion, Service, ServiceInventory, Booking, BookingDetail, VoucherType } = require("../models");
const { ROLES } = require("../middlewares/authMiddleware");
const emailService = require("./email.service");
const PartnerApplication = require('../models/PartnerApplication');
const { hashPassword } = require("../utils/password");
const { approvalStatusOf, PARTNER_ROLES } = require('../utils/accountStatus');
const {
  ALL_KEYS,
  PERMISSIONS,
  permissionsOf,
} = require("../configs/permissions");

const STATUSES = ["ACTIVE", "INACTIVE", "LOCKED", "PENDING"];
const PROTECTED_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
const MAX_PAGE_SIZE = 100;

const createError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  full_name: user.full_name,
  phone: user.phone,
  status: user.status,
  approvalStatus: approvalStatusOf(user),
  approvalReviewedBy: user.approvalReviewedBy,
  approvalReviewedAt: user.approvalReviewedAt,
  rejectionReason: user.rejectionReason,
  lockReason: user.lockReason,
  lockedAt: user.lockedAt,
  is_verified: user.is_verified,
  role: user.role_id?.role_name,
  role_id: user.role_id?._id,
  created_at: user.created_at,
});

const findUserWithRole = (id) =>
  User.findById(id).select("-password_hash").populate("role_id", "role_name");

const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw createError(`Invalid ${label}`, 400);
};

// Managers cannot touch admin or manager accounts; only admins can.
const assertCanTouch = (actor, targetRole) => {
  if (actor.role !== ROLES.ADMIN && PROTECTED_ROLES.includes(targetRole)) {
    throw createError("Only an admin can change this account", 403);
  }
};

const resolveRole = async (actor, { role_id, role_name }) => {
  if (role_id) assertObjectId(role_id, "role id");
  const role = role_id
    ? await Role.findById(role_id)
    : await Role.findOne({ role_name: String(role_name).toUpperCase() });
  if (!role) throw createError("Role not found", 400);
  assertCanTouch(actor, role.role_name);
  return role;
};

const listUsers = async ({ search, role, status, approvalStatus, page = 1, limit = 20 }) => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 20));
  const filter = {};
  if (approvalStatus) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) throw createError('Invalid approval status', 400);
    if (approvalStatus === 'PENDING') filter.$and = [{ $or: [{ approvalStatus: 'PENDING' }, { approvalStatus: null, status: 'PENDING' }] }];
    else if (approvalStatus === 'APPROVED') {
      const partners = await Role.find({ role_name: { $in: PARTNER_ROLES } }).select('_id');
      filter.$and = [{ $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: null, status: 'ACTIVE', role_id: { $in: partners.map(role => role._id) } }] }];
    } else filter.approvalStatus = 'REJECTED';
  }

  if (status) {
    if (!STATUSES.includes(status)) throw createError("Invalid status", 400);
    filter.status = status;
  }
  if (role) {
    const roleDoc = await Role.findOne({ role_name: String(role).toUpperCase() });
    filter.role_id = roleDoc ? roleDoc._id : null;
  }
  const term = String(search || "").trim().slice(0, 100);
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: pattern }, { full_name: pattern }, { phone: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash")
      .populate("role_id", "role_name")
      .sort({ created_at: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);
  return {
    items: users.map(publicUser),
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

const createUser = async (actor, body) => {
  const { email, full_name, phone, password, role_id, role_name, status } = body;
  if (!email || !full_name || !password) {
    throw createError("Missing required fields: email, full_name, password", 400);
  }
  if (String(password).length < 8) {
    throw createError("Password must be at least 8 characters", 400);
  }
  if (status && !STATUSES.includes(status)) throw createError("Invalid status", 400);
  const role = await resolveRole(actor, {
    role_id,
    role_name: role_name || ROLES.CUSTOMER,
  });
  if (PARTNER_ROLES.includes(role.role_name)) throw createError('Create a customer account, then submit a partner application for review', 400);
  if (status === 'PENDING' && ![ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR].includes(role.role_name)) throw createError('Pending Approval only applies to partner accounts', 400);
  const user = await User.create({
    email: String(email).trim().toLowerCase(),
    full_name: String(full_name).trim(),
    phone: phone || null,
    password_hash: await hashPassword(String(password)),
    role_id: role._id,
    status: status || "ACTIVE",
    ...(status === 'PENDING' ? { approvalStatus: 'PENDING' } : {}),
    is_verified: true,
  });
  return publicUser(await findUserWithRole(user._id));
};

const updateUser = async (actor, id, body) => {
  assertObjectId(id, "user id");
  const user = await findUserWithRole(id);
  if (!user) throw createError("User not found", 404);
  assertCanTouch(actor, user.role_id?.role_name);

  const isSelf = String(actor.id) === String(id);
  const changes = {};
  const currentApproval = approvalStatusOf(user);
  const application = await PartnerApplication.findOne({ user_id: id }).select('status role');
  if (application && application.status !== 'APPROVED' && body.email !== undefined && String(body.email).trim().toLowerCase() !== user.email) {
    throw createError('Use the email verification flow while a partner application is open', 409);
  }
  if (application && application.status !== 'APPROVED' && (body.role_id || body.role_name || body.approvalStatus || body.status === 'PENDING')) {
    throw createError('Use the partner application review action before assigning a business role', 409);
  }
  if (!application && user.role_id?.role_name === ROLES.CUSTOMER && (body.role_id || body.role_name)) {
    const requestedRole = await resolveRole(actor, body);
    if (PARTNER_ROLES.includes(requestedRole.role_name)) throw createError('A reviewed partner application is required before assigning this role', 409);
  }
  if (application?.status === 'APPROVED' && (body.role_id || body.role_name)) {
    const requestedRole = await resolveRole(actor, body);
    if (PARTNER_ROLES.includes(requestedRole.role_name) && requestedRole.role_name !== application.role) throw createError('The requested role does not match the approved partner application', 409);
  }
  const decision = body.approvalStatus || (currentApproval === 'PENDING' && body.status === 'ACTIVE' ? 'APPROVED' : null);
  if (decision && !['APPROVED', 'REJECTED'].includes(decision)) throw createError('Review decision must be APPROVED or REJECTED', 400);
  if (decision && (!PROTECTED_ROLES.includes(actor.role) || !PARTNER_ROLES.includes(user.role_id?.role_name))) throw createError('Only an admin or manager can review partner registrations', 403);
  if (decision) {
    const reviewer = await User.findById(actor.id).select('role_id').populate('role_id');
    if (!permissionsOf(reviewer?.role_id).includes('users.lock')) throw createError('Forbidden: missing permission users.lock', 403);
  }
  if (decision && currentApproval !== 'PENDING') throw createError('Registration was already reviewed; reload the account list', 409);
  if (decision && (body.role_id || body.role_name) && String(body.role_id || '') !== String(user.role_id?._id || '') && body.role_name !== user.role_id?.role_name) throw createError('Review the registration before changing its role', 400);
  if (decision === 'REJECTED' && (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000)) throw createError('A rejection reason between 1 and 1000 characters is required', 400);
  let targetRoleName = user.role_id?.role_name;
  if (body.full_name !== undefined) changes.full_name = String(body.full_name).trim();
  if (body.phone !== undefined) changes.phone = body.phone || null;
  if (body.email !== undefined) changes.email = String(body.email).trim().toLowerCase();
  if (body.password) {
    if (String(body.password).length < 8) {
      throw createError("Password must be at least 8 characters", 400);
    }
    changes.password_hash = await hashPassword(String(body.password));
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw createError("Invalid status", 400);
    if (isSelf && body.status !== "ACTIVE") {
      throw createError("You cannot deactivate your own account", 400);
    }
    changes.status = body.status;
    if (body.status === "LOCKED") {
      if (user.status === "LOCKED") throw createError("Account is already locked", 400);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason || reason.length > 1000) {
        throw createError("A lock reason between 1 and 1000 characters is required", 400);
      }
      changes.lockReason = reason;
      changes.lockedBy = actor.id;
      changes.lockedAt = new Date();
    } else if (user.status === "LOCKED") {
      changes.lockReason = null;
      changes.lockedBy = null;
      changes.lockedAt = null;
    }
  }
  if (body.role_id || body.role_name) {
    const role = await resolveRole(actor, body);
    targetRoleName = role.role_name;
    if (isSelf && String(role._id) !== String(user.role_id?._id)) {
      throw createError("You cannot change your own role", 400);
    }
    changes.role_id = role._id;
  }
  if (decision) {
    changes.approvalStatus = decision;
    changes.status = decision === 'APPROVED' ? 'ACTIVE' : 'INACTIVE';
    changes.approvalReviewedBy = actor.id;
    changes.approvalReviewedAt = new Date();
    changes.rejectionReason = decision === 'REJECTED' ? body.reason.trim() : null;
  } else if (currentApproval === 'PENDING' && !user.approvalStatus) {
    changes.approvalStatus = 'PENDING';
  }
  if (!Object.keys(changes).length) {
    throw createError("No updatable fields provided", 400);
  }

  if ((currentApproval === 'PENDING' || changes.status === 'PENDING') && !PROTECTED_ROLES.includes(actor.role)) throw createError('Only an admin or manager can review partner registrations', 403);
  if ((changes.status || user.status) === 'PENDING' && ![ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR].includes(targetRoleName)) throw createError('Pending Approval only applies to partner accounts', 400);
  if (changes.status === 'PENDING' && currentApproval !== 'PENDING') throw createError('Reviewed accounts cannot be reset through the account status form', 400);
  if (decision) {
    await mongoose.connection.transaction(async session => {
      const updated = await User.findOneAndUpdate({ _id: id, $or: [{ approvalStatus: 'PENDING' }, { approvalStatus: null, status: 'PENDING' }] }, { $set: changes }, { session, runValidators: true, new: true });
      if (!updated) throw createError('Registration was already reviewed; reload the account list', 409);
      await Facility.updateMany({ vendor_id: id, status: 'PENDING' }, { $set: { status: decision === 'APPROVED' ? 'ACTIVE' : 'INACTIVE' } }, { session });
    });
  } else {
    await User.findByIdAndUpdate(id, changes, { runValidators: true });
  }
  const result = publicUser(await findUserWithRole(id));
  if (decision) {
    try {
      await emailService.sendPartnerReviewEmail({
        email: user.email,
        fullName: user.full_name,
        role: user.role_id?.role_name,
        approved: decision === 'APPROVED',
        reason: changes.rejectionReason,
      });
      result.emailSent = true;
    } catch (error) {
      console.error('Partner review email failed', error.code || error.message);
      result.emailSent = false;
    }
  }
  return result;
};

const setStatus = (actor, id, status) => updateUser(actor, id, { status });

const listRoles = async () => {
  const roles = await Role.find().sort({ _id: 1 });
  const counts = await User.aggregate([
    { $group: { _id: "$role_id", n: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((row) => [String(row._id), row.n]));
  return {
    catalog: PERMISSIONS,
    roles: roles.map((role) => ({
      id: role._id,
      role_name: role.role_name,
      description: role.description,
      permissions: permissionsOf(role),
      user_count: countById.get(String(role._id)) || 0,
      locked: role.role_name === ROLES.ADMIN,
    })),
  };
};

const setRolePermissions = async (id, permissions) => {
  assertObjectId(id, "role id");
  if (!Array.isArray(permissions)) {
    throw createError("permissions must be an array", 400);
  }
  const unknown = permissions.filter((key) => !ALL_KEYS.includes(key));
  if (unknown.length) {
    throw createError(`Unknown permissions: ${unknown.join(", ")}`, 400);
  }

  const role = await Role.findById(id);
  if (!role) throw createError("Role not found", 404);
  if (role.role_name === ROLES.ADMIN) {
    throw createError("ADMIN permissions cannot be changed", 400);
  }
  role.permissions = [...new Set(permissions)];
  await role.save();
  return { id: role._id, role_name: role.role_name, permissions: role.permissions };
};

const getOverview = async () => {
  const [byStatus, byRole, recent] = await Promise.all([
    User.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    User.aggregate([
      { $lookup: { from: "roles", localField: "role_id", foreignField: "_id", as: "role" } },
      { $group: { _id: { $arrayElemAt: ["$role.role_name", 0] }, n: { $sum: 1 } } },
    ]),
    User.find()
      .select("-password_hash")
      .populate("role_id", "role_name")
      .sort({ created_at: -1 })
      .limit(5),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.n]));
  const status = toMap(byStatus);
  return {
    total: Object.values(status).reduce((sum, n) => sum + n, 0),
    by_status: status,
    by_role: toMap(byRole),
    recent: recent.map(publicUser),
  };
};

const listConfigs = async () => {
  const configs = await SystemConfig.find().sort({ config_key: 1 });
  return configs;
};

const updateConfig = async (actor, key, { config_value, description }) => {
  if (config_value === undefined || config_value === null || String(config_value).trim() === "") {
    throw createError("Giá trị cấu hình không được để trống", 400);
  }
  const strVal = String(config_value).trim();

  // Validate Tỷ lệ chiết khấu sàn thu (%):
  // Không được để trống và phải là số từ 0.0% đến 50.0%
  // Độ chính xác thập phân: tối đa 1 chữ số sau dấu phẩy
  if (key === "COMMISSION_RATE_DEFAULT") {
    const num = Number(strVal);
    if (isNaN(num) || num < 0 || num > 50) {
      throw createError("Tỷ lệ hoa hồng sàn mặc định phải là số từ 0.0% đến 50.0%", 400);
    }
    if (!/^\d+(\.\d{1})?$/.test(strVal)) {
      throw createError("Tỷ lệ hoa hồng chỉ được phép có tối đa 1 chữ số thập phân (ví dụ: 10.5%)", 400);
    }
  }

  // Validate Chính sách Điểm thưởng (Loyalty):
  // Giá trị quy đổi phải là số nguyên dương và chia hết cho 100 hoặc 1.000
  if (key === "LOYALTY_POINT_VALUE") {
    const num = Number(strVal);
    if (!Number.isInteger(num) || num <= 0) {
      throw createError("Giá trị quy đổi điểm thưởng phải là số nguyên dương", 400);
    }
    if (num % 100 !== 0) {
      throw createError("Giá trị quy đổi điểm thưởng phải là bội số của 100 hoặc 1.000 VNĐ", 400);
    }
  }

  // Tỷ lệ tích điểm từ 0.1% đến 10.0%
  if (key === "LOYALTY_EARN_PERCENTAGE" || key === "LOYALTY_EARN_RATE") {
    const earnRate = Number(strVal);
    if (isNaN(earnRate) || earnRate < 0.1 || earnRate > 10.0) {
      throw createError("Tỷ lệ tích điểm thưởng phải là số từ 0.1% đến 10.0%", 400);
    }
  }

  const updated = await SystemConfig.findOneAndUpdate(
    { config_key: key },
    {
      config_value: strVal,
      ...(description !== undefined ? { description } : {}),
    },
    { new: true, upsert: true }
  );
  return updated;
};

const listVoucherTypes = async () => {
  let types = await VoucherType.find({ is_active: true }).sort({ order: 1, createdAt: 1 }).lean();
  if (!types || types.length === 0) {
    const defaultTypes = [
      {
        code: "GENERAL",
        name: "Toàn sàn",
        description: "Áp dụng cho mọi khách sạn, vé tham quan và dịch vụ trên Travelio",
        code_prefix: "TVL",
        order: 1,
        is_active: true,
      },
      {
        code: "NEW_USER",
        name: "Khách mới",
        description: "Chỉ áp dụng cho tài khoản chưa từng hoàn tất bất kỳ đơn đặt phòng hoặc vé tham quan nào",
        code_prefix: "WELCOME",
        order: 2,
        is_active: true,
      },
      {
        code: "LOYALTY_POINT",
        name: "Đổi điểm thưởng",
        description: "Khách hàng cần đổi điểm tích lũy thành viên trong ví điểm để áp dụng mã giảm giá này",
        code_prefix: "POINT",
        order: 3,
        is_active: true,
      },
      {
        code: "HOTEL",
        name: "Khách sạn",
        description: "Chỉ áp dụng khi khách hàng đặt phòng khách sạn, homestay, resort",
        code_prefix: "HOTEL",
        order: 4,
        is_active: true,
      },
      {
        code: "ATTRACTION",
        name: "Vé tham quan",
        description: "Chỉ áp dụng khi khách hàng mua vé tham quan, vui chơi giải trí, trải nghiệm",
        code_prefix: "TICKET",
        order: 5,
        is_active: true,
      },
    ];
    await VoucherType.insertMany(defaultTypes);
    types = await VoucherType.find({ is_active: true }).sort({ order: 1, createdAt: 1 }).lean();
  }
  return types;
};

const listPromotions = async ({ search, status, page = 1, limit = 20 }) => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 20));

  // Tự động cập nhật các voucher đã quá hạn sang trạng thái EXPIRED trong DB
  const now = new Date();
  await Promotion.updateMany(
    { status: "ACTIVE", valid_to: { $ne: null, $lt: now } },
    { $set: { status: "EXPIRED" } }
  );

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (search) {
    const term = String(search).trim();
    filter.code = { $regex: term, $options: "i" };
  }

  const [total, items, allPromos, [spentAgg]] = await Promise.all([
    Promotion.countDocuments(filter),
    Promotion.find(filter)
      .sort({ _id: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    Promotion.find({}).lean(),
    Booking.aggregate([
      { $match: { status: { $in: ["CONFIRMED", "COMPLETED"] }, promotion_discount_amount: { $gt: 0 } } },
      { $group: { _id: null, totalSpent: { $sum: "$promotion_discount_amount" } } },
    ]),
  ]);

  let activeCount = 0;
  let expiredOrDisabledCount = 0;
  let totalUses = 0;

  for (const p of allPromos) {
    totalUses += p.used_count || 0;
    const isExpired = p.valid_to && new Date(p.valid_to) < now;
    if (p.status === "EXPIRED" || isExpired || p.status === "DISABLED") {
      expiredOrDisabledCount++;
    } else if (p.status === "ACTIVE") {
      activeCount++;
    }
  }

  const totalDiscountSpent = spentAgg?.totalSpent || 0;

  return {
    total,
    page: pageNumber,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
    items: items.map((p) => {
      const isExpired = p.valid_to && new Date(p.valid_to) < now;
      const effectiveStatus = p.status === "ACTIVE" && isExpired ? "EXPIRED" : p.status;
      return {
        ...p.toObject(),
        status: effectiveStatus,
        max_discount: p.discount_type === "FIXED" ? null : p.max_discount,
      };
    }),
    stats: {
      active_count: activeCount,
      expired_count: expiredOrDisabledCount,
      total_used_count: totalUses,
      total_discount_spent: totalDiscountSpent,
    },
  };
};

const createPromotion = async (actor, data) => {
  const {
    code,
    title,
    description,
    applicable_service = "ALL",
    target_audience = "ALL",
    voucher_type,
    points_required = 0,
    discount_type,
    discount_value,
    max_discount,
    min_order_amount,
    valid_from,
    valid_to,
    usage_limit,
    usage_limit_per_user,
    status = "ACTIVE",
  } = data;

  // 1. Validate Mã Voucher (Code):
  // Bắt buộc nhập & Định dạng chuẩn: Chỉ cho phép chữ cái in hoa (A-Z) và chữ số (0-9), viết liền không dấu, độ dài từ 5 đến 20 ký tự
  if (!code || !String(code).trim()) {
    throw createError("Mã voucher là bắt buộc", 400);
  }
  const cleanCode = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(cleanCode)) {
    throw createError("Mã voucher chỉ được chứa chữ cái in hoa (A-Z) và chữ số (0-9), viết liền không dấu, không khoảng trắng, độ dài từ 5 đến 20 ký tự (ví dụ: TRAVELIO2026)", 400);
  }

  // Kiểm tra trùng lặp (kể cả mã tạm ngưng)
  const existing = await Promotion.findOne({ code: cleanCode });
  if (existing) {
    throw createError(`Mã voucher [${cleanCode}] đã tồn tại trong hệ thống`, 409);
  }

  if (!["PERCENTAGE", "FIXED"].includes(discount_type)) {
    throw createError("Hình thức giảm giá phải là PERCENTAGE hoặc FIXED", 400);
  }

  const numVal = Number(discount_value);
  if (!Number.isFinite(numVal) || numVal <= 0) {
    throw createError("Giá trị giảm giá phải là số lớn hơn 0", 400);
  }

  const minOrderNum = min_order_amount ? Number(min_order_amount) : 0;
  if (minOrderNum < 0) {
    throw createError("Giá trị đơn hàng tối thiểu không được âm", 400);
  }

  // 2. Validate Giá trị giảm & Giảm tối đa:
  let parsedMaxDiscount = null;
  if (discount_type === "PERCENTAGE") {
    if (numVal < 1 || numVal > 70) {
      throw createError("Phần trăm giảm giá phải từ 1% đến 70%", 400);
    }
    // Mức giảm tối đa: Nếu có nhập thì phải tối thiểu 10.000 đ, nếu để trống thì không giới hạn
    if (max_discount !== undefined && max_discount !== null && String(max_discount).trim() !== "") {
      const maxVal = Number(max_discount);
      if (isNaN(maxVal) || maxVal < 10000) {
        throw createError("Mức giảm tối đa (VNĐ) nếu có phải tối thiểu 10.000 ₫", 400);
      }
      parsedMaxDiscount = maxVal;
    } else {
      parsedMaxDiscount = null; // Không giới hạn
    }
  } else {
    // FIXED: tối thiểu 10.000 đ, bội số của 1.000 đ
    if (numVal < 10000 || numVal % 1000 !== 0) {
      throw createError("Số tiền giảm cố định phải tối thiểu 10.000 ₫ và là bội số của 1.000 ₫", 400);
    }
    // Ràng buộc chống lỗ: Số tiền giảm cố định phải nhỏ hơn Giá trị đơn hàng tối thiểu
    if (!minOrderNum || minOrderNum <= numVal) {
      throw createError(`Ràng buộc chống lỗ: Giá trị đơn hàng tối thiểu bắt buộc phải lớn hơn số tiền giảm giá (${numVal.toLocaleString('vi-VN')} ₫)`, 400);
    }
  }

  // 3. Validate Thời gian hiệu lực:
  const todayStr = new Date().toISOString().slice(0, 10);
  if (valid_from && String(valid_from).slice(0, 10) < todayStr) {
    throw createError("Ngày bắt đầu không được là một ngày trong quá khứ", 400);
  }
  const fromDate = valid_from ? new Date(valid_from) : new Date();

  let toDate = null;
  if (valid_to) {
    toDate = new Date(valid_to);
    if (toDate < fromDate) {
      throw createError("Ngày hết hạn phải lớn hơn hoặc bằng ngày bắt đầu", 400);
    }
  }

  // 4. Validate Số lượt sử dụng:
  const totalLimit = usage_limit ? Number(usage_limit) : 500;
  if (!Number.isInteger(totalLimit) || totalLimit < 1) {
    throw createError("Tổng lượt sử dụng tối đa phải là số nguyên dương (≥ 1)", 400);
  }

  const perUserLimit = usage_limit_per_user ? Number(usage_limit_per_user) : 1;
  if (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > totalLimit) {
    throw createError("Giới hạn lượt dùng mỗi khách phải ≥ 1 và nhỏ hơn hoặc bằng Tổng lượt sử dụng tối đa", 400);
  }

  const validServices = ["ALL", "HOTEL", "ATTRACTION"];
  const cleanService = validServices.includes(applicable_service) ? applicable_service : "ALL";

  const validAudiences = ["ALL", "NEW_USER", "LOYALTY_POINT"];
  const cleanAudience = validAudiences.includes(target_audience) ? target_audience : "ALL";

  let cleanType = voucher_type;
  if (!cleanType) {
    if (cleanAudience === "NEW_USER") cleanType = "NEW_USER";
    else if (cleanAudience === "LOYALTY_POINT") cleanType = "LOYALTY_POINT";
    else if (cleanService === "HOTEL") cleanType = "HOTEL";
    else if (cleanService === "ATTRACTION") cleanType = "ATTRACTION";
    else cleanType = "GENERAL";
  }

  const pointsReq = cleanAudience === "LOYALTY_POINT" ? Math.max(0, Number(points_required) || 0) : 0;

  const promo = await Promotion.create({
    code: cleanCode,
    title: title ? String(title).trim() : "",
    description: description ? String(description).trim() : "",
    applicable_service: cleanService,
    target_audience: cleanAudience,
    voucher_type: cleanType,
    points_required: pointsReq,
    points_cost: cleanAudience === "LOYALTY_POINT" && pointsReq > 0 ? pointsReq : null,
    discount_type,
    discount_value: numVal,
    max_discount: parsedMaxDiscount,
    min_order_amount: minOrderNum,
    valid_from: fromDate,
    valid_to: toDate,
    usage_limit: totalLimit,
    usage_limit_per_user: cleanAudience === "NEW_USER" ? 1 : perUserLimit,
    used_count: 0,
    status: ["ACTIVE", "EXPIRED", "DISABLED"].includes(status) ? status : "ACTIVE",
  });
  return promo;
};

const updatePromotion = async (actor, id, data) => {
  assertObjectId(id, "promotion id");
  const promo = await Promotion.findById(id);
  if (!promo) throw createError("Mã giảm giá không tồn tại", 404);

  const updateFields = {};
  if (data.status) {
    if (!["ACTIVE", "EXPIRED", "DISABLED"].includes(data.status)) {
      throw createError("Trạng thái voucher không hợp lệ", 400);
    }
    updateFields.status = data.status;
  }

  // Khi Admin Sửa (Edit) một Voucher đang chạy: Tổng lượt sử dụng mới sửa lại không được nhỏ hơn số lượt khách đã dùng thực tế
  if (data.usage_limit !== undefined) {
    const newLimit = Number(data.usage_limit);
    if (!Number.isInteger(newLimit) || newLimit < 1) {
      throw createError("Tổng lượt sử dụng tối đa phải là số nguyên dương (≥ 1)", 400);
    }
    if (newLimit < promo.used_count) {
      throw createError(`Tổng lượt sử dụng mới không được nhỏ hơn số lượt khách đã dùng thực tế (${promo.used_count} lượt)`, 400);
    }
    updateFields.usage_limit = newLimit;
  }

  const finalLimit = updateFields.usage_limit !== undefined ? updateFields.usage_limit : promo.usage_limit;

  if (data.usage_limit_per_user !== undefined) {
    const perUser = Number(data.usage_limit_per_user);
    if (!Number.isInteger(perUser) || perUser < 1) {
      throw createError("Lượt dùng mỗi khách phải ≥ 1", 400);
    }
    if (finalLimit !== null && perUser > finalLimit) {
      throw createError("Lượt dùng mỗi khách không được vượt quá Tổng lượt sử dụng tối đa", 400);
    }
    updateFields.usage_limit_per_user = perUser;
  }

  const finalFrom = data.valid_from !== undefined ? (data.valid_from ? new Date(data.valid_from) : null) : promo.valid_from;
  if (data.valid_from !== undefined) {
    updateFields.valid_from = finalFrom;
  }

  if (data.valid_to !== undefined) {
    const toDate = data.valid_to ? new Date(data.valid_to) : null;
    if (toDate && finalFrom && toDate < finalFrom) {
      throw createError("Ngày hết hạn phải lớn hơn hoặc bằng ngày bắt đầu", 400);
    }
    updateFields.valid_to = toDate;
  }

  const finalDiscountVal = data.discount_value !== undefined ? Number(data.discount_value) : promo.discount_value;
  const finalMinOrder = data.min_order_amount !== undefined ? Math.max(0, Number(data.min_order_amount) || 0) : promo.min_order_amount;

  if (promo.discount_type === "FIXED" && finalMinOrder <= finalDiscountVal) {
    throw createError(`Ràng buộc chống lỗ: Giá trị đơn hàng tối thiểu bắt buộc phải lớn hơn số tiền giảm giá (${finalDiscountVal.toLocaleString('vi-VN')} ₫)`, 400);
  }

  if (data.min_order_amount !== undefined) {
    updateFields.min_order_amount = finalMinOrder;
  }
  if (data.discount_value !== undefined) {
    updateFields.discount_value = finalDiscountVal;
  }
  if (data.max_discount !== undefined) {
    updateFields.max_discount = data.max_discount ? Number(data.max_discount) : null;
  }
  if (data.title !== undefined) updateFields.title = String(data.title).trim();
  if (data.description !== undefined) updateFields.description = String(data.description).trim();
  if (data.applicable_service !== undefined && ["ALL", "HOTEL", "ATTRACTION"].includes(data.applicable_service)) {
    updateFields.applicable_service = data.applicable_service;
  }
  if (data.target_audience !== undefined && ["ALL", "NEW_USER", "LOYALTY_POINT"].includes(data.target_audience)) {
    updateFields.target_audience = data.target_audience;
  }
  if (data.voucher_type !== undefined && ["GENERAL", "NEW_USER", "LOYALTY_POINT", "HOTEL", "ATTRACTION"].includes(data.voucher_type)) {
    updateFields.voucher_type = data.voucher_type;
  }
  if (data.points_required !== undefined) {
    const pts = Math.max(0, Number(data.points_required) || 0);
    updateFields.points_required = pts;
    if (data.target_audience === "LOYALTY_POINT" || promo?.target_audience === "LOYALTY_POINT" || promo?.voucher_type === "LOYALTY_POINT") {
      updateFields.points_cost = pts > 0 ? pts : null;
    }
  }

  const updated = await Promotion.findByIdAndUpdate(id, updateFields, { new: true });
  return updated;
};

const deletePromotion = async (actor, id) => {
  assertObjectId(id, "promotion id");
  const promo = await Promotion.findById(id);
  if (!promo) throw createError("Mã giảm giá không tồn tại", 404);

  // Validate khi Admin bấm nút "Xóa" Voucher trên bảng danh sách:
  // Nếu Lượt dùng = 0 thì cho phép xóa hẳn. Nếu Lượt dùng > 0 (đã có hóa đơn áp mã này), hệ thống chặn không cho xóa
  if (promo.used_count > 0) {
    throw createError("Voucher này đã phát sinh giao dịch, bạn chỉ có thể chuyển sang trạng thái Tạm ngưng", 400);
  }

  await Promotion.findByIdAndDelete(id);
  return { message: "Đã xóa voucher thành công" };
};

const listFacilitiesCommission = async ({ search, type, status, page = 1, limit = 50 }) => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 50));

  const filter = {};
  if (status && String(status).toUpperCase() !== "ALL") {
    filter.status = String(status).toUpperCase();
  } else if (!status) {
    // Mặc định chỉ hiển thị các cơ sở đang hoạt động hoặc đã được phê duyệt
    filter.status = { $in: ["ACTIVE", "APPROVED"] };
  }

  if (type) {
    filter.type = String(type).toUpperCase();
  }

  const term = String(search || "").trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { city: pattern }, { address: pattern }];
  }

  const [total, items, defaultCfg] = await Promise.all([
    Facility.countDocuments(filter),
    Facility.find(filter)
      .populate("vendor_id", "email full_name phone")
      .select("name type city address commission_rate status stars created_at vendor_id")
      .sort({ created_at: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    SystemConfig.findOne({ config_key: "COMMISSION_RATE_DEFAULT" }).lean(),
  ]);

  const defaultRate = defaultCfg ? Number(defaultCfg.config_value) || 10 : 10;

  // Lấy dữ liệu doanh thu thực tế từ Database cho các cơ sở trên trang
  const facilityIds = items.map((f) => f._id);
  const monthlyGmvMap = new Map();
  const gmv30dMap = new Map();

  if (facilityIds.length > 0) {
    const services = await Service.find({ facility_id: { $in: facilityIds } }).select("_id facility_id").lean();
    const serviceIds = services.map((s) => s._id);
    const serviceToFacility = new Map();
    services.forEach((s) => serviceToFacility.set(s._id.toString(), s.facility_id.toString()));

    const inventories = serviceIds.length > 0
      ? await ServiceInventory.find({ service_id: { $in: serviceIds } }).select("_id service_id").lean()
      : [];
    const inventoryToFacility = new Map();
    inventories.forEach((inv) => {
      const facId = serviceToFacility.get(inv.service_id.toString());
      if (facId) inventoryToFacility.set(inv._id.toString(), facId);
    });
    const inventoryIds = inventories.map((i) => i._id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const matchConditions = [];
    if (serviceIds.length > 0) matchConditions.push({ service_id: { $in: serviceIds } });
    if (inventoryIds.length > 0) matchConditions.push({ inventory_id: { $in: inventoryIds } });

    if (matchConditions.length > 0) {
      const details = await BookingDetail.aggregate([
        { $match: { $or: matchConditions } },
        {
          $lookup: {
            from: "bookings",
            localField: "booking_id",
            foreignField: "_id",
            as: "booking",
          },
        },
        { $unwind: "$booking" },
        {
          $match: {
            "booking.status": { $in: ["CONFIRMED", "COMPLETED"] },
            "booking.created_at": { $gte: thirtyDaysAgo },
          },
        },
        {
          $project: {
            service_id: 1,
            inventory_id: 1,
            quantity: { $ifNull: ["$quantity", 1] },
            unit_price: { $ifNull: ["$unit_price", 0] },
            created_at: "$booking.created_at",
          },
        },
      ]);

      for (const d of details) {
        let facId = null;
        if (d.service_id) facId = serviceToFacility.get(d.service_id.toString());
        if (!facId && d.inventory_id) facId = inventoryToFacility.get(d.inventory_id.toString());
        if (!facId) continue;

        const gross = (Number(d.quantity) || 1) * (Number(d.unit_price) || 0);
        gmv30dMap.set(facId, (gmv30dMap.get(facId) || 0) + gross);

        if (new Date(d.created_at) >= startOfMonth) {
          monthlyGmvMap.set(facId, (monthlyGmvMap.get(facId) || 0) + gross);
        }
      }
    }
  }

  return {
    items: items.map((f) => {
      const facIdStr = f._id.toString();
      const hasOverride = Number(f.commission_rate) > 0;
      const appliedRate = hasOverride ? Number(f.commission_rate) : defaultRate;
      const monthlyGmv = monthlyGmvMap.get(facIdStr) || 0;
      const revenue30d = gmv30dMap.get(facIdStr) || 0;
      const estimatedCommission = Math.round((monthlyGmv * appliedRate) / 100);

      return {
        id: f._id,
        name: f.name,
        type: f.type,
        city: f.city,
        address: f.address,
        commission_rate: Number(f.commission_rate) || 0,
        applied_commission_rate: appliedRate,
        has_override: hasOverride,
        monthly_gmv: monthlyGmv,
        revenue_30d: revenue30d,
        estimated_commission: estimatedCommission,
        status: f.status,
        stars: f.stars,
        vendor: f.vendor_id
          ? {
              id: f.vendor_id._id,
              email: f.vendor_id.email,
              full_name: f.vendor_id.full_name,
              phone: f.vendor_id.phone,
            }
          : null,
      };
    }),
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    default_commission_rate: defaultRate,
  };
};

const updateFacilityCommission = async (actor, facilityId, commissionRate) => {
  assertObjectId(facilityId, "facility id");
  const rate = Number(commissionRate);
  if (isNaN(rate)) {
    throw createError("Tỷ lệ hoa hồng không hợp lệ", 400);
  }

  const facility = await Facility.findById(facilityId);
  if (!facility) {
    throw createError("Cơ sở không tồn tại", 404);
  }

  // Validate khi gán Hoa hồng riêng cho từng Khách sạn (Override):
  // Phải kiểm tra khách sạn đó đang ở trạng thái Đang hoạt động (Active / Approved)
  if (rate !== 0 && facility.status !== "ACTIVE" && facility.status !== "APPROVED") {
    throw createError(`Không thể thiết lập hoa hồng riêng vì cơ sở đang ở trạng thái [${facility.status}]. Chỉ áp dụng cho cơ sở Đang hoạt động (Active).`, 400);
  }

  // Giới hạn trần hợp lý (Range Check): từ 1% đến 50% (hoặc 0 để quay lại mặc định)
  if (rate !== 0) {
    if (rate < 1 || rate > 50) {
      throw createError("Tỷ lệ hoa hồng riêng thỏa thuận phải trong khoảng từ 1% đến 50%", 400);
    }
    if (!/^\d+(\.\d{1,2})?$/.test(String(commissionRate))) {
      throw createError("Tỷ lệ hoa hồng chỉ được phép có tối đa 2 chữ số thập phân (ví dụ: 8.5%)", 400);
    }
  }

  facility.commission_rate = rate;
  await facility.save();

  return {
    id: facility._id,
    name: facility.name,
    commission_rate: facility.commission_rate,
    has_override: facility.commission_rate > 0,
  };
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setStatus,
  listRoles,
  setRolePermissions,
  getOverview,
  listConfigs,
  updateConfig,
  listVoucherTypes,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listFacilitiesCommission,
  updateFacilityCommission,
};

