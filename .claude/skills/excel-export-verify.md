# Skill: Excel Export Verify
## Trigger: After implementing or modifying Excel export
## Steps:
1. Download exported file
2. Verify storage location order matches seed data sort_order
3. Verify category headers and product order within each location
4. Verify week/date uses Europe/Vienna timezone
5. Verify German characters (ü, ö, ä, ß) are not corrupted
6. Verify formula injection protection (=, +, -, @ prefixed with ')
7. Verify filename: `Bestandskontrolle_KW{iso_week}_{iso_year}.xlsx`
## Verification:
- [ ] Storage locations in correct order
- [ ] Categories and products sorted correctly
- [ ] Dates in Europe/Vienna
- [ ] German characters intact
- [ ] Formula injection protected
- [ ] Correct filename format
## Common Mistakes:
- Not escaping formula-triggering characters
- Wrong timezone for date headers
- Missing German umlauts in encoding
