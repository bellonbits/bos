# Biashara OS — Architecture Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (Expo)                         │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │Dashboard │  │  POS     │  │ Inventory │  │   Reports     │  │
│  │(Insights)│  │(Checkout)│  │(Stock Mgt)│  │(Analytics)    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────┬────────┘  │
│       │              │               │                │           │
│  ┌────▼──────────────▼───────────────▼────────────────▼───────┐  │
│  │               ZUSTAND STORES (In-Memory State)              │  │
│  │     dashboardStore | posStore | authStore                   │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │              REPOSITORY LAYER (Data Access)                  │  │
│  │       ProductRepo | SaleRepo | SyncQueueRepo                 │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │              LOCAL SQLite DATABASE (expo-sqlite)             │  │
│  │  users | businesses | products | sales | sale_items          │  │
│  │  inventory_movements | expenses | sync_queue | app_settings  │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │                    SYNC ENGINE                               │  │
│  │  NetworkMonitor → OutboxQueue → ConflictResolver             │  │
│  │  Retry with exponential backoff (5s, 10s, 20s, 40s...)      │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────── ┘
                                  │ HTTPS (when online)
                                  │ Background sync
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                      FastAPI Backend                              │
│                                                                   │
│  /api/v1/auth     → JWT auth (login, register, refresh)          │
│  /api/v1/businesses → Business CRUD                              │
│  /api/v1/products   → Product CRUD                               │
│  /api/v1/sync/push  → Accept offline changes (outbox drain)      │
│  /api/v1/sync/pull  → Return server changes since last_sync_at   │
│  /api/v1/analytics  → Server-side aggregation (paid tier)        │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │  Supabase Platform  │
                 │                    │
                 │  PostgreSQL (data) │
                 │  Auth (JWT)        │
                 │  Row-Level Security│
                 │  Realtime (future) │
                 └────────────────────┘
```

## Offline-First Data Flow

```
User Action (e.g. sells 2 Coca Colas)
     │
     ▼
 SaleRepo.create()
     │
     ├──► INSERT into sales           (SQLite, < 5ms)
     ├──► INSERT into sale_items      (SQLite, < 5ms)
     ├──► UPDATE products.stock       (SQLite, < 5ms)
     ├──► INSERT into inventory_movements
     └──► INSERT into sync_queue     (payload = full JSON snapshot)
     │
     ▼
 UI updates instantly (Zustand store)
 No spinner. No waiting.
     │
     ▼ (when internet available)
 SyncEngine.run()
     │
     ├──► GET pending items from sync_queue (priority ORDER)
     ├──► POST /api/v1/sync/push (batch up to 3 concurrent)
     │       │
     │       ├─ 200 OK         → mark 'synced'
     │       ├─ 200 conflict   → ConflictResolver.resolve()
     │       └─ error          → mark 'failed', schedule retry
     │
     └──► GET /api/v1/sync/pull?since=last_sync_at
              └─ Apply server changes via ConflictResolver.applyServerChanges()
```

## Conflict Resolution

**Strategy: Last-write-wins (MVP)**

```
Client updated_at  vs  Server updated_at
        │                      │
   older (client)         newer (server)
        │                      │
   Server wins              Client wins
   Apply server version     Reject with conflict response
   to local DB              Client uses its own version
```

**Immutable entities (no conflict possible):**
- `sales` — append-only, never updated after creation
- `sale_items` — same

**Mutable with conflict risk:**
- `products` — price changes, stock levels
- `expenses` — edits possible

## Sync Queue Priority

Higher number = processed first during sync drain:

| Entity               | Priority |
|----------------------|----------|
| sales                | 10       |
| sale_items           | 9        |
| inventory_movements  | 8        |
| products             | 5        |
| expenses             | 3        |

Sales are always synced first — they're revenue data.

## Monetization Feature Gates

| Feature                          | Free | Paid (KSh 499/mo) | Premium (KSh 1,499/mo) |
|----------------------------------|------|-------------------|------------------------|
| POS (unlimited sales)            | ✅   | ✅                | ✅                     |
| Products (up to 50)              | ✅   | ✅                | ✅                     |
| Products (unlimited)             | ❌   | ✅                | ✅                     |
| Basic dashboard (today only)     | ✅   | ✅                | ✅                     |
| Weekly/Monthly reports           | ❌   | ✅                | ✅                     |
| Inventory insights               | ❌   | ✅                | ✅                     |
| Loss detection                   | ❌   | ❌                | ✅                     |
| Multi-store                      | ❌   | ❌                | ✅                     |
| Staff accounts                   | ❌   | ❌                | ✅                     |
| Data export (CSV)                | ❌   | ✅                | ✅                     |
| Expense tracking                 | ❌   | ✅                | ✅                     |

## Security

- **JWT** — HS256 signed, 60min access + 30-day refresh
- **bcrypt** — password hashing (cost=12)
- **Row-Level Security** — Supabase RLS prevents cross-tenant data access
- **HTTPS only** — enforced via Nginx/Caddy in production
- **SecureStore** — tokens stored in iOS Keychain / Android Keystore via expo-secure-store

## Deployment

**Backend:**
- Docker + Fly.io (zero-downtime deploys, auto-scaling)
- PostgreSQL via Supabase (managed, globally distributed)
- Redis via Upstash (serverless Redis for caching)

**Mobile:**
- EAS Build + Submit → Play Store + App Store
- OTA updates via Expo Updates (no store review for JS changes)

## Development Setup

```bash
# Backend
cd backend
cp .env.example .env
podman compose up -d
pip install -r requirements.txt
uvicorn app.main:app --reload

# Mobile
cd mobile
npm install
npx expo start

# Database (local)
podman compose exec db psql -U postgres biashara_os
```
