import axios, { type AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const AuthAPI = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post<TokenResponse>('/auth/register', data),
  me: () => api.get<User>('/auth/me/'),
  updateMe: (data: { name?: string; phone?: string }) =>
    api.patch<User>('/auth/me/', data),
  deleteMe: () => api.delete('/auth/me/'),
};

// ─── Business ─────────────────────────────────────────────────────────────────

export const BusinessAPI = {
  list: () => api.get<Business[]>('/businesses/'),
  create: (data: { name: string; business_type: string; location?: string; phone?: string }) =>
    api.post<Business>('/businesses/', data),
  get: (id: string) => api.get<Business>(`/businesses/${id}`),
  update: (id: string, data: Partial<Omit<Business, 'id' | 'owner_id'>>) =>
    api.patch<Business>(`/businesses/${id}/`, data),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const ProductAPI = {
  list: (businessId: string, q?: string) =>
    api.get<Product[]>(`/products/${businessId}/`, { params: q ? { q } : {} }),
  create: (data: Partial<Product>) => api.post<Product>('/products/', data),
  update: (id: string, data: Partial<Product>) => api.patch<Product>(`/products/${id}/`, data),
  delete: (id: string) => api.delete(`/products/${id}/`),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const ExpenseAPI = {
  list: (businessId: string) => api.get<Expense[]>(`/expenses/${businessId}/`),
  create: (data: {
    business_id: string;
    category: string;
    description?: string;
    amount: number;
    receipt_url?: string;
  }) => api.post<Expense>('/expenses/', data),
  update: (id: string, data: { category?: string; description?: string; amount?: number }) =>
    api.patch<Expense>(`/expenses/${id}/`, data),
  delete: (id: string) => api.delete(`/expenses/${id}/`),
};

// ─── Sales ────────────────────────────────────────────────────────────────────

export const SalesAPI = {
  list: (businessId: string) => api.get<Sale[]>(`/sales/${businessId}/`),
  get: (businessId: string, saleId: string) =>
    api.get<Sale>(`/sales/${businessId}/${saleId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const AnalyticsAPI = {
  daily: (businessId: string, date?: string) =>
    api.get<DailySummary>(`/analytics/${businessId}/daily/`, { params: date ? { date } : {} }),
  weekly: (businessId: string) =>
    api.get<{ data: WeeklyPoint[] }>(`/analytics/${businessId}/weekly/`),
  lossDetection: (businessId: string) =>
    api.get(`/analytics/${businessId}/loss-detection/`),
  aiInsights: (businessId: string) =>
    api.get<{ insights: string[] }>(`/analytics/${businessId}/ai-insights/`),
};

export const AdminAPI = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
  businesses: () => api.get('/admin/businesses'),
  updateRole: (userId: string, role: string) => 
    api.post(`/admin/users/${userId}/role`, null, { params: { role } }),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const SyncAPI = {
  push: (item: SyncPushItem) => api.post('/sync/push/', item),
  pull: (since: number, businessId?: string) =>
    api.get('/sync/pull/', { params: { since, business_id: businessId } }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  business_type: string;
  subscription_tier: string;
  currency: string;
  location?: string;
  phone?: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  category?: string;
  barcode?: string;
  sku?: string;
  description?: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  description?: string;
  amount: number;
  receipt_url?: string;
  created_at: number;
  updated_at: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  created_at: number;
}

export interface Sale {
  id: string;
  business_id: string;
  cashier_id?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  mpesa_code?: string;
  mpesa_phone?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
  items: SaleItem[];
}

export interface DailySummary {
  date: string;
  total_revenue: number;
  gross_profit: number;
  profit_margin: number;
  total_transactions: number;
  avg_order_value: number;
  cash_revenue: number;
  mpesa_revenue: number;
  bank_revenue: number;
  top_products: { product_name: string; total_revenue: number; quantity_sold: number }[];
}

export interface WeeklyPoint {
  date: string;
  revenue: number;
}

export interface SyncPushItem {
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: Record<string, unknown>;
  client_updated_at: number;
}
