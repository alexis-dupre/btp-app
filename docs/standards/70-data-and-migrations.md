# Data and migrations standard

## Types

| Concept | Type | Note |
|---|---|---|
| Money | `numeric(14,2)` | never float; integer cents if arithmetic is heavy |
| Rate / percentage | `numeric(6,4)` | stored as a decimal, e.g. `0.2000` |
| VAT rate on a line | `numeric(6,4)` | stored **on the line**, as applied at the time |
| Instant | `timestamptz` | stored UTC, rendered `Europe/Paris` |
| Business date | `date` | invoice date, due date — must not shift with timezone |
| Identifier | `uuid` (v7 preferred) | sortable, no enumeration |
| Status | Postgres enum or check constraint | never free text |
| Tenant | `org_id uuid NOT NULL` + FK | on every tenant-scoped table |

## Invariants

- Issued documents are immutable. A `facture` is never updated; issue an `avoir`. Model it.
- Every financial row keeps the values as applied at the time (price, VAT rate, index),
  never a join to today's reference data.
- Every write to a financial or contractual entity produces an audit row: actor, action,
  before/after, timestamp, org.
- Every foreign key declares an explicit `ON DELETE` policy.
- Soft delete only where the business needs it, with a partial unique index excluding
  deleted rows.

## Migration process

1. `pnpm db:generate` produces the SQL. A human reads it.
2. Header comment states: intent, locks taken, expected duration on 10 M rows, rollback plan.
3. `pnpm db:migrate` applies it. **`drizzle-kit push` is banned** outside a throwaway local
   database — a `PreToolUse` hook blocks it.
4. Applied migration files are immutable. Fix forward with a new migration; a hook blocks
   edits to existing migration files.

## Expand / migrate / contract

Never rename or drop in the release that stops using a column.

1. **Expand** — add the new column or table, nullable, write to both.
2. **Migrate** — backfill in batches (≤ 10 k rows per batch, throttled), switch reads.
3. **Contract** — in a later release, drop the old column.

Every migration must be backward compatible with the version currently running in production,
because both run simultaneously during a deploy.

## Large operations

- `CREATE INDEX CONCURRENTLY` on any table above ~100 k rows.
- Backfills above ~100 k rows are background jobs, not migration statements.
- Adding a `NOT NULL` column: add nullable + default, backfill, then set `NOT NULL`.

## Backups

Daily automated backup, point-in-time recovery, EU region. A restore drill is performed and
dated every quarter in `80-observability-ops.md`. An untested backup does not exist.
