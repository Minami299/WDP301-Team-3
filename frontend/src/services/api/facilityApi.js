import axiosClient from "./axiosClient";

export const facilityApi = {
  getFacilities(params = {}) {
    return axiosClient.get("/facilities", { params });
  },
  getFacilityById(id) {
    return axiosClient.get(`/facilities/${id}`);
  },
  getFilterOptions(params = {}) {
    return axiosClient.get("/facilities/filters/options", { params });
  },
  createReview(facilityId, data) {
    return axiosClient.post(`/facilities/${facilityId}/reviews`, data);
  },
  replyReview(facilityId, reviewId, data) {
    return axiosClient.post(`/facilities/${facilityId}/reviews/${reviewId}/reply`, data);
  },
};

export default facilityApi;
