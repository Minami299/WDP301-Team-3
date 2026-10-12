import axiosClient from './axiosClient';

export const qrApi = {
  verify: (qr_code) => axiosClient.post('/vendor/qr/verify', { qr_code }),
  getScans: (params) => axiosClient.get('/vendor/qr/scans', { params })
};