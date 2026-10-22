import axiosClient from './axiosClient';
import { tokenStorage } from '../storage/tokenStorage';

const base = '/auth/partner-applications';
export const partnerApplicationApi = {
  policy: () => axiosClient.get(`${base}/policy`),
  mine: () => axiosClient.get(`${base}/mine`),
  save: payload => axiosClient.put(`${base}/mine`, payload),
  submit: version => axiosClient.post(`${base}/mine/submit`, { version }),
  upload: (version, kind, file) => {
    const data = new FormData();
    data.append('version', String(version)); data.append('kind', kind); data.append('document', file);
    return axiosClient.post(`${base}/mine/documents`, data);
  },
  removeDocument: (id, version) => axiosClient.delete(`${base}/mine/documents/${id}`, { data: { version } }),
  list: params => axiosClient.get(`${base}/reviews`, { params }),
  detail: id => axiosClient.get(`${base}/reviews/${id}`),
  review: (id, payload) => axiosClient.post(`${base}/reviews/${id}`, payload),
  download: async document => {
    const response = await fetch(`${axiosClient.defaults.baseURL}${base}/documents/${document._id}`, {
      headers: { Authorization: `Bearer ${tokenStorage.getToken()}` }, cache: 'no-store',
    });
    if (!response.ok) throw new Error('Không tải được tài liệu hoặc bạn không có quyền truy cập.');
    const url = URL.createObjectURL(await response.blob());
    const link = window.document.createElement('a');
    link.href = url; link.download = document.name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
