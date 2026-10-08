import axiosClient from './axiosClient';

export const vendorApi = {
  getDashboard: (params) => axiosClient.get('/vendor/dashboard', { params }),
  getSettlements: (params) => axiosClient.get('/vendor/settlements', { params }),
  createSettlement: (payload) => axiosClient.post('/vendor/settlements', payload),
  decideSettlement: (id, status) => axiosClient.patch(`/vendor/settlements/${id}`, { status })
};