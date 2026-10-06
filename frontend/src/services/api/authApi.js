import axiosClient from "./axiosClient";

export const authApi = {
  login(payload) {
    return axiosClient.post("/auth/login", payload);
  },
  register(payload) {
    return axiosClient.post("/auth/register", payload);
  },
  getMe() {
    return axiosClient.get("/auth/me");
  }
};
