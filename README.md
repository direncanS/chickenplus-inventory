# Chickenplus Inventory Management

A full-stack weekly inventory control and order management system built for a restaurant chain. Staff members create weekly checklists, record stock levels, flag missing products, and track supplier-based order workflows. When a checklist is completed, draft orders are automatically generated based on preferred suppliers; remaining items can be processed per supplier in the Orders view.

## Features

- **Weekly Checklists** -- Create, fill, and complete inventory checklists with free-text stock entries and missing-product flags
- **Automatic Order Generation** -- Draft orders are created in the background based on preferred supplier mappings
- **Supplier Management** -- Admin-only CRUD for suppliers and product-supplier assignments
- **Order Tracking** -- Review, edit, and finalize supplier-based orders; track delivery status
- **Reports & Analytics** -- KPI cards, stock trend charts, order summaries, and supplier performance metrics
- **Excel Export** -- Download completed checklists as formatted `.xlsx` files
- **Role-Based Access** -- Admin and Staff roles enforced via Supabase RLS policies
- **Archive** -- Browse and review past checklists with read-only detail views

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Database | Supabase (PostgreSQL + Auth + Row Level Security) |
| UI | shadcn/ui v4 (Base UI) + Tailwind CSS v4 |
| Validation | Zod v4 |
| Testing | Vitest (110+ unit & integration tests) |
| Export | ExcelJS |
| Language | German (de-AT) UI, Europe/Vienna timezone |

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (local Docker or hosted)

### Environment Setup

```bash
cp .env.example .env.local
```

Configure `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

**Local (requires Docker):**
```bash
npx supabase start
npx supabase db push
npx supabase db seed
```

**Remote:**
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### Run the Application

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There is no in-app signup; create test users via Supabase Auth. The first user to log in can bootstrap as admin through the `/setup` page.

## Scripts

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run all tests (Vitest)
```

## Project Structure

```
src/
  app/(app)/         # Authenticated routes (dashboard, checklist, orders, suppliers, archive, reports)
  components/        # UI components (shadcn + domain-specific)
  lib/               # Utilities, Supabase clients, validations, constants
  i18n/de.ts         # German translations
  types/             # TypeScript type definitions
supabase/
  migrations/        # Database migrations
  seed.sql           # Seed data
tests/               # Unit & integration tests
docs/                # Architecture, API spec, business rules, deployment guide
```

## Documentation

- [Blueprint](docs/blueprint.md) -- Architecture, data model, and feature roadmap
- [API Spec](docs/api-spec.md) -- Server Actions, RPC functions, and API routes
- [Business Rules](docs/business-rules.md) -- Authorization, calculations, and validation rules
- [Deployment](docs/deployment.md) -- Production deployment guide

## License

This project is proprietary software for Chickenplus restaurant operations.
