'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface UserProfile {
  tradeTypes?: string[];
  bio?: string;
  city?: string;
  state?: string;
  photoUrl?: string;
  avgRating?: number;
  totalEarned?: number;
  stripeConnectStatus?: string;
  onboardingComplete?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  profile?: UserProfile;
  subscription?: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

interface AuthStore {
  user: User | null;
  token: string | null;
  onboardingComplete: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  fetchMe: () => Promise<void>;
  isAuthenticated: () => boolean;
  needsOnboarding: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      onboardingComplete: false,

      login: async (email, password, rememberMe = false) => {
        const res = await api.post('/auth/login', { email, password, rememberMe });
        const { accessToken, user, onboardingComplete } = res.data.data;
        localStorage.setItem('tradelink_token', accessToken);
        set({ user, token: accessToken, onboardingComplete });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // silent
        }
        localStorage.removeItem('tradelink_token');
        set({ user: null, token: null, onboardingComplete: false });
      },

      setToken: (token) => {
        localStorage.setItem('tradelink_token', token);
        set({ token });
      },

      setUser: (user) => set({ user }),

      fetchMe: async () => {
        try {
          const res = await api.get('/auth/me');
          const user = res.data.data.user;
          set({
            user,
            onboardingComplete: user.profile?.onboardingComplete ?? false,
          });
        } catch {
          set({ user: null, token: null, onboardingComplete: false });
        }
      },

      isAuthenticated: () => !!get().token,

      needsOnboarding: () => {
        const { user, onboardingComplete } = get();
        return !!user && !onboardingComplete;
      },
    }),
    {
      name: 'tradelink_auth',
      partialize: (s) => ({ user: s.user, token: s.token, onboardingComplete: s.onboardingComplete }),
    }
  )
);
