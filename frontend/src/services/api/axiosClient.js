import axios from "axios";
import { tokenStorage } from "../storage/tokenStorage";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    let endpoint = "unknown endpoint";
    if (error.config?.url) {
      try {
        endpoint = new URL(
          error.config.url,
          error.config.baseURL || window.location.origin,
        ).pathname;
      } catch {
        endpoint = "invalid API endpoint";
      }
    }
    const method = (error.config?.method || "get").toUpperCase();
    const serverMessage = error.response?.data?.message;
    if (import.meta.env.DEV) {
      console.error("Travelio API request failed", {
        method,
        endpoint,
        status: status || null,
        code: error.code || null,
        message: error.message,
      });
    }
    const message = status
      ? serverMessage || `Request failed with HTTP ${status}`
      : "Cannot connect to Travelio. Check that the backend is running and the /api proxy is available.";
    const apiError = new Error(message);
    apiError.code = error.response?.data?.code;
    apiError.status = status || null;
    apiError.retryAfterSeconds =
      Number(error.response?.headers?.["retry-after"]) || null;
    return Promise.reject(apiError);
  },
);

export default axiosClient;
