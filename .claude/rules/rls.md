# Rule: Row Level Security
## When: Adding or modifying RLS policies
## Do:
- RLS enabled on ALL tables, no exceptions
- Use `get_user_role()` helper for role checks (STABLE, avoids recursive deps)
- Keep RLS simple — complex logic in Server Actions
- admin.ts (service role) only for audit_log writes
- Test policies after changes
## Don't:
- Don't bypass RLS unnecessarily with service role
- Don't create recursive policy dependencies
- Don't use SECURITY DEFINER without careful review
## Why: RLS is the second defense line; Server Actions are primary.
