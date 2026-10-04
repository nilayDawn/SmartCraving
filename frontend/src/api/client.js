import axios from "axios";
import qs from "qs";

/**
 * Resolves the API base URL dynamically from environment variables or relative fallback.
 *
 * Supports:
 * - VITE_API_BASE_URL (explicit full prefix, e.g. "http://localhost:4000/api" or "/api")
 * - VITE_API_URL / VITE_BACKEND_URL (e.g. "http://localhost:4000", "https://api.example.com", or "/api")
 * - Normalizes paths so trailing slashes and redundant /api segments are handled cleanly
 * - Defaults to relative "/api" when no env variable is provided, allowing dev-server proxies
 *   and production reverse proxies to route API traffic without hardcoded hosts.
 */
export const getApiBaseUrl = () => {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL;

  if (envUrl && typeof envUrl === "string") {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (trimmed) {
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
  }

  return "/api";
};

export const getBaseUrl = getApiBaseUrl;

const client = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default client;
