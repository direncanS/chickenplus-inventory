# Chickenplus Bestandskontrolle

Restoran zinciri icin haftalik envanter kontrol ve siparis yonetim sistemi. Personel haftalik kontrol listeleri olusturur, mevcut stoklari girer, eksik miktarlar otomatik hesaplanir ve tedarikcilere siparis onerileri uretilir.

## Tech Stack

- **Next.js 16.2.1** App Router (React 19, Turbopack)
- **Supabase** PostgreSQL + Auth + RLS
- **shadcn/ui v4** (Base UI / @base-ui/react) + Tailwind CSS v4
- **Zod v4** validation, **ExcelJS** export, **Vitest** testing
- **Dil:** Almanca (de-AT), **Timezone:** Europe/Vienna, ISO hafta

## Local Setup

### 1. Environment

```bash
cp .env.example .env.local
```

`.env.local` dosyasini Supabase project bilgileriyle doldurun:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Supabase

**Local (Docker gerekli):**
```bash
npx supabase start
npx supabase db push
npx supabase db seed
```

**Remote:**
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
# Seed data: Supabase Dashboard SQL Editor uzerinden seed.sql calistirilabilir
```

### 3. Uygulama

```bash
npm install
npm run dev
```

Tarayicida [http://localhost:3000](http://localhost:3000) aciniz. Ilk kullanici kaydolur ve `/setup` sayfasindan admin olarak bootstrap edilir.

## Komutlar

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run type-check   # TypeScript kontrol
npm run test         # Vitest (tum testler)
```

## Proje Yapisi

```
src/app/(app)/       # Authenticated routes (dashboard, checklist, orders, suppliers, archive)
src/components/      # UI components (shadcn + domain-specific)
src/lib/             # Utilities, Supabase clients, validations, constants
src/i18n/de.ts       # Almanca ceviriler
src/types/           # TypeScript type definitions
supabase/            # Migrations + seed data
tests/               # Unit + integration tests
```

## Dokumantasyon

- [Blueprint](docs/blueprint.md) - Mimari, veri modeli, feature haritasi
- [API Spec](docs/api-spec.md) - Server Actions, RPC, API routes
- [Business Rules](docs/business-rules.md) - Is kurallari, yetki, hesaplamalar
- [Progress](docs/PROGRESS.md) - Gelistirme ilerlemesi
