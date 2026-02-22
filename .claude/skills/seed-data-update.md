# Skill: Seed Data Update
## Trigger: Changing products, locations, or categories
## Steps:
1. Update `supabase/seed.sql` with new/modified data
2. Maintain UNIQUE constraints (code, name combos)
3. Keep sort_order consistent
4. Range min stock: "3-4" → min_stock=3, min_stock_max=4
5. Verify migration compatibility
6. Test with `supabase db reset`
## Verification:
- [ ] Uniqueness constraints respected
- [ ] Sort orders sequential
- [ ] min_stock/min_stock_max correct for ranges
- [ ] Total product count matches expectation (126)
## Common Mistakes:
- Duplicate names within same location+category
- Wrong unit_type enum values
- Forgetting to update sort_order
