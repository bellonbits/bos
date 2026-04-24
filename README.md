# Biashara OS — SME Business Operating System

**Kenya's offline-first business management platform for retail shops, dukas, and small businesses.**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native/Expo)            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │   POS    │  │Inventory │  │ Reports  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐  │
│  │           Zustand Stores (in-memory state)             │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │           SQLite Local Database (expo-sqlite)           │  │
│  │  products | sales | sale_items | inventory_movements   │  │
│  │  expenses | sync_queue | app_settings | schema_meta    │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │              Sync Engine (Outbox Pattern)               │  │
│  │  NetworkMonitor → SyncEngine → ConflictResolver        │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ REST API (when online)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                           │
│                                                             │
│  /auth   /businesses   /products   /sales                   │
│  /sync/push   /sync/pull   /analytics   /expenses           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Supabase PostgreSQL                     │    │
│  │  users | businesses | products | sales | sale_items  │    │
│  │  inventory_movements | expenses                      │    │
│  │  + Row Level Security (RLS)                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
BOS/
├── mobile/                     # React Native Expo app
│   ├── app/
│   │   ├── _layout.tsx         # Root layout (boots DB + SyncEngine)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── setup-business.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx     # Tab navigator
│   │       ├── index.tsx       # Dashboard
│   │       ├── pos.tsx         # Point of Sale
│   │       ├── inventory.tsx   # Inventory management
│   │       └── reports.tsx     # Analytics & reports
│   └── src/
│       ├── db/
│       │   ├── schema.ts       # Full SQLite schema (8 tables)
│       │   ├── database.ts     # DB init + migration runner
│       │   └── repositories/
│       │       ├── ProductRepo.ts
│       │       ├── SaleRepo.ts
│       │       └── SyncQueueRepo.ts
│       ├── sync/
│       │   ├── SyncEngine.ts   # Outbox pattern sync orchestrator
│       │   ├── NetworkMonitor.ts
│       │   └── ConflictResolver.ts  # Last-write-wins
│       ├── stores/
│       │   ├── authStore.ts    # Auth + business state
│       │   ├── posStore.ts     # Cart management
│       │   └── dashboardStore.ts
│       ├── services/
│       │   └── api.ts          # Axios client + JWT refresh
│       ├── constants/
│       │   └── theme.ts        # Design tokens
│       └── utils/
│           └── helpers.ts      # formatKES, generateInsights, etc.
│
├── backend/                    # FastAPI backend
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/             # SQLAlchemy ORM models
│       ├── routers/            # FastAPI route handlers
│       ├── schemas/            # Pydantic request/response schemas
│       ├── services/           # Business logic
│       └── middleware/
│           └── auth.py         # JWT verification
│
└── supabase/
    └── migrations/
        └── 001_initial.sql     # Full PostgreSQL schema + RLS policies
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free tier works)

### 1. Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Add babel plugin for path aliases
npm install -D babel-plugin-module-resolver

# Copy environment file
cp .env.example .env
# Edit .env with your API URL

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials and secret key

# Run development server
uvicorn app.main:app --reload --port 8000

# API docs available at:
# http://localhost:8000/docs
```

### 3. Supabase Setup

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
# or manually run: supabase/migrations/001_initial.sql
```

---

## 🔄 How Offline Sync Works

```
1. USER TAPS "CHECKOUT"
        ↓
2. Cart items validated in memory (< 1ms)
        ↓
3. SQLite TRANSACTION (atomic, < 50ms):
   - Insert sale record
   - Insert sale_items
   - Deduct stock from products
   - Record inventory_movements
   - Enqueue in sync_queue (status=pending, priority=10)
        ↓
4. UI updates INSTANTLY (no network wait)
        ↓
5. BACKGROUND (when internet available):
   - NetworkMonitor detects connectivity
   - SyncEngine drains sync_queue in priority order
   - POST /api/v1/sync/push with payload
   - On success → sync_status = 'synced'
   - On failure → retry with exponential backoff (5s, 10s, 20s...)
        ↓
6. PULL (after push):
   - GET /api/v1/sync/pull?since={last_sync_at}
   - Server returns changes since last sync
   - ConflictResolver applies server changes (last-write-wins)
   - Update last_sync_at setting
```

---

## 💡 Business Insights Engine

The dashboard generates natural language insights using `generateInsights()` in `helpers.ts`:

```
"You made KSh 3,200 today."
"Estimated profit: KSh 1,150 (35.9% margin)."
"Coca Cola 500ml is your top seller — 42% of revenue."
"Most customers are paying via M-Pesa today."
"Busy day! 23 transactions so far."
```

These are computed **100% locally** from SQLite — no internet required.

---

## 🔐 Security

- **JWT Authentication**: Access tokens (60 min) + refresh tokens (30 days)
- **Tokens stored in Expo SecureStore** (encrypted keychain on iOS/Android)
- **Supabase RLS**: Row-Level Security ensures multi-tenant data isolation
- **Service role key** used only by FastAPI backend (never exposed to mobile)
- **bcrypt** password hashing

---

## 💰 Monetization Tiers

| Feature | Free | Pro (KSh 499/mo) | Premium (KSh 999/mo) |
|---------|------|-------------------|----------------------|
| POS | ✅ | ✅ | ✅ |
| Products | Up to 50 | Unlimited | Unlimited |
| Daily Reports | ✅ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced |
| Multi-store | ❌ | ❌ | ✅ (up to 5) |
| Staff accounts | ❌ | ❌ | ✅ |
| Expense tracking | ❌ | ✅ | ✅ |
| Data export | ❌ | ✅ | ✅ |

---

## 🐳 Docker (Backend)

```bash
cd BOS

# Start everything (backend + PostgreSQL)
docker compose up -d

# Backend available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

## 📱 Building for Production

### Android (APK/AAB)

```bash
cd mobile
npx eas build --platform android --profile production
```

### iOS (IPA)

```bash
cd mobile
npx eas build --platform ios --profile production
```

### Backend (Cloud Run / Railway)

```bash
cd backend
# Build Docker image
docker build -t biashara-os-api .

# Deploy to your cloud provider
# Environment variables must be set in your deployment config
```

---

## 🔑 Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Local DB | expo-sqlite | Simpler setup than WatermelonDB, sufficient for MVP |
| Sync pattern | Outbox (sync_queue table) | Reliable, survives app crashes |
| Conflict resolution | Last-write-wins (updated_at) | Simple, correct for single-owner shops |
| Auth | Custom JWT + bcrypt | Full control over token flow |
| State management | Zustand | Minimal boilerplate, fast |
| Timestamps | Unix milliseconds (BIGINT) | Cross-platform consistent, no timezone bugs |
| UUIDs | Client-generated (uuid v4) | Safe offline ID creation without server coordination |
# bos
