//centeralized API setup

import axios from "axios";
import qs from "qs";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (
    import.meta.env.MODE === "production" ||
    (typeof window !== "undefined" && !window.location.hostname.includes("localhost"))
  ) {
    return "https://smartcraving.onrender.com";
  }
  return "http://localhost:4000";
};

const api = axios.create({
  baseURL: getBaseUrl() + "/api",
  withCredentials: true,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

export default api;
