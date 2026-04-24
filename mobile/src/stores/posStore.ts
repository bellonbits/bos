/**
 * POS Store — Cart management
 *
 * All operations are synchronous (Zustand in-memory) — zero latency during checkout.
 * The actual DB write happens in recordSale(), which is fast (< 50ms SQLite transaction).
 */

import { create } from 'zustand';
import type { Product } from '@db/repositories/ProductRepo';
import { SaleRepo, type PaymentMethod, type SaleWithItems } from '@db/repositories/SaleRepo';

interface CartItem {
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
  lastSale: SaleWithItems | null;
  error: string | null;

  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (amount: number) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  recordSale: (businessId: string, paymentMethod: PaymentMethod, mpesaCode?: string, mpesaPhone?: string) => Promise<SaleWithItems>;
  clearError: () => void;

  // Computed helpers (call as functions — not reactive)
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getProfit: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: 0,
  note: '',
  isProcessing: false,
  lastSale: null,
  error: null,

  addToCart(product) {
    const cart = get().cart;
    const existing = cart.find((i) => i.product_id === product.id);

    if (existing) {
      set({
        cart: cart.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            cost_price: product.cost_price,
          },
        ],
      });
    }
  },

  removeFromCart(productId) {
    set({ cart: get().cart.filter((i) => i.product_id !== productId) });
  },

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((i) =>
        i.product_id === productId ? { ...i, quantity } : i
      ),
    });
  },

  setDiscount(amount) {
    set({ discount: Math.max(0, amount) });
  },

  setNote(note) {
    set({ note });
  },

  clearCart() {
    set({ cart: [], discount: 0, note: '', lastSale: null, error: null });
  },

  async recordSale(businessId, paymentMethod, mpesaCode, mpesaPhone) {
    const { cart, discount, note } = get();
    if (cart.length === 0) throw new Error('Cart is empty');

    set({ isProcessing: true, error: null });

    try {
      const sale = await SaleRepo.create({
        business_id: businessId,
        items: cart,
        payment_method: paymentMethod,
        discount_amount: discount,
        mpesa_code: mpesaCode,
        mpesa_phone: mpesaPhone,
        notes: note || undefined,
      });

      set({ lastSale: sale, cart: [], discount: 0, note: '' });
      return sale;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sale failed';
      set({ error: message });
      throw err;
    } finally {
      set({ isProcessing: false });
    }
  },

  clearError() {
    set({ error: null });
  },

  getSubtotal() {
    return get().cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  },

  getTotal() {
    return Math.max(0, get().getSubtotal() - get().discount);
  },

  getItemCount() {
    return get().cart.reduce((sum, i) => sum + i.quantity, 0);
  },

  getProfit() {
    return get().cart.reduce(
      (sum, i) => sum + (i.unit_price - i.cost_price) * i.quantity,
      0
    ) - get().discount;
  },
}));
