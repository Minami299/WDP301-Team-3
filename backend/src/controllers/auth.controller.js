const authService = require('../services/auth.service');

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

const becomePartner = async (req, res) => {
  try {
    const result = await authService.becomePartner(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Đăng ký trở thành đối tác thành công',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  becomePartner
};

