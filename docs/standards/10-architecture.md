# Architecture baseline

This is the default. It is not sacred, but changing it requires an ADR that says what the
alternative buys and what it costs.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.3.4 App Router, RSC, TypeScript strict, no `src/` | scaffolded by the shadcn `next` template |
| UI | shadcn/ui, **Base UI** primitives, Tailwind v4, lucide, Manrope | imposed constraint; **`app/globals.css` is the source of truth for every token** — not a preset code. See ADR-0001 |
| Forms | React Hook Form + Zod | one schema, client and server |
| Database | PostgreSQL 16 | correctness, `numeric`, RLS, real constraints |
| ORM | Drizzle | typed SQL, explicit migrations, no hidden queries |
| Auth | session-based, server-side revocable | tenancy depends on it; no client-held authority |
| Files | S3-compatible object storage + signed URLs | site photos are the bulk of the data |
| Jobs | a durable queue (Inngest / Trigger.dev / pg-boss) | PDF, e-invoicing, imports, photo processing |
| Observability | structured logs + error tracking + APM | see `80-observability-ops.md` |

## Shape

```
app/            route segments, server components, server actions
  (auth)/       unauthenticated
  (app)/        authenticated shell: sidebar, org context
components/
  ui/           REGISTRY-OWNED — never hand-edited
  <feature>/    wrappers and feature components
lib/
  auth/         session, authorize()
  db/           schema, queries (the only place SQL lives)
  domain/       pure business rules — no I/O, fully unit-tested
  validation/   Zod schemas shared client/server
jobs/           queue handlers
docs/           standards, ADRs, domain rules
```

## Boundaries that must hold

1. **`lib/domain/` is pure.** No database, no network, no `Date.now()`. Every French BTP
   computation lives here and is tested exhaustively. This is the part that must still be
   correct in ten years.
2. **`lib/db/` is the only place SQL exists.** No query in a component, no ORM call in `app/`.
3. **Tenancy is a type.** A query function cannot be called without an `OrgScope`; make that
   a compile error, not a convention.
4. **Server actions are thin**: authenticate → authorise → validate → call domain/db →
   revalidate. Business logic does not live in `app/`.

## Decisions to make before the first line of feature code

Record each as an ADR:

1. **Offline.** Which flows must work with no network? Read-only cache, or queued writes with
   conflict resolution? This changes the entire client architecture — decide it first.
2. **Multi-tenancy.** Shared schema with `org_id` + RLS (default) versus schema-per-tenant.
3. **Document generation.** Server-side PDF for devis, situations and factures: which engine,
   and how output is made reproducible and archivable for ten years.
4. **E-invoicing.** Which `plateforme agréée` (ex-PDP) and which structured format
   (Factur-X / UBL / CII). Reception is already mandatory; issuance follows. See
   `docs/domain/btp-rules.md`.
5. **Hosting and data residency.** EU region, backups in the EU, subcontractor list for the
   RGPD register.
