import axios from "axios";
import { getAuthToken } from "./authToken";

const BACKEND = import.meta.env.DEV
  ? "/api"   // proxied through Vite → no CORS in local dev
  : "https://task-manager-backend-961886344080.us-central1.run.app/api";

const api = axios.create({
  baseURL: BACKEND,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

