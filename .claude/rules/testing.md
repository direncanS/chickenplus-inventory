# Rule: Testing
## When: Completing any feature or contract
## Do:
- Write tests alongside code, not after
- Unit tests: Vitest for calculations, validations, date utils
- Integration tests: Vitest + Supabase local for DB operations
- Test commands: `npm run test`, `npm run test:unit`, `npm run test:integration`
- Completion requires all verification steps passing
## Don't:
- Never claim completion based on code changes alone
- Never skip edge cases (null, 0, negative, boundary values)
- Never mock what you can test with Supabase local
## Why: Tests are the proof that features work correctly.
