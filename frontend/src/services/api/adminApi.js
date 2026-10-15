import axiosClient from "./axiosClient";

export const adminApi = {
  getOverview: () => axiosClient.get("/admin/overview"),
  listUsers: (params) => axiosClient.get("/admin/users", { params }),
  createUser: (payload) => axiosClient.post("/admin/users", payload),
  updateUser: (id, payload) => axiosClient.patch(`/admin/users/${id}`, payload),
  setUserStatus: (id, status) =>
    axiosClient.patch(`/admin/users/${id}/status`, { status }),
  getRegistration: (id) => axiosClient.get(`/users/${id}`),
  reviewRegistration: (id, approvalStatus, reason) =>
    axiosClient.patch(`/admin/users/${id}/status`, { approvalStatus, reason }),
  listRoles: () => axiosClient.get("/admin/roles"),
  setRolePermissions: (id, permissions) =>
    axiosClient.put(`/admin/roles/${id}/permissions`, { permissions }),
};
