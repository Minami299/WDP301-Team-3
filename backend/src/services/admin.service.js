const mongoose = require("mongoose");
const { User, Role, Facility } = require("../models");
const { ROLES } = require("../middlewares/authMiddleware");
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
  return publicUser(await findUserWithRole(id));
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

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setStatus,
  listRoles,
  setRolePermissions,
  getOverview,
};
