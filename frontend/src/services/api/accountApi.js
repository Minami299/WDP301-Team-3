import axiosClient from "./axiosClient";

export const accountApi = {
  getProfile() {
    return axiosClient.get("/users/me");
  },
  updateProfile(payload) {
    return axiosClient.put("/users/me", payload);
  },
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);
    return axiosClient.post("/users/me/avatar", formData);
  },
  deleteAvatar() {
    return axiosClient.delete("/users/me/avatar");
  },
  requestEmailChange(newEmail) {
    return axiosClient.post("/users/me/email-change", { newEmail });
  },
  verifyEmailChange(otp) {
    return axiosClient.post("/users/me/email-change/verify", { otp });
  },
  changePassword(payload) {
    return axiosClient.put("/users/me/change-password", payload);
  },
};
