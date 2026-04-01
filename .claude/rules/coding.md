# Rule: Coding Standards
## When: Writing any TypeScript code
## Do:
- TypeScript strict mode, no `any`
- kebab-case files, PascalCase components, camelCase functions
- Import order: react → next → external → @/ internal → relative
- Use `logger` utility for all logging (INFO/ERROR/DEBUG)
- Prefer `const` over `let`, never use `var`
- Use named exports (not default) for utilities and actions
## Don't:
- No `console.log` in production code — use logger
- No `dangerouslySetInnerHTML`
- No `any` type — use `unknown` and narrow
- No unused variables or imports
## Why: Consistent, safe, maintainable codebase.
