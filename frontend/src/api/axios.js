import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy will forward to http://localhost:5000/api
  headers: {
    "Content-Type": "application/json",
  },
});

// Har request ke saath JWT token automatically attach karo
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("[axios] No token found in localStorage for:", config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 401 response interceptor — token expired ya missing hone par auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[axios] 401 Unauthorized — clearing session and redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
