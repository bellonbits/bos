import { dbQuery, dbQueryFirst, dbRun, getDatabase } from '../database';
import { generateId, nowMs } from '@utils/helpers';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  status: SyncStatus;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  priority: number;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
}

export interface EnqueueInput {
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: unknown;
  priority?: number;
}

export const SyncQueueRepo = {
  async enqueue(input: EnqueueInput): Promise<void> {
    const now = nowMs();
    // If a pending entry already exists for the same entity, update payload instead of inserting
    // This deduplcates rapid updates to the same record
    const existing = await dbQueryFirst<{ id: string }>(
      `SELECT id FROM sync_queue
       WHERE entity_id = ? AND entity_type = ? AND status IN ('pending', 'failed')
       ORDER BY created_at DESC LIMIT 1`,
      [input.entity_id, input.entity_type]
    );

    if (existing && input.operation === 'update') {
      // Overwrite with the latest snapshot — no need to replay each update individually
      await dbRun(
        `UPDATE sync_queue SET payload = ?, updated_at = ?, status = 'pending', retry_count = 0
         WHERE id = ?`,
        [JSON.stringify(input.payload), now, existing.id]
      );
    } else {
      await dbRun(
        `INSERT INTO sync_queue (
          id, entity_type, entity_id, operation, payload, status,
          retry_count, max_retries, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 0, 5, ?, ?, ?)`,
        [
          generateId(),
          input.entity_type,
          input.entity_id,
          input.operation,
          JSON.stringify(input.payload),
          input.priority ?? 1,
          now,
          now,
        ]
      );
    }
  },

  async getPending(limit = 20): Promise<SyncQueueItem[]> {
    return dbQuery<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [limit]
    );
  },

  async markSyncing(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await dbRun(
      `UPDATE sync_queue SET status = 'syncing', updated_at = ? WHERE id IN (${placeholders})`,
      [nowMs(), ...ids]
    );
  },

  async markSynced(id: string): Promise<void> {
    await dbRun(
      `UPDATE sync_queue
       SET status = 'synced', synced_at = ?, updated_at = ?
       WHERE id = ?`,
      [nowMs(), nowMs(), id]
    );
  },

  async markFailed(id: string, error: string): Promise<void> {
    const item = await dbQueryFirst<SyncQueueItem>(
      'SELECT retry_count, max_retries FROM sync_queue WHERE id = ?',
      [id]
    );
    if (!item) return;

    const newRetryCount = item.retry_count + 1;
    const isFinalFailure = newRetryCount >= item.max_retries;

    await dbRun(
      `UPDATE sync_queue
       SET status = ?, retry_count = ?, last_error = ?, updated_at = ?
       WHERE id = ?`,
      [
        isFinalFailure ? 'failed' : 'pending',
        newRetryCount,
        error.slice(0, 500), // cap error length
        nowMs(),
        id,
      ]
    );
  },

  async getPendingCount(): Promise<number> {
    const row = await dbQueryFirst<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status IN ('pending', 'syncing')"
    );
    return row?.count ?? 0;
  },

  async getFailedCount(): Promise<number> {
    const row = await dbQueryFirst<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'failed'"
    );
    return row?.count ?? 0;
  },

  async retryFailed(): Promise<void> {
    await dbRun(
      `UPDATE sync_queue
       SET status = 'pending', retry_count = 0, last_error = NULL, updated_at = ?
       WHERE status = 'failed'`,
      [nowMs()]
    );
  },

  // Reset any 'syncing' items back to 'pending' — handles app crash mid-sync
  async resetStuckItems(): Promise<void> {
    const stuckThresholdMs = 5 * 60 * 1000; // 5 minutes
    await dbRun(
      `UPDATE sync_queue
       SET status = 'pending', updated_at = ?
       WHERE status = 'syncing' AND updated_at < ?`,
      [nowMs(), Date.now() - stuckThresholdMs]
    );
  },

  async purgeOldSynced(olderThanDays = 30): Promise<void> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    await dbRun(
      "DELETE FROM sync_queue WHERE status = 'synced' AND synced_at < ?",
      [cutoff]
    );
  },
};
