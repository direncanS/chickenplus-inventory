# Chickenplus Bestandskontrolle

## Quick Reference
- Blueprint: docs/blueprint.md (mimari, veri modeli, feature haritasi)
- API Spec: docs/api-spec.md (Server Actions, RPC, API routes)
- Business Rules: docs/business-rules.md (is kurallari, yetki, hesaplamalar)
- Progress: docs/PROGRESS.md (gelistirme ilerlemesi)

## Rules (always loaded)
See .claude/rules/*.md

## Skills (on-demand recipes)
See .claude/skills/*.md

## Key Paths
- Server Actions: src/app/(app)/*/actions.ts
- RPC functions: supabase/migrations/
- Supabase clients: src/lib/supabase/{client,server,admin}.ts
- Validations: src/lib/validations/
- Types: src/types/
- Tests: tests/{unit,integration,e2e}/

## Stack
Next.js 16.2.1 App Router, Supabase PostgreSQL, shadcn/ui, Tailwind, Vitest, Playwright
German UI (src/i18n/de.ts), Europe/Vienna timezone, ISO week
