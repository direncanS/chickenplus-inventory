# Skill: RLS Policy Review
## Trigger: After adding or modifying RLS policies
## Steps:
1. List all policies on the affected table
2. Verify SELECT policies allow authenticated users
3. Verify INSERT/UPDATE policies match blueprint Section 3 RLS table
4. Check that get_user_role() helper is used correctly
5. Ensure no recursive policy dependencies
6. Test with both admin and staff roles mentally
## Verification:
- [ ] No overly permissive policies
- [ ] Role checks use get_user_role() helper
- [ ] No SECURITY DEFINER abuse
- [ ] Policies don't conflict with each other
## Common Mistakes:
- Creating policies that reference the same table (recursive)
- Forgetting to handle the admin override case
- Using auth.uid() directly instead of helper for role checks
