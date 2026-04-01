# Rule: Database Migrations
## When: Creating or modifying database schema
## Do:
- File naming: `YYYYMMDDHHMMSS_description.sql` in `supabase/migrations/`
- All tables need `updated_at` trigger
- RLS enabled on all tables
- Use `timestamptz` for all timestamps
- Backward-compatible changes (two-step for breaking changes)
- Run `supabase gen types typescript` after schema changes
## Don't:
- Never run seed.sql in production routine deploys
- Never drop columns without first removing code references
- Never create migrations that break existing code
## Why: Safe, reversible schema evolution.
