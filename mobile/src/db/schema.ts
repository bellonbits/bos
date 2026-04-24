// Full SQLite schema for Biashara OS
// All timestamps stored as Unix milliseconds (INTEGER) for cross-platform consistency
// UUIDs used everywhere for safe offline ID generation without server coordination

export const SCHEMA_VERSION = 4;

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- ─── USERS ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    phone       TEXT,
    role        TEXT NOT NULL DEFAULT 'owner',
    avatar_url  TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  -- ─── BUSINESSES ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS businesses (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    owner_id            TEXT NOT NULL,
    phone               TEXT,
    location            TEXT,
    business_type       TEXT NOT NULL DEFAULT 'retail',
    currency            TEXT NOT NULL DEFAULT 'KES',
    subscription_tier   TEXT NOT NULL DEFAULT 'free',
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    synced_at           INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  -- ─── PRODUCTS ───────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS products (
    id                    TEXT PRIMARY KEY,
    business_id           TEXT NOT NULL,
    name                  TEXT NOT NULL,
    sku                   TEXT,
    barcode               TEXT,
    description           TEXT,
    price                 REAL NOT NULL DEFAULT 0,
    cost_price            REAL NOT NULL DEFAULT 0,
    stock_quantity        INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold   INTEGER NOT NULL DEFAULT 5,
    unit                  TEXT NOT NULL DEFAULT 'piece',
    category              TEXT,
    image_url             TEXT,
    is_active             INTEGER NOT NULL DEFAULT 1,
    created_at            INTEGER NOT NULL,
    updated_at            INTEGER NOT NULL,
    synced_at             INTEGER,
    sync_status           TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_business    ON products(business_id);
  CREATE INDEX IF NOT EXISTS idx_products_sync        ON products(sync_status);
  CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_active      ON products(business_id, is_active);

  -- ─── SALES ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS sales (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    cashier_id      TEXT,
    total_amount    REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount      REAL NOT NULL DEFAULT 0,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    mpesa_code      TEXT,
    mpesa_phone     TEXT,
    notes           TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    synced_at       INTEGER,
    sync_status     TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sales_business   ON sales(business_id);
  CREATE INDEX IF NOT EXISTS idx_sales_created    ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_sync       ON sales(sync_status);
  CREATE INDEX IF NOT EXISTS idx_sales_method     ON sales(payment_method);

  -- ─── SALE ITEMS ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS sale_items (
    id            TEXT PRIMARY KEY,
    sale_id       TEXT NOT NULL,
    product_id    TEXT NOT NULL,
    product_name  TEXT NOT NULL,
    quantity      INTEGER NOT NULL,
    unit_price    REAL NOT NULL,
    cost_price    REAL NOT NULL DEFAULT 0,
    subtotal      REAL NOT NULL,
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

  -- ─── INVENTORY MOVEMENTS ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS inventory_movements (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    product_id      TEXT NOT NULL,
    movement_type   TEXT NOT NULL,   -- sale | restock | adjustment | loss | return
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after  INTEGER NOT NULL,
    reference_id    TEXT,            -- sale_id or restock_id
    reference_type  TEXT,            -- 'sale' | 'restock'
    notes           TEXT,
    created_at      INTEGER NOT NULL,
    sync_status     TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE INDEX IF NOT EXISTS idx_inv_product  ON inventory_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_inv_type     ON inventory_movements(movement_type);
  CREATE INDEX IF NOT EXISTS idx_inv_created  ON inventory_movements(created_at);
  CREATE INDEX IF NOT EXISTS idx_inv_ref      ON inventory_movements(reference_id);

  -- ─── EXPENSES ───────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT,
    amount      REAL NOT NULL,
    receipt_url TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_business  ON expenses(business_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_created   ON expenses(created_at);

  -- ─── SYNC QUEUE (OUTBOX PATTERN) ────────────────────────────────────────────
  -- Every offline write enqueues here. SyncEngine drains this table.
  CREATE TABLE IF NOT EXISTS sync_queue (
    id            TEXT PRIMARY KEY,
    entity_type   TEXT NOT NULL,    -- products | sales | sale_items | inventory_movements | expenses
    entity_id     TEXT NOT NULL,
    operation     TEXT NOT NULL,    -- create | update | delete
    payload       TEXT NOT NULL,    -- Full JSON snapshot of the entity
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | syncing | synced | failed
    retry_count   INTEGER NOT NULL DEFAULT 0,
    max_retries   INTEGER NOT NULL DEFAULT 5,
    last_error    TEXT,
    priority      INTEGER NOT NULL DEFAULT 1,   -- higher = process first (sales=10, products=5)
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    synced_at     INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_sq_status    ON sync_queue(status);
  CREATE INDEX IF NOT EXISTS idx_sq_priority  ON sync_queue(status, priority DESC, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_sq_entity    ON sync_queue(entity_type, entity_id);

  -- ─── APP SETTINGS ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  -- ─── SCHEMA VERSION ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export const SEED_SETTINGS_SQL = `
  INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
    ('sync_enabled', 'true', ${Date.now()}),
    ('sync_interval_ms', '30000', ${Date.now()}),
    ('last_sync_at', '0', ${Date.now()}),
    ('low_stock_alerts', 'true', ${Date.now()});
`;

// Entity → sync priority mapping (higher number = synced first)
export const SYNC_PRIORITIES: Record<string, number> = {
  sales: 10,
  sale_items: 9,
  inventory_movements: 8,
  products: 5,
  expenses: 3,
};
