import axios from "axios";
import { getAuthToken } from "./authToken";

const api = axios.create({
  baseURL: "https://task-manager-backend-961886344080.us-central1.run.app/api"
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

