import axios from "axios";
import { tokenStorage } from "../storage/tokenStorage";
import { reportErrorMessage } from '../../utils/reportDownload.js';

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
  (response) => response.config.download ? response : response.data,
  async (error) => {
    // Binary downloads can return JSON validation/permission errors as a Blob.
    if (typeof Blob !== 'undefined' && error.response?.data instanceof Blob) {
      const body = await error.response.data.text();
      try { error.response.data = JSON.parse(body); } catch { error.response.data = body; }
    }
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
    const serverMessage = error.config?.download
      ? reportErrorMessage(error.response?.data, null)
      : error.response?.data?.message;
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
    apiError.registration = error.response?.data?.registration;
    apiError.errors = Array.isArray(error.response?.data?.errors) ? error.response.data.errors : [];
    apiError.retryAfterSeconds =
      Number(error.response?.headers?.["retry-after"]) || null;
    return Promise.reject(apiError);
  },
);

export default axiosClient;
