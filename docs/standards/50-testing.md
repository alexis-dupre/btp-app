# Testing standard

## Stack

Vitest (unit + integration), Playwright (E2E + accessibility via axe), Testcontainers or a
Docker Compose Postgres for integration. No mocking of the ORM — mocked SQL proves nothing.

## Layers and what belongs in each

| Layer | Scope | Speed | Runs on |
|---|---|---|---|
| Unit | `lib/domain/**` pure rules | ms | every save |
| Integration | `lib/db/**`, server actions, against real Postgres | seconds | every push |
| E2E | five critical flows + one offline scenario | minutes | every PR |
| A11y | axe on every page object | seconds | every PR |

## Mandatory tests

1. **Tenant isolation, per tenant-scoped resource**: org A requests org B's id → 404.
2. **Money boundaries**, per computation: zero, rounding at `.005`, maximum, negative,
   mixed VAT rates, `avenant` after a partial `situation`.
3. **Regression test per bug**, written before the fix, failing for the right reason.
4. **State machine transitions**: every allowed transition, and a rejection test for the
   forbidden ones (an issued `facture` cannot be edited).

## Rules

- Deterministic or deleted. Fixed clock, seeded data, no `Math.random`, no `sleep`, no
  retries to mask flakiness. A test that flakes is fixed the same day.
- Test behaviour, not implementation. If a refactor with identical behaviour breaks a test,
  the test was wrong.
- Playwright selects by role and accessible name, never by CSS class. The suite then doubles
  as an accessibility check.
- Fixtures are factory functions producing realistic French data: valid SIRET, TVA number,
  lot names, `numéro de devis` formats.
- Coverage is diagnostic, not a target. Report untested *behaviours*, not a percentage.

## The commands

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings=0",
  "test:unit": "vitest run --dir lib/domain",
  "test:integration": "vitest run --dir lib/db --config vitest.integration.ts",
  "test:e2e": "playwright test",
  "test:a11y": "playwright test --grep @a11y",
  "verify:fast": "pnpm typecheck && pnpm lint && pnpm test:unit",
  "verify": "pnpm verify:fast && pnpm build && pnpm test:integration && pnpm test:e2e && pnpm test:a11y"
}
```

`verify:fast` is what the `Stop` hook runs. `verify` is what CI runs. They must never diverge.
