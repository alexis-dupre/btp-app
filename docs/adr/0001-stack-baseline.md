# ADR-0001 — Stack baseline and the shadcn constraint

- **Status:** accepted
- **Date:** 2026-09-12
- **Impacts:** every standard

## Context

We are building a multi-tenant SaaS for French construction companies. One constraint was
fixed before any other decision: the interface is the shadcn design system initialised on the
`next` template. That fixes the framework family (Next.js App Router), the styling system
(Tailwind + CSS variable tokens) and the component source (the shadcn registry).

**Amended 2026-09-13.** This ADR and `10-architecture.md` both named preset `b4qO` as the
constraint, while the project reports `b4nI`. Both are true and neither is the source of
truth: `b4qO` is the code that was passed to the CLI, `b4nI` is what the project resolved to,
and the two produce identical tokens — verified by re-running `shadcn apply --preset b4qO`,
which changed only the ordering of lines in `app/globals.css`. A preset code is opaque
transport; the shadcn CLI reference forbids decoding one by hand, so a code written into a
document is a value nobody can verify by reading it. Naming a code as the constraint was the
defect. The tokens are the constraint.

## Decision

- Next.js App Router + React + TypeScript in `strict` mode.
- shadcn/ui. **The source of truth for every design token is `app/globals.css`**, the file the
  preset wrote. `components/ui/**` is registry-owned and never hand-edited.
- A preset code is recorded as history, never as the constraint: `b4qO` was passed to the CLI,
  `b4nI` is what the project resolved to. When the two disagree, `app/globals.css` settles it
  and the documents are corrected — the value in the file is never edited to match a document.
- PostgreSQL with Drizzle: explicit migrations and real constraints, because the data is
  financial and must still be correct in ten years.
- Business rules live in a pure `lib/domain/` module with no I/O, exhaustively unit-tested.
- Tenancy is enforced twice: in a typed data-access layer that cannot be called without an
  org scope, and in the database with row-level security.

## Consequences

- Design debates are settled by the preset. Any visual need that the tokens cannot express is
  a design problem, not a licence for custom CSS.
- Choosing Drizzle over a heavier ORM means more explicit SQL and fewer surprise queries; the
  cost is more hand-written query code.
- Putting the domain rules in a pure module makes them portable if the framework changes, and
  makes the French regulatory logic testable without a database.
- We accept that a shadcn preset change is a visual migration, executed with
  `shadcn init --preset` and reviewed as a whole, never patched by hand.
- Any future drift between a preset code in a document and the running project is a
  documentation bug, fixed in the document. `design-system-guardian` arbitrates from
  `app/globals.css` and needs no preset code to do its job.
