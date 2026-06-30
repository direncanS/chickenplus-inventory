# Rule: RPC Functions
## When: Multi-step atomic operations
## Do:
- Use RPC for: bootstrap_admin, create_checklist_with_snapshot, create_order_with_retry, update_order_delivery
- Name convention: `rpc_function_name`
- Handle errors within function, return structured result
- Define in `supabase/migrations/`
- Call via `supabase.rpc('function_name', params)` in Server Actions
## Don't:
- Don't use RPC for simple single-table operations
- Don't skip error handling in PostgreSQL functions
- Don't assume Supabase JS auto-wraps in transactions
## Why: Atomic multi-step operations need PostgreSQL transactions.
