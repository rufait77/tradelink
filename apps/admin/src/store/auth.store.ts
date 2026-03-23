'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AuthStore {
  admin: Admin | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,

      login: async (email, password) => {
        const res = await api.post('/admin/auth/login', { email, password });
        const { accessToken, admin } = res.data.data;
        set({ admin, token: accessToken });
      },

      logout: () => {
        set({ admin: null, token: null });
      },

      isAuthenticated: () => !!get().token,
    }),
    { name: 'admin_auth', partialize: (s) => ({ admin: s.admin, token: s.token }) }
  )
);
