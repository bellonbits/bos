import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION, SEED_SETTINGS_SQL } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('biashara_os.db');
  await initializeDatabase(_db);
  return _db;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL mode and foreign keys are set inside CREATE_TABLES_SQL via PRAGMA
  await db.execAsync(CREATE_TABLES_SQL);

  const meta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'version'"
  );

  const currentVersion = meta ? parseInt(meta.value, 10) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(db, currentVersion);
    await db.runAsync(
      "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)",
      [String(SCHEMA_VERSION)]
    );
  }

  await db.execAsync(SEED_SETTINGS_SQL);
}

async function runMigrations(db: SQLite.SQLiteDatabase, fromVersion: number): Promise<void> {
  // Each migration is idempotent — safe to re-run
  if (fromVersion < 2) {
    await db.execAsync(`
      ALTER TABLE products ADD COLUMN image_url TEXT;
    `).catch(() => {}); // Column may already exist
  }

  if (fromVersion < 3) {
    await db.execAsync(`
      ALTER TABLE sales ADD COLUMN mpesa_phone TEXT;
      ALTER TABLE sales ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;
    `).catch(() => {});
  }

  if (fromVersion < 4) {
    await db.execAsync(`
      ALTER TABLE sync_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 1;
    `).catch(() => {});
    // Backfill priorities
    await db.execAsync(`
      UPDATE sync_queue SET priority = 10 WHERE entity_type = 'sales';
      UPDATE sync_queue SET priority = 9  WHERE entity_type = 'sale_items';
      UPDATE sync_queue SET priority = 8  WHERE entity_type = 'inventory_movements';
      UPDATE sync_queue SET priority = 5  WHERE entity_type = 'products';
    `).catch(() => {});
  }
}

// Typed query helpers to reduce boilerplate throughout the app

export async function dbQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDatabase();
  return db.getAllAsync<T>(sql, params);
}

export async function dbQueryFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = await getDatabase();
  return db.getFirstAsync<T>(sql, params);
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<SQLite.SQLiteRunResult> {
  const db = await getDatabase();
  return db.runAsync(sql, params);
}

export async function dbTransaction(fn: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await fn(db);
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await dbQueryFirst<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await dbRun(
    'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
    [key, value, Date.now()]
  );
}
