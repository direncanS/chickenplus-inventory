# Skill: Checklist Item Auto-save
## Trigger: Modifying auto-save behavior
## Steps:
1. Debounce: 800ms delay after last keystroke
2. onBlur: immediate save when user leaves field
3. Stale write protection: cancel old in-flight requests for same row
4. Double-submit prevention: skip if value equals pending/last-saved value
5. No revalidatePath() — return narrow response, update local state
6. Toast on failure (sonner)
## Verification:
- [ ] Debounce works at 800ms
- [ ] onBlur triggers save
- [ ] Old requests don't overwrite newer saves
- [ ] Same-value saves are skipped
- [ ] Failure shows German error toast
## Common Mistakes:
- Using revalidatePath in auto-save (causes UI jitter)
- Not canceling stale requests
- Sending missing_amount_calculated from client
