import axiosClient from "./axiosClient";

export const adminApi = {
  getOverview: () => axiosClient.get("/admin/overview"),
  listUsers: (params) => axiosClient.get("/admin/users", { params }),
  createUser: (payload) => axiosClient.post("/admin/users", payload),
  updateUser: (id, payload) => axiosClient.patch(`/admin/users/${id}`, payload),
  setUserStatus: (id, status, reason) =>
    axiosClient.patch(`/admin/users/${id}/status`, { status, reason }),
  getRegistration: (id) => axiosClient.get(`/users/${id}`),
  reviewRegistration: (id, approvalStatus, reason) =>
    axiosClient.patch(`/admin/users/${id}/status`, { approvalStatus, reason }),
  listPayouts: (params) => axiosClient.get("/admin/settlements", { params }),
  getPayout: (id) => axiosClient.get(`/admin/settlements/${id}`),
  decidePayout: (id, payload) => axiosClient.patch(`/admin/settlements/${id}`, payload),
  getSettlementSettings: () => axiosClient.get("/admin/settings/settlement"),
  updateSettlementSettings: (payload) => axiosClient.put("/admin/settings/settlement", payload),
  listRoles: () => axiosClient.get("/admin/roles"),
  setRolePermissions: (id, permissions) =>
    axiosClient.put(`/admin/roles/${id}/permissions`, { permissions }),
};
