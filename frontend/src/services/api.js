import axios from "axios";
import { getAuthToken } from "./authToken";

// In dev: hit local Flask directly (avoids proxy config issues).
// In prod build: use the deployed Cloud Run URL.
const BACKEND = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_URL || "https://task-manager-backend-961886344080.us-central1.run.app/api");

const api = axios.create({
  baseURL: BACKEND,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;

  }
  return config;
});

export default api;

