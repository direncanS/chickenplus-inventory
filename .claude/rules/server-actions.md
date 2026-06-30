# Rule: Server Actions
## When: Writing any Server Action
## Do:
- Always start with `'use server'` directive
- Auth check: `supabase.auth.getUser()` → verify user exists
- Profile check: `is_active = true` for all mutations
- Zod `.parse()` for all input validation
- Return `{ success, data }` or `{ error, fieldErrors? }`
- Audit log via admin client (service role) for important events
- Use `revalidatePath()` only for structural changes (create/complete/reopen, CRUD)
## Don't:
- No `revalidatePath()` in auto-save (checklist item update)
- No raw Supabase rows to client — narrow response
- No `missing_amount_calculated` from client input — server computes it
- No mutation via browser Supabase client — all via Server Actions
## Why: Single enforcement point for business rules, RLS as second defense.
