const crypto = require('crypto');
const { User, Role } = require('../models');
const { generateToken, ROLES } = require('../middlewares/authMiddleware');

/**
 * Mã hóa mật khẩu sử dụng crypto PBKDF2
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

/**
 * So khớp mật khẩu với hash đã lưu
 */
const verifyPassword = (password, storedHash) => {
  if (!storedHash) return false;
  // Hỗ trợ trường hợp plain-text test
  if (storedHash === password) return true;
  if (storedHash.includes(':')) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }
  return false;
};

/**
 * Đăng ký tài khoản người dùng mới (Role mặc định: CUSTOMER)
 */
const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    let customerRole = await Role.findOne({ role_name: ROLES?.CUSTOMER || 'CUSTOMER' });
    if (!customerRole) {
      customerRole = await Role.create({
        role_name: 'CUSTOMER',
        description: 'Khách hàng sử dụng dịch vụ'
      });
    }

    const password_hash = hashPassword(password);
    const user = await User.create({
      full_name: full_name.trim(),
      email: cleanEmail,
      password_hash,
      role_id: customerRole._id,
      status: 'ACTIVE'
    });

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: 'CUSTOMER'
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: 'CUSTOMER',
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Đăng nhập người dùng và cấp JWT Token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).populate('role_id', 'role_name');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    if (user.status === 'LOCKED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang bị khóa hoặc chưa kích hoạt'
      });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    const roleName = user.role_id?.role_name || 'CUSTOMER';
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: roleName
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: roleName,
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy thông tin tài khoản hiện tại từ JWT
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password_hash')
      .populate('role_id', 'role_name description');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role_id?.role_name || req.user.role || 'CUSTOMER',
        status: user.status,
        total_loyalty_points: user.total_loyalty_points
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('role_id', 'role_name');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role_id', 'role_name');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, full_name, phone, password, role_id, role_name, status } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, full_name, password'
      });
    }

    let roleObjectId = role_id;
    if (roleObjectId) {
      const exists = await Role.findById(roleObjectId);
      if (!exists) {
        return res.status(400).json({ success: false, message: 'role_id not found' });
      }
    } else {
      const name = String(role_name || 'CUSTOMER').toUpperCase();
      let role = await Role.findOne({ role_name: name });
      if (!role) {
        role = await Role.create({
          role_name: name,
          description: 'Auto-created by user API'
        });
      }
      roleObjectId = role._id;
    }

    const user = await User.create({
      email,
      full_name,
      phone: phone || '',
      password_hash: hashPassword(password),
      role_id: roleObjectId,
      status: status || 'ACTIVE'
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const allowed = ['full_name', 'phone', 'status', 'profile'];
    const payload = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};