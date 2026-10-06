const { User, Role } = require('../models');
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

const register = async ({ full_name, email, password }) => {
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

  const role = await ensureCustomerRole();
  const user = await User.create({
    full_name: full_name.trim(),
    email: cleanEmail,
    password_hash: await hashPassword(password),
    role_id: role._id,
    status: 'ACTIVE'
  });

  const token = generateToken({ id: user._id, email: user.email, role: ROLES.CUSTOMER });
  return { token, user: toAuthUser(user, ROLES.CUSTOMER) };
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

module.exports = { register, login, getMe };
