# Chickenplus Inventory

> Full-stack inventory management and supplier ordering platform for restaurant operations, replacing manual stock-control workflows with a structured digital system.

Built with **Next.js 16** | **React 19** | **TypeScript** | **Supabase** | **PostgreSQL**

---

## Overview

Chickenplus Inventory is an internal operations platform designed for a restaurant chain. It digitizes weekly stock control, automates supplier order generation, and provides operational reporting — all behind a role-based access model.

The system manages the full lifecycle: staff complete weekly inventory checklists, flag missing items, generate supplier-grouped draft orders, track deliveries, and review historical data through reports and Excel exports.

## Features

### Inventory Control
- Weekly checklists with per-item stock entry, check-off tracking, and missing-item flags
- Batched optimistic autosave for responsive editing without network lag
- Progress tracking with real-time completion percentage on the dashboard

### Order Management
- Automatic draft order generation grouped by supplier based on missing items
- Order lifecycle tracking: `Draft` → `Ordered` → `Partially Delivered` → `Delivered`
- Recurring routine orders with weekly scheduling
- Duplicate-order prevention (items in open orders are excluded from suggestions)
- Transactional order finalization to prevent half-written states

### Reporting & Analytics
- KPI dashboard with checklist completion rates and order volume
- Stock trend visualization and order summary charts (Recharts)
- Supplier performance analysis and top missing products breakdown
- Configurable time period filtering (4 weeks / 1 month / 3 months)

### Operations
- Excel export with formula-injection protection
- Checklist archive with historical review
- Supplier and product-supplier mapping management
- Admin/Staff role model enforced via Supabase Row Level Security

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict mode) |
| UI | React 19, shadcn/ui v4 (Base UI), Tailwind CSS 4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth with RLS policies |
| Charts | Recharts 3 |
| Validation | Zod 4 |
| Export | ExcelJS |
| Testing | Vitest, Testing Library, jsdom |
| Linting | ESLint 9, TypeScript type-checking |

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Client UI                    │
│         React 19 · shadcn/ui · Recharts      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Next.js App Router                   │
│    Server Components · Server Actions        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│       Supabase Backend                       │
│  SQL RPC Functions · Row Level Security      │
│  Auth · PostgreSQL · Migrations              │
└─────────────────────────────────────────────┘
```

**Design Principles:**

- **Server-first rendering** — data loading and auth boundaries handled on the server
- **Transactional database operations** — critical workflows use SQL RPC functions to ensure atomicity
- **Optimistic UI** — batched autosave for checklist editing reduces network overhead
- **Security at every layer** — RLS policies enforce access control at the database level, not just the UI

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes
│   │   ├── dashboard/      # Overview with KPIs and weekly status
│   │   ├── checklist/      # Weekly inventory checklist
│   │   ├── orders/         # Order management & routine orders
│   │   ├── suppliers/      # Supplier & product mapping
│   │   ├── reports/        # Analytics & reporting
│   │   ├── archive/        # Historical checklist review
│   │   └── settings/       # User settings
│   ├── (auth)/             # Login, setup, deactivated flows
│   └── api/export/         # Excel export endpoint
├── components/
│   ├── checklist/          # Checklist UI components
│   ├── orders/             # Order list & management
│   ├── reports/            # Charts, KPIs, data tables
│   ├── routine-orders/     # Recurring order management
│   ├── suppliers/          # Supplier forms & mapping
│   ├── layout/             # Navigation, sidebar, header
│   └── ui/                 # shadcn/ui component library
├── lib/
│   ├── supabase/           # Client, server, middleware, auth helpers
│   ├── utils/              # Business logic (calculations, batching, dates, export)
│   ├── validations/        # Zod schemas
│   ├── server/             # Server-only logic (order suggestions)
│   └── constants/          # App-wide constants
├── i18n/                   # German localization
└── types/                  # TypeScript type definitions

supabase/
├── migrations/             # 18 incremental PostgreSQL migrations
└── seed.sql                # Development seed data

tests/
├── unit/                   # 20 unit test suites
└── integration/            # 4 integration test suites
```

## Engineering Highlights

### Transactional Order Finalization
Order creation and checklist state capture execute within a single database transaction via SQL RPC functions, preventing inconsistent states where an order exists but the checklist doesn't reflect it.

### Batched Optimistic Autosave
Checklist editing uses debounced batch updates instead of per-row saves. Changes are collected and flushed in a single RPC call, providing instant UI feedback while minimizing database round-trips.

### Operational Reporting Model
All reports are anchored to `checklist_date` (the business week) rather than raw database timestamps, ensuring metrics reflect actual operational periods.

### Duplicate Order Prevention
The order suggestion engine cross-references open orders before generating drafts, preventing accidental re-ordering of items already in the pipeline.

### Excel Export Hardening
The export pipeline sanitizes cell content against formula injection attacks (`=`, `+`, `-`, `@` prefixes), producing safe spreadsheets for downstream use.

## Testing

```bash
npm run test          # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch    # Watch mode
```

**24 test suites** covering business logic, data transformations, server actions, component rendering, and integration flows.

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase project (local or hosted)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

### Build & Verify

```bash
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript strict check
npm run test         # Test suite
```

## Documentation

Detailed documentation is available in [`/docs`](./docs):

| Document | Description |
|---|---|
| [Business Rules](./docs/business-rules.md) | Functional workflows, product logic, and operational constraints |
| [API Specification](./docs/api-spec.md) | Server Actions, SQL RPC contracts, and data flow |
| [Blueprint](./docs/blueprint.md) | Architectural decisions and system design |
| [Deployment](./docs/deployment.md) | Environment configuration and release process |

## License

Private — internal use only.
