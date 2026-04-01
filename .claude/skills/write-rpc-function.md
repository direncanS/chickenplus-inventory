# Skill: Write RPC Function
## Trigger: Need atomic multi-step database operation
## Steps:
1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_rpc_function_name.sql`
2. Write PostgreSQL function with `RETURNS jsonb`
3. Use `BEGIN ... EXCEPTION ... END` for error handling
4. Use `RAISE EXCEPTION` for business rule violations
5. Add to Server Action: `supabase.rpc('function_name', params)`
6. Handle RPC errors in Server Action catch block
## Verification:
- [ ] Function is SECURITY INVOKER (uses caller's RLS context)
- [ ] Error messages are structured
- [ ] Transaction rollback on failure
- [ ] Server Action properly handles RPC response
## Common Mistakes:
- Using SECURITY DEFINER when INVOKER suffices
- Not handling UNIQUE constraint conflicts
- Forgetting to return result from function
