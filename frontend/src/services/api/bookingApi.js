import axiosClient from './axiosClient';

export const bookingApi = {
  quote: (payload) => axiosClient.post('/bookings/quote', payload)
};