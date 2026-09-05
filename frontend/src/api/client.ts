import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In browser, if on dev port 5173, point directly or use proxy
  if (typeof window !== "undefined" && (window.location.port === "5173")) {
    return "http://127.0.0.1:8000/api";
  }
  return "/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

export function getMediaUrl(uri: string | null | undefined): string {
  if (!uri || uri.startsWith("seed://")) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : (typeof window !== "undefined" && window.location.port === "5173" ? "http://127.0.0.1:8000" : "");
  return `${base}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

export function isSeedUri(uri: string | null | undefined): boolean {
  return typeof uri === "string" && uri.startsWith("seed://");
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
