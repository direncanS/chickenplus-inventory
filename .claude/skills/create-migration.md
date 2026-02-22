# Skill: Create Migration
## Trigger: Adding tables, columns, indexes, or RLS policies
## Steps:
1. Name file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write DDL statements (CREATE TABLE, ALTER, etc.)
3. Add `updated_at` trigger for new tables
4. Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
5. Add RLS policies (SELECT, INSERT, UPDATE as needed)
6. Update seed.sql if reference data changes
7. Run `supabase gen types typescript` to update types
## Verification:
- [ ] All timestamps use `timestamptz`
- [ ] RLS enabled on new tables
- [ ] updated_at trigger added
- [ ] Backward-compatible with existing code
- [ ] Types regenerated
## Common Mistakes:
- Using `timestamp` instead of `timestamptz`
- Forgetting RLS on new tables
- Breaking existing queries with column renames
