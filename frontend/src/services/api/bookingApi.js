import axiosClient from './axiosClient';

export const bookingApi = {
  quote: (payload) => axiosClient.post('/bookings/quote', payload),
  createRoom: payload => axiosClient.post('/bookings/rooms', payload),
  create: payload => axiosClient.post('/bookings', payload),
  paymentInfo: id => axiosClient.get(`/bookings/${id}/payment`),
  list: () => axiosClient.get('/bookings'),
  detail: id => axiosClient.get(`/bookings/${id}`),
  vendorList: params => axiosClient.get('/bookings/vendor', { params }),
  vendorDetail: id => axiosClient.get(`/bookings/vendor/${id}`),
  requestCancellation: (id, payload) => axiosClient.post(`/bookings/${id}/cancellations`, payload),
  decideCancellation: (id, requestId, payload) => axiosClient.patch(`/bookings/vendor/${id}/cancellations/${requestId}`, payload)
};
