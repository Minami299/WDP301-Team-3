import axiosClient from "./axiosClient";

export const adminApi = {
  getOverview: () => axiosClient.get("/admin/overview"),
  getAnalytics: (params, signal) => axiosClient.get('/manager/analytics', { params, signal }),
  getRevenue: (params) => axiosClient.get("/manager/revenue", { params }),
  listPartners: (params) => axiosClient.get("/manager/partners", { params }),
  listUsers: (params) => axiosClient.get("/admin/users", { params }),
  createUser: (payload) => axiosClient.post("/admin/users", payload),
  updateUser: (id, payload) => axiosClient.patch(`/admin/users/${id}`, payload),
  setUserStatus: (id, status, reason) =>
    axiosClient.patch(`/admin/users/${id}/status`, { status, reason }),
  getRegistration: (id) => axiosClient.get(`/manager/partners/${id}`),
  reviewRegistration: (id, approvalStatus, reason) =>
    axiosClient.patch(`/manager/partners/${id}/review`, { approvalStatus, reason }),
  listPayouts: (params) => axiosClient.get("/manager/settlements", { params }),
  getPayout: (id) => axiosClient.get(`/manager/settlements/${id}`),
  decidePayout: (id, payload) => axiosClient.patch(`/manager/settlements/${id}`, payload),
  getSettlementSettings: () => axiosClient.get("/manager/settings/settlement"),
  updateSettlementSettings: (payload) => axiosClient.put("/manager/settings/settlement", payload),
  listRoles: () => axiosClient.get("/admin/roles"),
  setRolePermissions: (id, permissions) =>
    axiosClient.put(`/admin/roles/${id}/permissions`, { permissions }),
  listVoucherTypes: () => axiosClient.get("/manager/promotions/types"),
  listPromotions: (params) => axiosClient.get("/manager/promotions", { params }),
  createPromotion: (payload) => axiosClient.post("/manager/promotions", payload),
  updatePromotion: (id, payload) => axiosClient.patch(`/manager/promotions/${id}`, payload),
  deletePromotion: (id) => axiosClient.delete(`/manager/promotions/${id}`),
};

