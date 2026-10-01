const { User, Role } = require('../models');

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
      password_hash: password,
      role_id: roleObjectId,
      status: status || 'active'
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

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };