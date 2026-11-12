import axiosClient from './axiosClient';

const path = (code) => `/checkin/${encodeURIComponent(code)}`;

export const checkinApi = {
  preview: (code) => axiosClient.get(path(code)),
  confirm: (code) => axiosClient.post(`${path(code)}/confirm`)
};
