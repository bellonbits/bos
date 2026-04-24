-- Biashara OS — Supabase PostgreSQL Initial Migration
-- Run via: supabase db push

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email        TEXT        NOT NULL UNIQUE,
    name         TEXT        NOT NULL,
    phone        TEXT,
    role         TEXT        NOT NULL DEFAULT 'owner',
    password_hash TEXT       NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   BIGINT      NOT NULL,
    updated_at   BIGINT      NOT NULL
);

CREATE INDEX ix_users_email ON users(email);

-- ─── Businesses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
    id                TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name              TEXT    NOT NULL,
    owner_id          TEXT    NOT NULL REFERENCES users(id),
    phone             TEXT,
    location          TEXT,
    business_type     TEXT    NOT NULL DEFAULT 'retail',
    currency          TEXT    NOT NULL DEFAULT 'KES',
    subscription_tier TEXT    NOT NULL DEFAULT 'free',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        BIGINT  NOT NULL,
    updated_at        BIGINT  NOT NULL
);

CREATE INDEX ix_businesses_owner ON businesses(owner_id);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id                  TEXT    PRIMARY KEY,
    business_id         TEXT    NOT NULL REFERENCES businesses(id),
    name                TEXT    NOT NULL,
    sku                 TEXT,
    barcode             TEXT,
    description         TEXT,
    price               NUMERIC(12,2) NOT NULL,
    cost_price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity      INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    unit                TEXT    NOT NULL DEFAULT 'piece',
    category            TEXT,
    image_url           TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          BIGINT  NOT NULL,
    updated_at          BIGINT  NOT NULL
);

CREATE INDEX ix_products_business_active ON products(business_id, is_active);
CREATE INDEX ix_products_barcode         ON products(barcode);
CREATE INDEX ix_products_updated         ON products(updated_at);
CREATE INDEX ix_products_category        ON products(business_id, category);

-- ─── Sales ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
    id              TEXT          PRIMARY KEY,
    business_id     TEXT          NOT NULL REFERENCES businesses(id),
    cashier_id      TEXT          REFERENCES users(id),
    total_amount    NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method  TEXT          NOT NULL DEFAULT 'cash',
    mpesa_code      TEXT,
    mpesa_phone     TEXT,
    notes           TEXT,
    created_at      BIGINT        NOT NULL,
    updated_at      BIGINT        NOT NULL
);

CREATE INDEX ix_sales_business_created ON sales(business_id, created_at DESC);
CREATE INDEX ix_sales_payment_method   ON sales(payment_method);
CREATE INDEX ix_sales_created          ON sales(created_at DESC);

-- ─── Sale Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
    id            TEXT          PRIMARY KEY,
    sale_id       TEXT          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id    TEXT          NOT NULL REFERENCES products(id),
    product_name  TEXT          NOT NULL,
    quantity      INTEGER       NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,
    cost_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal      NUMERIC(12,2) NOT NULL,
    created_at    BIGINT        NOT NULL
);

CREATE INDEX ix_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX ix_sale_items_product ON sale_items(product_id);

-- ─── Inventory Movements ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
    id              TEXT    PRIMARY KEY,
    business_id     TEXT    NOT NULL REFERENCES businesses(id),
    product_id      TEXT    NOT NULL REFERENCES products(id),
    movement_type   TEXT    NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after  INTEGER NOT NULL,
    reference_id    TEXT,
    reference_type  TEXT,
    notes           TEXT,
    created_at      BIGINT  NOT NULL
);

CREATE INDEX ix_inv_product_created ON inventory_movements(product_id, created_at);
CREATE INDEX ix_inv_type            ON inventory_movements(movement_type);
CREATE INDEX ix_inv_reference       ON inventory_movements(reference_id);
CREATE INDEX ix_inv_business        ON inventory_movements(business_id, created_at);

-- ─── Expenses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT          PRIMARY KEY,
    business_id TEXT          NOT NULL REFERENCES businesses(id),
    category    TEXT          NOT NULL,
    description TEXT,
    amount      NUMERIC(12,2) NOT NULL,
    receipt_url TEXT,
    created_at  BIGINT        NOT NULL,
    updated_at  BIGINT        NOT NULL
);

CREATE INDEX ix_expenses_business_created ON expenses(business_id, created_at);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Supabase RLS ensures users can only access their own business data

ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;

-- The FastAPI service role bypasses RLS via service_role key
-- These policies are for direct Supabase client access

CREATE POLICY "owners_own_businesses" ON businesses
    FOR ALL USING (owner_id = current_setting('app.user_id', TRUE));

CREATE POLICY "owners_own_products" ON products
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = current_setting('app.user_id', TRUE)
        )
    );

CREATE POLICY "owners_own_sales" ON sales
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = current_setting('app.user_id', TRUE)
        )
    );

-- ─── Useful Views ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW daily_revenue AS
SELECT
    business_id,
    to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') AS date,
    SUM(total_amount)                                         AS revenue,
    COUNT(*)                                                   AS transaction_count,
    SUM(CASE WHEN payment_method = 'cash'  THEN total_amount ELSE 0 END) AS cash_revenue,
    SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END) AS mpesa_revenue
FROM sales
GROUP BY business_id, date;

CREATE OR REPLACE VIEW product_performance AS
SELECT
    si.product_id,
    si.product_name,
    p.business_id,
    SUM(si.quantity)                              AS total_sold,
    SUM(si.subtotal)                              AS total_revenue,
    SUM(si.quantity * si.cost_price)              AS total_cost,
    SUM(si.subtotal - si.quantity * si.cost_price) AS total_profit
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
GROUP BY si.product_id, si.product_name, p.business_id;
