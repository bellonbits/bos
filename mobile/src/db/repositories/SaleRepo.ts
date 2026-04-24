import { dbQueryFirst, dbTransaction, getDatabase } from '../database';
import { generateId, nowMs } from '@utils/helpers';
import { SyncQueueRepo } from './SyncQueueRepo';
import { ProductRepo } from './ProductRepo';
import { SYNC_PRIORITIES } from '../schema';
import type * as SQLite from 'expo-sqlite';

export type PaymentMethod = 'cash' | 'mpesa';

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
}

export interface Sale {
  id: string;
  business_id: string;
  cashier_id: string | null;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  mpesa_code: string | null;
  mpesa_phone: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: string;
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

export interface CreateSaleInput {
  business_id: string;
  cashier_id?: string;
  items: CartItem[];
  payment_method: PaymentMethod;
  discount_amount?: number;
  mpesa_code?: string;
  mpesa_phone?: string;
  notes?: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export const SaleRepo = {
  // The most critical path in the app — must complete < 50ms
  async create(input: CreateSaleInput): Promise<SaleWithItems> {
    const totalAmount = input.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const discount = input.discount_amount ?? 0;

    const sale: Sale = {
      id: generateId(),
      business_id: input.business_id,
      cashier_id: input.cashier_id ?? null,
      total_amount: totalAmount - discount,
      discount_amount: discount,
      tax_amount: 0,
      payment_method: input.payment_method,
      mpesa_code: input.mpesa_code ?? null,
      mpesa_phone: input.mpesa_phone ?? null,
      notes: input.notes ?? null,
      created_at: nowMs(),
      updated_at: nowMs(),
      synced_at: null,
      sync_status: 'pending',
    };

    const saleItems: SaleItem[] = input.items.map((item) => ({
      id: generateId(),
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      subtotal: item.unit_price * item.quantity,
      created_at: sale.created_at,
    }));

    // All writes in a single transaction — atomic, fast, offline-safe
    await dbTransaction(async (db) => {
      // 1. Insert sale record
      await db.runAsync(
        `INSERT INTO sales (
          id, business_id, cashier_id, total_amount, discount_amount, tax_amount,
          payment_method, mpesa_code, mpesa_phone, notes,
          created_at, updated_at, synced_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.id, sale.business_id, sale.cashier_id, sale.total_amount,
          sale.discount_amount, sale.tax_amount, sale.payment_method,
          sale.mpesa_code, sale.mpesa_phone, sale.notes,
          sale.created_at, sale.updated_at, sale.synced_at, sale.sync_status,
        ]
      );

      // 2. Insert all sale items + deduct stock + record inventory movements
      for (const item of saleItems) {
        await db.runAsync(
          `INSERT INTO sale_items (
            id, sale_id, product_id, product_name, quantity,
            unit_price, cost_price, subtotal, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id, item.sale_id, item.product_id, item.product_name,
            item.quantity, item.unit_price, item.cost_price, item.subtotal, item.created_at,
          ]
        );

        // Deduct stock atomically
        const { before, after } = await ProductRepo.deductStock(item.product_id, item.quantity, db);

        // Record inventory movement
        const movementId = generateId();
        await db.runAsync(
          `INSERT INTO inventory_movements (
            id, business_id, product_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_id, reference_type,
            created_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            movementId, sale.business_id, item.product_id, 'sale',
            -item.quantity, before, after, sale.id, 'sale',
            sale.created_at, 'pending',
          ]
        );
      }
    });

    // Enqueue for background sync (outside transaction — non-blocking)
    await SyncQueueRepo.enqueue({
      entity_type: 'sales',
      entity_id: sale.id,
      operation: 'create',
      payload: { ...sale, items: saleItems },
      priority: SYNC_PRIORITIES.sales,
    });

    return { ...sale, items: saleItems };
  },

  async findById(id: string): Promise<SaleWithItems | null> {
    const sale = await dbQueryFirst<Sale>(
      'SELECT * FROM sales WHERE id = ?',
      [id]
    );
    if (!sale) return null;

    const db = await getDatabase();
    const items = await db.getAllAsync<SaleItem>(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [id]
    );

    return { ...sale, items };
  },

  async getDailySales(businessId: string, dateMs: number): Promise<Sale[]> {
    const startOfDay = new Date(dateMs);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateMs);
    endOfDay.setHours(23, 59, 59, 999);

    const db = await getDatabase();
    return db.getAllAsync<Sale>(
      `SELECT * FROM sales
       WHERE business_id = ? AND created_at BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [businessId, startOfDay.getTime(), endOfDay.getTime()]
    );
  },

  async getDailySummary(businessId: string, dateMs: number): Promise<DailySummary> {
    const startOfDay = new Date(dateMs);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateMs);
    endOfDay.setHours(23, 59, 59, 999);

    const db = await getDatabase();

    const summary = await db.getFirstAsync<{
      total_revenue: number;
      total_transactions: number;
      cash_revenue: number;
      mpesa_revenue: number;
    }>(
      `SELECT
         COALESCE(SUM(total_amount), 0)                                     AS total_revenue,
         COUNT(*)                                                             AS total_transactions,
         COALESCE(SUM(CASE WHEN payment_method = 'cash'  THEN total_amount ELSE 0 END), 0) AS cash_revenue,
         COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) AS mpesa_revenue
       FROM sales
       WHERE business_id = ? AND created_at BETWEEN ? AND ?`,
      [businessId, startOfDay.getTime(), endOfDay.getTime()]
    );

    const costRow = await db.getFirstAsync<{ total_cost: number }>(
      `SELECT COALESCE(SUM(si.quantity * si.cost_price), 0) AS total_cost
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_id = ? AND s.created_at BETWEEN ? AND ?`,
      [businessId, startOfDay.getTime(), endOfDay.getTime()]
    );

    const topProducts = await db.getAllAsync<TopProduct>(
      `SELECT
         si.product_id,
         si.product_name,
         SUM(si.quantity)  AS total_qty,
         SUM(si.subtotal)  AS total_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_id = ? AND s.created_at BETWEEN ? AND ?
       GROUP BY si.product_id, si.product_name
       ORDER BY total_revenue DESC
       LIMIT 5`,
      [businessId, startOfDay.getTime(), endOfDay.getTime()]
    );

    const revenue = summary?.total_revenue ?? 0;
    const cost = costRow?.total_cost ?? 0;

    return {
      date: dateMs,
      total_revenue: revenue,
      total_cost: cost,
      gross_profit: revenue - cost,
      profit_margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      total_transactions: summary?.total_transactions ?? 0,
      cash_revenue: summary?.cash_revenue ?? 0,
      mpesa_revenue: summary?.mpesa_revenue ?? 0,
      top_products: topProducts,
    };
  },

  async getWeeklySummary(businessId: string): Promise<DailyRevenue[]> {
    const db = await getDatabase();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return db.getAllAsync<DailyRevenue>(
      `SELECT
         strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch', 'localtime')) AS date,
         COALESCE(SUM(total_amount), 0)                                               AS revenue,
         COUNT(*)                                                                      AS transactions
       FROM sales
       WHERE business_id = ? AND created_at >= ?
       GROUP BY date
       ORDER BY date ASC`,
      [businessId, sevenDaysAgo]
    );
  },
};

export interface DailySummary {
  date: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  total_transactions: number;
  cash_revenue: number;
  mpesa_revenue: number;
  top_products: TopProduct[];
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  transactions: number;
}
