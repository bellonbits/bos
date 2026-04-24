/**
 * ConflictResolver — Last-write-wins with timestamp comparison
 *
 * Strategy:
 *   - Client updated_at < Server updated_at  → server wins, apply server version locally
 *   - Client updated_at >= Server updated_at → client wins, server already accepted it
 *
 * For sales: never overwrite — sales are append-only (immutable after creation)
 * For inventory: recalculate from movements, don't use raw stock values directly
 * For products: merge name/price from whoever is newer
 */

import { dbRun, dbQueryFirst } from '@db/database';
import type { SyncQueueItem } from '@db/repositories/SyncQueueRepo';

interface ServerEntity {
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: Record<string, unknown>;
  updated_at: number;
}

export const ConflictResolver = {
  async resolve(item: SyncQueueItem, serverVersion: Record<string, unknown>): Promise<void> {
    const clientPayload = JSON.parse(item.payload) as Record<string, unknown>;
    const clientUpdatedAt = (clientPayload.updated_at as number) ?? 0;
    const serverUpdatedAt = (serverVersion.updated_at as number) ?? 0;

    if (serverUpdatedAt > clientUpdatedAt) {
      // Server wins — write server version to local DB
      await this.writeEntityLocally(item.entity_type, serverVersion);
    }
    // If client is newer, the push endpoint accepted our version — no action needed
  },

  async applyServerChanges(entities: ServerEntity[]): Promise<void> {
    for (const entity of entities) {
      const { entity_type, entity_id, operation, payload, updated_at } = entity;

      if (operation === 'delete') {
        await this.deleteEntityLocally(entity_type, entity_id);
        continue;
      }

      // Check local updated_at before overwriting
      const local = await this.getLocalEntity(entity_type, entity_id);
      if (local && (local.updated_at as number) > updated_at) {
        // Local is newer — skip (client wins for this entity)
        continue;
      }

      await this.writeEntityLocally(entity_type, { ...payload, sync_status: 'synced', synced_at: Date.now() });
    }
  },

  async writeEntityLocally(entityType: string, data: Record<string, unknown>): Promise<void> {
    switch (entityType) {
      case 'products':
        await dbRun(
          `INSERT OR REPLACE INTO products (
            id, business_id, name, sku, barcode, price, cost_price, stock_quantity,
            low_stock_threshold, unit, category, is_active,
            created_at, updated_at, synced_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id, data.business_id, data.name, data.sku, data.barcode,
            data.price, data.cost_price, data.stock_quantity, data.low_stock_threshold,
            data.unit, data.category, data.is_active,
            data.created_at, data.updated_at, data.synced_at ?? Date.now(), 'synced',
          ]
        );
        break;

      case 'sales':
        // Sales are immutable — only insert if not already present
        await dbRun(
          `INSERT OR IGNORE INTO sales (
            id, business_id, cashier_id, total_amount, discount_amount, tax_amount,
            payment_method, mpesa_code, mpesa_phone, notes,
            created_at, updated_at, synced_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id, data.business_id, data.cashier_id, data.total_amount,
            data.discount_amount, data.tax_amount, data.payment_method,
            data.mpesa_code, data.mpesa_phone, data.notes,
            data.created_at, data.updated_at, Date.now(), 'synced',
          ]
        );
        break;

      default:
        // For other entity types, log and skip — prevents silent data corruption
        console.warn('[ConflictResolver] Unhandled entity type:', entityType);
    }
  },

  async deleteEntityLocally(entityType: string, entityId: string): Promise<void> {
    const tableMap: Record<string, string> = {
      products: 'products',
      expenses: 'expenses',
    };
    const table = tableMap[entityType];
    if (table) {
      await dbRun(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [entityId]);
    }
  },

  async getLocalEntity(entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    const tableMap: Record<string, string> = {
      products: 'products',
      sales: 'sales',
      expenses: 'expenses',
    };
    const table = tableMap[entityType];
    if (!table) return null;
    return dbQueryFirst<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [entityId]);
  },
};
