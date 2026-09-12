# ADR-0001 — Stack baseline and the shadcn constraint

- **Status:** accepted
- **Date:** 2026-09-12
- **Impacts:** every standard

## Context

We are building a multi-tenant SaaS for French construction companies. One constraint was
fixed before any other decision: the interface is the shadcn design system initialised with
preset `b4qO` on the `next` template. That fixes the framework family (Next.js App Router),
the styling system (Tailwind + CSS variable tokens) and the component source (the shadcn
registry).

## Decision

- Next.js App Router + React + TypeScript in `strict` mode.
- shadcn/ui with preset `b4qO`; `components/ui/**` is registry-owned and never hand-edited.
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
