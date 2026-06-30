import axios from "axios";

// In production (Cloudflare Pages) this points to the Worker:
//   VITE_API_BASE=https://api.linxservices.ca
// In local dev it falls back to the Express server proxy via vite.config.mjs.
const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3000";

let accessToken = null;
let isRefreshing = false;
let refreshQueue = [];

export const setToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem("linx_token", token);
  } else {
    localStorage.removeItem("linx_token");
  }
};

export const getToken = () => {
  if (accessToken) return accessToken;
  const stored = localStorage.getItem("linx_token");
  accessToken = stored || null;
  return accessToken;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshToken();
          setToken(newToken);
          isRefreshing = false;
          refreshQueue.forEach((cb) => cb(newToken));
          refreshQueue = [];
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          isRefreshing = false;
          refreshQueue = [];
          setToken(null);
          return Promise.reject(refreshErr);
        }
      }

      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) { reject(error); return; }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(normalizeError(error));
  }
);

async function refreshToken() {
  const token = getToken();
  if (!token) throw new Error("No token to refresh");
  const res = await axios.post(`${API_BASE_URL}/_api_auth_refresh`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.token;
}

function normalizeError(error) {
  if (error.response) {
    return {
      status: error.response.status,
      message:
        error.response.data?.message ||
        error.response.data?.error ||
        "Unexpected server error",
    };
  }
  if (error.request) {
    return { status: null, message: "Network error. Please check your connection." };
  }
  return { status: null, message: error.message || "Unknown error" };
}

export async function login(username, password) {
  const res = await api.post("/_api_auth_login", { username, password });
  const token = res.data?.token;
  if (!token) throw new Error("No token returned from login");
  setToken(token);
  return res.data;
}

export async function getCrawlerStatus() {
  const res = await api.get("/_api_crawler_status");
  return res.data;
}

export async function startCrawler() {
  const res = await api.post("/_api_crawler_start");
  return res.data;
}

export async function stopCrawler() {
  const res = await api.post("/_api_crawler_stop");
  return res.data;
}

export async function getLeadStats() {
  const res = await api.get("/_api_leads_stats");
  return res.data;
}

export async function getLeadCategories() {
  const res = await api.get("/_api_leads_categories");
  return res.data;
}

export async function getLeadSources() {
  const res = await api.get("/_api_leads_sources");
  return res.data;
}

export async function getLeads(params = {}) {
  const res = await api.get("/_api_leads", { params });
  return res.data;
}
