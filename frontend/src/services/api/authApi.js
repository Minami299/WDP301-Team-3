import axiosClient from "./axiosClient";

export const authApi = {
  login(payload) {
    return axiosClient.post("/auth/login", payload);
  },
  register(payload) {
    return axiosClient.post("/auth/register", payload);
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
  becomePartner(payload) {
    return axiosClient.post("/auth/become-partner", payload);
  },
};

