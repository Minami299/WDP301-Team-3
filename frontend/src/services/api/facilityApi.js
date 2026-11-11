import axiosClient from "./axiosClient";

export const facilityApi = {
  getFacilities(params = {}) {
    return axiosClient.get("/facilities", { params });
  },
  getFacilityById(id) {
    return axiosClient.get(`/facilities/${id}`);
  },
  getTicketAvailability(id, date) {
    return axiosClient.get(`/facilities/${id}/ticket-availability`, { params: { date } });
  },
  getRoomAvailability(id, checkIn, checkOut, rooms = 1) {
    return axiosClient.get(`/facilities/${id}/room-availability`, {
      params: { check_in: checkIn, check_out: checkOut, rooms },
    });
  },
  getFilterOptions(params = {}) {
    return axiosClient.get("/facilities/filters/options", { params });
  },
  createReview(facilityId, data) {
    return axiosClient.post(`/facilities/${facilityId}/reviews`, data);
  },
  getManagedReviews(page = 1) {
    return axiosClient.get('/facilities/reviews/managed', { params: { page } });
  },
  replyReview(facilityId, reviewId, data) {
    return axiosClient.post(`/facilities/${facilityId}/reviews/${reviewId}/reply`, data);
  },
};

export default facilityApi;
