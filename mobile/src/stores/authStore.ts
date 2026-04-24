import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthAPI, saveTokens, clearTokens } from '@services/api';
import { dbRun, dbQueryFirst } from '@db/database';
import { generateId, nowMs } from '@utils/helpers';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ActiveBusiness {
  id: string;
  name: string;
  business_type: string;
  subscription_tier: string;
}

interface AuthState {
  user: AuthUser | null;
  business: ActiveBusiness | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setActiveBusiness: (business: ActiveBusiness) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  business: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  async initialize() {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const storedUser = await SecureStore.getItemAsync('user_data');
      const storedBusiness = await SecureStore.getItemAsync('active_business');

      if (token && storedUser) {
        const user = JSON.parse(storedUser) as AuthUser;
        const business = storedBusiness ? (JSON.parse(storedBusiness) as ActiveBusiness) : null;
        set({ user, business, isAuthenticated: true });
      }
    } catch {
      await clearTokens();
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await AuthAPI.login({ email, password });
      await saveTokens(data.access_token, data.refresh_token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));

      // Upsert user locally
      await dbRun(
        `INSERT OR REPLACE INTO users (id, email, name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.user.id, data.user.email, data.user.name, data.user.role, nowMs(), nowMs()]
      );

      // Load the user's first business
      const business = await dbQueryFirst<ActiveBusiness>(
        'SELECT id, name, business_type, subscription_tier FROM businesses WHERE owner_id = ? LIMIT 1',
        [data.user.id]
      );

      if (business) {
        await SecureStore.setItemAsync('active_business', JSON.stringify(business));
      }

      set({ user: data.user, business: business ?? null, isAuthenticated: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Login failed. Check your credentials.';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  async register({ email, password, name, phone }) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await AuthAPI.register({ email, password, name, phone });
      await saveTokens(data.access_token, data.refresh_token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));

      await dbRun(
        `INSERT OR REPLACE INTO users (id, email, name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.user.id, data.user.email, data.user.name, data.user.role, nowMs(), nowMs()]
      );

      set({ user: data.user, isAuthenticated: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Registration failed.';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  async logout() {
    await clearTokens();
    await Promise.all([
      SecureStore.deleteItemAsync('user_data'),
      SecureStore.deleteItemAsync('active_business'),
    ]);
    set({ user: null, business: null, isAuthenticated: false });
  },

  setActiveBusiness(business) {
    SecureStore.setItemAsync('active_business', JSON.stringify(business));
    set({ business });
  },

  clearError() {
    set({ error: null });
  },
}));
