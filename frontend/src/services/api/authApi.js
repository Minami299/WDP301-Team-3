import axiosClient from "./axiosClient";

export const authApi = {
  login(payload) {
    return axiosClient.post("/auth/login", payload);
  },
  register(payload) {
    return axiosClient.post("/auth/register", payload);
  },
  verifyEmail(payload) {
    return axiosClient.post("/auth/verify-email", payload);
  },
  resendVerification(payload) {
    return axiosClient.post("/auth/resend-verification", payload);
  },
  forgotPassword(payload) {
    return axiosClient.post("/auth/forgot-password", payload);
  },
  verifyResetOtp(payload) {
    return axiosClient.post("/auth/verify-reset-otp", payload);
  },
  resetPassword(payload) {
    return axiosClient.post("/auth/reset-password", payload);
  },
  getMe() {
    return axiosClient.get("/auth/me");
  },
};
