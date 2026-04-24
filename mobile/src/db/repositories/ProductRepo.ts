import { dbQuery, dbQueryFirst, dbRun, dbTransaction, getDatabase } from '../database';
import { generateId, nowMs } from '@utils/helpers';
import { SyncQueueRepo } from './SyncQueueRepo';
import { SYNC_PRIORITIES } from '../schema';

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  category: string | null;
  image_url: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: string;
}

export interface CreateProductInput {
  business_id: string;
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  description?: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  cost_price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit?: string;
  category?: string;
  barcode?: string;
  description?: string;
  is_active?: number;
}

export const ProductRepo = {
  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = {
      id: generateId(),
      business_id: input.business_id,
      name: input.name,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      description: input.description ?? null,
      price: input.price,
      cost_price: input.cost_price ?? 0,
      stock_quantity: input.stock_quantity ?? 0,
      low_stock_threshold: input.low_stock_threshold ?? 5,
      unit: input.unit ?? 'piece',
      category: input.category ?? null,
      image_url: null,
      is_active: 1,
      created_at: nowMs(),
      updated_at: nowMs(),
      synced_at: null,
      sync_status: 'pending',
    };

    await dbTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO products (
          id, business_id, name, sku, barcode, description, price, cost_price,
          stock_quantity, low_stock_threshold, unit, category, image_url,
          is_active, created_at, updated_at, synced_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id, product.business_id, product.name, product.sku,
          product.barcode, product.description, product.price, product.cost_price,
          product.stock_quantity, product.low_stock_threshold, product.unit,
          product.category, product.image_url, product.is_active,
          product.created_at, product.updated_at, product.synced_at, product.sync_status,
        ]
      );
    });

    await SyncQueueRepo.enqueue({
      entity_type: 'products',
      entity_id: product.id,
      operation: 'create',
      payload: product,
      priority: SYNC_PRIORITIES.products,
    });

    return product;
  },

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: Product = {
      ...existing,
      ...input,
      updated_at: nowMs(),
      sync_status: 'pending',
    };

    await dbRun(
      `UPDATE products SET
        name = ?, price = ?, cost_price = ?, stock_quantity = ?,
        low_stock_threshold = ?, unit = ?, category = ?, barcode = ?,
        description = ?, is_active = ?, updated_at = ?, sync_status = ?
       WHERE id = ?`,
      [
        updated.name, updated.price, updated.cost_price, updated.stock_quantity,
        updated.low_stock_threshold, updated.unit, updated.category, updated.barcode,
        updated.description, updated.is_active, updated.updated_at, updated.sync_status,
        id,
      ]
    );

    await SyncQueueRepo.enqueue({
      entity_type: 'products',
      entity_id: id,
      operation: 'update',
      payload: updated,
      priority: SYNC_PRIORITIES.products,
    });

    return updated;
  },

  async deductStock(
    productId: string,
    quantity: number,
    db: SQLite.SQLiteDatabase
  ): Promise<{ before: number; after: number }> {
    const product = await db.getFirstAsync<Pick<Product, 'stock_quantity'>>(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [productId]
    );
    if (!product) throw new Error(`Product ${productId} not found`);

    const before = product.stock_quantity;
    const after = Math.max(0, before - quantity);

    await db.runAsync(
      'UPDATE products SET stock_quantity = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      [after, nowMs(), 'pending', productId]
    );

    return { before, after };
  },

  async findById(id: string): Promise<Product | null> {
    return dbQueryFirst<Product>('SELECT * FROM products WHERE id = ?', [id]);
  },

  async findByBusiness(businessId: string): Promise<Product[]> {
    return dbQuery<Product>(
      'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY name ASC',
      [businessId]
    );
  },

  async findByBarcode(barcode: string, businessId: string): Promise<Product | null> {
    return dbQueryFirst<Product>(
      'SELECT * FROM products WHERE barcode = ? AND business_id = ? AND is_active = 1',
      [barcode, businessId]
    );
  },

  async findLowStock(businessId: string): Promise<Product[]> {
    return dbQuery<Product>(
      `SELECT * FROM products
       WHERE business_id = ? AND is_active = 1
         AND stock_quantity <= low_stock_threshold
       ORDER BY stock_quantity ASC`,
      [businessId]
    );
  },

  async searchByName(businessId: string, query: string): Promise<Product[]> {
    return dbQuery<Product>(
      `SELECT * FROM products
       WHERE business_id = ? AND is_active = 1 AND name LIKE ?
       ORDER BY name ASC LIMIT 30`,
      [businessId, `%${query}%`]
    );
  },

  async getStockValue(businessId: string): Promise<{ total_value: number; total_cost: number }> {
    const row = await dbQueryFirst<{ total_value: number; total_cost: number }>(
      `SELECT
         SUM(stock_quantity * price)      AS total_value,
         SUM(stock_quantity * cost_price) AS total_cost
       FROM products
       WHERE business_id = ? AND is_active = 1`,
      [businessId]
    );
    return row ?? { total_value: 0, total_cost: 0 };
  },
};

// Import needed for deductStock signature
import type * as SQLite from 'expo-sqlite';
