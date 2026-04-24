/**
 * SyncEngine — Offline-first sync orchestrator
 *
 * Flow:
 *   1. NetworkMonitor detects connectivity
 *   2. SyncEngine.run() drains the sync_queue in priority order
 *   3. Each item is POSTed to /api/v1/sync/push
 *   4. On success → marked 'synced'; on failure → retry with exponential backoff
 *   5. After push, SyncEngine.pull() fetches server changes since last_sync_at
 *
 * Conflict resolution strategy (MVP): last-write-wins based on updated_at timestamp.
 * Server rejects stale writes (updated_at < server record's updated_at) and returns
 * the server version, which the client merges in.
 */

import { SyncQueueRepo, type SyncQueueItem } from '@db/repositories/SyncQueueRepo';
import { setSetting, getSetting } from '@db/database';
import { apiClient } from '@services/api';
import { NetworkMonitor } from './NetworkMonitor';
import { ConflictResolver } from './ConflictResolver';

const BATCH_SIZE = 20;
const MAX_CONCURRENT = 3;

// Exponential backoff: 5s, 10s, 20s, 40s, 80s (capped at 5 min)
function backoffMs(retryCount: number): number {
  return Math.min(5_000 * Math.pow(2, retryCount), 300_000);
}

type SyncEventType = 'start' | 'progress' | 'complete' | 'error' | 'idle';
type SyncListener = (event: { type: SyncEventType; pendingCount?: number; error?: string }) => void;

class SyncEngineClass {
  private isRunning = false;
  private listeners = new Set<SyncListener>();
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(type: SyncEventType, extras: Partial<Parameters<SyncListener>[0]> = {}): void {
    this.listeners.forEach((l) => l({ type, ...extras }));
  }

  // Call once on app startup
  async start(): Promise<void> {
    await SyncQueueRepo.resetStuckItems();

    // Start periodic sync
    const intervalMs = parseInt((await getSetting('sync_interval_ms')) ?? '30000', 10);
    this.syncIntervalId = setInterval(() => this.run(), intervalMs);

    // React to connectivity changes
    NetworkMonitor.onConnected(async () => {
      await this.run();
    });

    // Initial sync attempt
    await this.run();
  }

  stop(): void {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
    this.isRunning = false;
  }

  async run(): Promise<void> {
    const isOnline = await NetworkMonitor.isOnline();
    if (!isOnline || this.isRunning) return;

    this.isRunning = true;
    this.emit('start');

    try {
      await this.push();
      await this.pull();
      await SyncQueueRepo.purgeOldSynced();
      this.emit('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('error', { error: message });
    } finally {
      this.isRunning = false;
      const pendingCount = await SyncQueueRepo.getPendingCount();
      this.emit('idle', { pendingCount });
    }
  }

  private async push(): Promise<void> {
    let hasMore = true;

    while (hasMore) {
      const items = await SyncQueueRepo.getPending(BATCH_SIZE);
      if (items.length === 0) {
        hasMore = false;
        break;
      }

      // Process in small concurrent batches — respects server rate limits
      for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
        const chunk = items.slice(i, i + MAX_CONCURRENT);
        await SyncQueueRepo.markSyncing(chunk.map((item) => item.id));
        await Promise.all(chunk.map((item) => this.syncItem(item)));
      }

      hasMore = items.length === BATCH_SIZE;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);

    try {
      const response = await apiClient.post('/sync/push', {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        operation: item.operation,
        payload,
        client_updated_at: payload.updated_at ?? payload.created_at,
      });

      if (response.data.conflict) {
        // Server returned a newer version — merge it in
        await ConflictResolver.resolve(item, response.data.server_version);
      }

      await SyncQueueRepo.markSynced(item.id);

      // Mark entity as synced in its own table
      await this.markEntitySynced(item.entity_type, item.entity_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      await SyncQueueRepo.markFailed(item.id, message);

      // Schedule retry with backoff
      const delay = backoffMs(item.retry_count);
      if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = setTimeout(() => this.run(), delay);
    }
  }

  private async pull(): Promise<void> {
    const lastSyncAt = parseInt((await getSetting('last_sync_at')) ?? '0', 10);

    try {
      const response = await apiClient.get('/sync/pull', {
        params: { since: lastSyncAt },
      });

      const { entities, server_time } = response.data as PullResponse;
      await ConflictResolver.applyServerChanges(entities);
      await setSetting('last_sync_at', String(server_time));
    } catch {
      // Pull failure is non-fatal — local data is always authoritative for the user
    }
  }

  private async markEntitySynced(entityType: string, entityId: string): Promise<void> {
    const tableMap: Record<string, string> = {
      products: 'products',
      sales: 'sales',
      expenses: 'expenses',
      inventory_movements: 'inventory_movements',
    };

    const table = tableMap[entityType];
    if (!table) return;

    const { dbRun } = await import('@db/database');
    await dbRun(
      `UPDATE ${table} SET sync_status = 'synced', synced_at = ? WHERE id = ?`,
      [Date.now(), entityId]
    );
  }

  async forcePushFailed(): Promise<void> {
    await SyncQueueRepo.retryFailed();
    await this.run();
  }
}

interface PullResponse {
  entities: Array<{
    entity_type: string;
    entity_id: string;
    operation: string;
    payload: Record<string, unknown>;
    updated_at: number;
  }>;
  server_time: number;
}

export const SyncEngine = new SyncEngineClass();
