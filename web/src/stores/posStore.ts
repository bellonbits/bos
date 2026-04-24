import { create } from 'zustand';
import { SyncAPI } from '@/services/api';
import type { Product } from '@/services/api';
import { v4 as uuidv4 } from 'uuid';

export type PaymentMethod = 'cash' | 'mpesa';

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
}

interface POSState {
  cart: CartItem[];
  discount: number;
  note: string;
  isProcessing: boolean;
  lastSaleId: string | null;

  addToCart: (p: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setDiscount: (n: number) => void;
  setNote: (s: string) => void;
  clearCart: () => void;
  checkout: (businessId: string, method: PaymentMethod, mpesaCode?: string, mpesaPhone?: string) => Promise<string>;

  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
  estimatedProfit: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: 0,
  note: '',
  isProcessing: false,
  lastSaleId: null,

  addToCart(p) {
    const existing = get().cart.find((i) => i.product_id === p.id);
    if (existing) {
      set({ cart: get().cart.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i) });
    } else {
      set({ cart: [...get().cart, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.price, cost_price: p.cost_price }] });
    }
  },

  removeFromCart(productId) {
    set({ cart: get().cart.filter((i) => i.product_id !== productId) });
  },

  updateQty(productId, qty) {
    if (qty <= 0) { get().removeFromCart(productId); return; }
    set({ cart: get().cart.map((i) => i.product_id === productId ? { ...i, quantity: qty } : i) });
  },

  setDiscount(n) { set({ discount: Math.max(0, n) }); },
  setNote(s) { set({ note: s }); },

  clearCart() {
    set({ cart: [], discount: 0, note: '', lastSaleId: null });
  },

  async checkout(businessId, method, mpesaCode, mpesaPhone) {
    const { cart, discount, note } = get();
    if (cart.length === 0) throw new Error('Cart is empty');
    set({ isProcessing: true });

    const saleId = uuidv4();
    const now = Date.now();
    const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const total = Math.max(0, subtotal - discount);

    const saleItems = cart.map((i) => ({
      id: uuidv4(), sale_id: saleId, product_id: i.product_id, product_name: i.product_name,
      quantity: i.quantity, unit_price: i.unit_price, cost_price: i.cost_price,
      subtotal: i.unit_price * i.quantity, created_at: now,
    }));

    const salePayload = {
      id: saleId, business_id: businessId, total_amount: total, discount_amount: discount,
      tax_amount: 0, payment_method: method, mpesa_code: mpesaCode ?? null,
      mpesa_phone: mpesaPhone ?? null, notes: note || null, items: saleItems,
      created_at: now, updated_at: now,
    };

    try {
      await SyncAPI.push({
        entity_type: 'sales', entity_id: saleId, operation: 'create',
        payload: salePayload, client_updated_at: now,
      });
      set({ lastSaleId: saleId, cart: [], discount: 0, note: '' });
      return saleId;
    } finally {
      set({ isProcessing: false });
    }
  },

  subtotal: () => get().cart.reduce((s, i) => s + i.unit_price * i.quantity, 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
  itemCount: () => get().cart.reduce((s, i) => s + i.quantity, 0),
  estimatedProfit: () => get().cart.reduce((s, i) => s + (i.unit_price - i.cost_price) * i.quantity, 0) - get().discount,
}));
