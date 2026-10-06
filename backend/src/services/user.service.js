const { User, Role } = require('../models');
const { ROLES, ROLE_HIERARCHY } = require('../middlewares/authMiddleware');
const { hashPassword } = require('../utils/password');

const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

const canManageUsers = (role) => MANAGEMENT_ROLES.includes(role);

const canAccessUser = (actor, targetUserId) => {
  return canManageUsers(actor.role) || String(actor.id) === String(targetUserId);
};

const assertCanAccessUser = (actor, targetUserId) => {
  if (!canAccessUser(actor, targetUserId)) {
    const error = new Error('Forbidden: You can only access your own user resource');
    error.statusCode = 403;
    throw error;
  }
};

const assertCanAssignRole = (actorRole, targetRole) => {
  if (actorRole === ROLES.ADMIN) return;

  const inheritedRoles = ROLE_HIERARCHY[actorRole] || [actorRole];
  if (!inheritedRoles.includes(targetRole) || targetRole === ROLES.ADMIN || targetRole === ROLES.MANAGER) {
    const error = new Error('Forbidden: You cannot assign this role');
    error.statusCode = 403;
    throw error;
  }
};

const getRoleId = async (actorRole, role_id, role_name = ROLES.CUSTOMER) => {
  if (role_id) {
    const role = await Role.findById(role_id);
    if (!role) {
      const error = new Error('role_id not found');
      error.statusCode = 400;
      throw error;
    }
    assertCanAssignRole(actorRole, role.role_name);
    return role._id;
  }

  const name = String(role_name || ROLES.CUSTOMER).toUpperCase();
  assertCanAssignRole(actorRole, name);

  let role = await Role.findOne({ role_name: name });
  if (!role) {
    role = await Role.create({ role_name: name, description: 'Auto-created by user API' });
  }
  return role._id;
};

const getUsers = async () => {
  return User.find().select('-password_hash').populate('role_id', 'role_name');
};

const getUserById = async (actor, id) => {
  assertCanAccessUser(actor, id);

  const user = await User.findById(id).select('-password_hash').populate('role_id', 'role_name');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const createUser = async (actor, payload) => {
  const { email, full_name, phone, password, role_id, role_name, status } = payload;
  if (!email || !full_name || !password) {
    const error = new Error('Missing required fields: email, full_name, password');
    error.statusCode = 400;
    throw error;
  }

  const roleObjectId = await getRoleId(actor.role, role_id, role_name);
  const user = await User.create({
    email: email.trim().toLowerCase(),
    full_name: full_name.trim(),
    phone: phone || '',
    password_hash: await hashPassword(password),
    role_id: roleObjectId,
    status: canManageUsers(actor.role) ? status || 'ACTIVE' : 'ACTIVE'
  });

  return User.findById(user._id).select('-password_hash').populate('role_id', 'role_name');
};

const updateUser = async (actor, id, body) => {
  assertCanAccessUser(actor, id);

  const allowed = ['full_name', 'phone'];
  if (canManageUsers(actor.role)) {
    allowed.push('status');
  }

  const payload = {};
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  if (Object.keys(payload).length === 0) {
    const error = new Error('No updatable fields provided');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  }).select('-password_hash').populate('role_id', 'role_name');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id).select('-password_hash');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

module.exports = {
  canManageUsers,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
