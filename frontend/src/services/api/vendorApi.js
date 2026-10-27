import axiosClient from './axiosClient';

export const vendorApi = {
  getRevenue: (params) => axiosClient.get('/vendor/revenue', { params }),
  getAttractions: () => axiosClient.get('/vendor/attractions'),
  createAttraction: (payload) => axiosClient.post('/vendor/attractions', payload),
  updateAttraction: (id, payload) => axiosClient.put(`/vendor/attractions/${id}`, payload),
  createTicket: (id, payload) => axiosClient.post(`/vendor/attractions/${id}/tickets`, payload),
  updateTicket: (id, payload) => axiosClient.put(`/vendor/tickets/${id}`, payload),
  deleteTicket: (id) => axiosClient.delete(`/vendor/tickets/${id}`),
  createTicketType: (id, payload) => axiosClient.post(`/vendor/tickets/${id}/ticket-types`, payload),
  updateTicketType: (id, typeId, payload) => axiosClient.put(`/vendor/tickets/${id}/ticket-types/${typeId}`, payload),
  deleteTicketType: (id, typeId) => axiosClient.delete(`/vendor/tickets/${id}/ticket-types/${typeId}`),
  getTicketInventory: (id, params) => axiosClient.get(`/vendor/tickets/${id}/inventory`, { params }),
  saveTicketInventory: (id, payload) => axiosClient.put(`/vendor/tickets/${id}/inventory`, payload),
  getDashboard: (params) => axiosClient.get('/vendor/dashboard', { params }),
  getPaymentTransactions: (params) => axiosClient.get('/vendor/payments', { params }),
  getProfile: () => axiosClient.get('/vendor/profile'),
  getSettlements: (params) => axiosClient.get('/vendor/settlements', { params }),
  createSettlement: (payload) => axiosClient.post('/vendor/settlements', payload),
  getSettlement: (id) => axiosClient.get(`/vendor/settlements/${id}`),
  createRoom: (facilityId, payload) => axiosClient.post(`/vendor/facilities/${facilityId}/rooms`, payload),
  updateRoom: (roomId, payload) => axiosClient.put(`/vendor/rooms/${roomId}`, payload),
  deleteRoom: (roomId) => axiosClient.delete(`/vendor/rooms/${roomId}`)
};
