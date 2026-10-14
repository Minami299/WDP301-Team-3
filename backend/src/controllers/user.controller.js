const authService = require("../services/auth.service");
const userService = require("../services/user.service");

const handleError = (res, error) => {
  if (error.retryAfterSeconds) {
    res.set("Retry-After", String(error.retryAfterSeconds));
  }
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
    errors: error.errors || [],
  });
};

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: "Account created. Verify your email to continue.",
      email: result.email,
      verificationEmailSent: result.verificationEmailSent,
      verificationEmailError: result.verificationEmailError,
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
      message: "Login success",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getMe = async (req, res) => {
  try {
    const data = await authService.getMe(req.user.id);
    res.status(200).json({ success: true, data, message: "Success" });
  } catch (error) {
    handleError(res, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const data = await authService.verifyEmail(req.body);
    res
      .status(200)
      .json({ success: true, data, message: "Email verified successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    const data = await authService.resendVerification(req.body);
    res.status(200).json({ success: true, data, message: data.message });
  } catch (error) {
    handleError(res, error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const data = await authService.forgotPassword(req.body);
    res.status(202).json({ success: true, data, message: data.message });
  } catch (error) {
    handleError(res, error);
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const data = await authService.verifyResetOtp(req.body);
    res
      .status(200)
      .json({ success: true, data, message: "Reset code verified" });
  } catch (error) {
    handleError(res, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const data = await authService.resetPassword(req.body);
    res.status(200).json({ success: true, data, message: data.message });
  } catch (error) {
    handleError(res, error);
  }
};

const getMyProfile = async (req, res) => {
  try {
    const data = await userService.getMyProfile(req.user.id);
    res.status(200).json({ success: true, data, message: "Success" });
  } catch (error) {
    handleError(res, error);
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const data = await userService.updateMyProfile(req.user.id, req.body);
    res.status(200).json({ success: true, data, message: "Profile updated" });
  } catch (error) {
    handleError(res, error);
  }
};

const changeMyPassword = async (req, res) => {
  try {
    const data = await userService.changePassword(req.user.id, req.body);
    res.status(200).json({ success: true, data, message: data.message });
  } catch (error) {
    handleError(res, error);
  }
};

const uploadMyAvatar = async (req, res) => {
  try {
    const data = await userService.uploadMyAvatar(req.user.id, req.file);
    res.status(200).json({ success: true, data, message: "Avatar updated" });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteMyAvatar = async (req, res) => {
  try {
    const data = await userService.deleteMyAvatar(req.user.id);
    res.status(200).json({ success: true, data, message: "Avatar removed" });
  } catch (error) {
    handleError(res, error);
  }
};

const requestMyEmailChange = async (req, res) => {
  try {
    const data = await userService.requestEmailChange(
      req.user.id,
      req.body?.newEmail,
    );
    res.status(202).json({ success: true, data, message: data.message });
  } catch (error) {
    handleError(res, error);
  }
};

const verifyMyEmailChange = async (req, res) => {
  try {
    const data = await userService.verifyEmailChange(
      req.user.id,
      req.body?.otp,
    );
    res
      .status(200)
      .json({ success: true, data, message: "Email address updated" });
  } catch (error) {
    handleError(res, error);
  }
};

const becomePartner = async (req, res) => {
  try {
    const result = await authService.becomePartner(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: "Đăng ký trở thành đối tác thành công",
      token: result.token,
      user: result.user,
    });
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
      message: "Success",
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user, req.params.id);
    res.status(200).json({ success: true, data: user, message: "Success" });
  } catch (error) {
    handleError(res, error);
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.user, req.body);
    res
      .status(201)
      .json({ success: true, data: user, message: "User created" });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists", errors: [] });
    }
    handleError(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(
      req.user,
      req.params.id,
      req.body,
    );
    res
      .status(200)
      .json({ success: true, data: user, message: "User updated" });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await userService.deleteUser(req.params.id);
    res
      .status(200)
      .json({ success: true, data: user, message: "User deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  becomePartner,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadMyAvatar,
  deleteMyAvatar,
  requestMyEmailChange,
  verifyMyEmailChange,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};

