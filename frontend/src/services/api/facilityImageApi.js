import axiosClient from "./axiosClient";

export const facilityImageApi = {
  list(facilityId) {
    return axiosClient.get(`/uploads/facilities/${facilityId}/images`);
  },
  upload(facilityId, files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("images", file));
    return axiosClient.post(`/uploads/facilities/${facilityId}/images`, formData);
  },
  setPrimary(facilityId, imageId) {
    return axiosClient.patch(
      `/uploads/facilities/${facilityId}/images/${imageId}/primary`,
    );
  },
  remove(facilityId, imageId) {
    return axiosClient.delete(`/uploads/facilities/${facilityId}/images/${imageId}`);
  },
};
