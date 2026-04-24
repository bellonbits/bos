import { create } from 'zustand';
import { AuthAPI, BusinessAPI, type User, type Business } from '@/services/api';

interface AuthState {
  user: User | null;
  business: Business | null;
  businesses: Business[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  setActiveBusiness: (b: Business) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  business: null,
  businesses: [],
  isAuthenticated: false,
  isLoading: true,
  error: null,

  async initialize() {
    const token = localStorage.getItem('access_token');
    if (!token) { set({ isLoading: false }); return; }
    set({ isLoading: true });
    try {
      const { data: user } = await AuthAPI.me();
      const { data: businesses } = await BusinessAPI.list();
      const savedBizId = localStorage.getItem('active_business_id');
      const business = businesses.find((b) => b.id === savedBizId) ?? businesses[0] ?? null;
      set({ user, businesses, business, isAuthenticated: true });
    } catch {
      localStorage.clear();
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await AuthAPI.login(email, password);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      const { data: businesses } = await BusinessAPI.list();
      const business = businesses[0] ?? null;
      if (business) localStorage.setItem('active_business_id', business.id);
      set({ user: data.user, businesses, business, isAuthenticated: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async register({ email, password, name }) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await AuthAPI.register({ email, password, name });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout() {
    localStorage.clear();
    set({ user: null, business: null, businesses: [], isAuthenticated: false });
  },

  async deleteAccount() {
    await AuthAPI.deleteMe();
    localStorage.clear();
    set({ user: null, business: null, businesses: [], isAuthenticated: false });
  },

  setActiveBusiness(b) {
    localStorage.setItem('active_business_id', b.id);
    set({ business: b });
  },

  clearError() { set({ error: null }); },
}));
