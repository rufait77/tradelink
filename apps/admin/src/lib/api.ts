import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helper to read token from Zustand persisted storage (single source of truth)
function getPersistedToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('admin_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = getPersistedToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
