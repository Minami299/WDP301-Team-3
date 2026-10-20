const express = require("express");
const {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  becomePartner,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/user.controller");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use('/partner-applications', require('./partnerApplication.routes'));

router.post("/register", register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);
router.get("/me", verifyToken, getMe);
router.post("/become-partner", verifyToken, becomePartner);

module.exports = router;

