# Skill: Server Action Pattern
## Trigger: Writing a new Server Action
## Steps:
1. Add `'use server'` directive at top of file
2. Create Supabase server client: `const supabase = await createServerClient()`
3. Auth check: `const { data: { user } } = await supabase.auth.getUser()`
4. Return `{ error: 'Nicht angemeldet' }` if no user
5. Profile active check: query profiles where id=user.id and is_active=true
6. Zod validate input: `const validated = schema.parse(input)`
7. Perform DB operation with supabase client
8. Write audit log with admin client if needed
9. `revalidatePath()` for structural changes only
10. Return narrowed response: `{ success: true, data: {...} }`
## Verification:
- [ ] Auth check present
- [ ] is_active check present
- [ ] Zod validation present
- [ ] Error handling with try/catch
- [ ] Structured error response (German messages)
- [ ] No raw DB rows in response
## Common Mistakes:
- Forgetting is_active check
- Using revalidatePath in auto-save
- Returning full Supabase row objects
