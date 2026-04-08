import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

export const getBaseURL = () => {
  return baseURL.replace(/\/api$/, "");
};

export const getMediaURL = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = getBaseURL();
  return `${base}${url}`;
};

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("kloterby_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
