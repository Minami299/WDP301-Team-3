import axiosClient from "./axiosClient";

export const facilityImageApi = {
  uploadRoomImages(files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("images", file));
    return axiosClient.post("/uploads/room-images", formData);
  },
  uploadServiceImages(files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("images", file));
    return axiosClient.post('/uploads/room-images', formData, { params: { type: 'TICKET' } });
  },
};
