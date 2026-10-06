const authService = require('../services/auth.service');
const userService = require('../services/user.service');

const handleError = (res, error) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    errors: error.errors || []
  });
};

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Register success',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    handleError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      success: true,
      message: 'Login success',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getMe = async (req, res) => {
  try {
    const data = await authService.getMe(req.user.id);
    res.status(200).json({ success: true, data, message: 'Success' });
  } catch (error) {
    handleError(res, error);
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      message: 'Success'
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user, req.params.id);
    res.status(200).json({ success: true, data: user, message: 'Success' });
  } catch (error) {
    handleError(res, error);
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.user, req.body);
    res.status(201).json({ success: true, data: user, message: 'User created' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists', errors: [] });
    }
    handleError(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: user, message: 'User updated' });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, data: user, message: 'User deleted' });
  } catch (error) {
    handleError(res, error);
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
