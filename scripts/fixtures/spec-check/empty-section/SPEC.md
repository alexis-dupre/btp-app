---
id: SPEC-fixture-passing
---

# Fixture: a complete spec

## Why

A fixture needs a reason to exist, so this one states it.

## Capabilities

- **CAP-1**
  - **intent:** A user can read a thing.
  - **success:** The thing renders with its three fields.

## Constraints

- Read-only.

## Non-goals

- Editing the thing.

## Success signal

A user reads the thing without calling the office.

## Tenant isolation impact

- **Read paths:** filtered by `session.orgId`.
- **Negative test named here:** `thing.list.rejects-foreign-org`.

## Authorisation

<!-- REQUIRED: one predicate row per new operation. -->

## Performance budget

| Surface | Realistic volume | p95 budget | Query budget | Payload budget |
|---|---|---|---|---|
| Thing list | 40 per org | < 400 ms | 2 queries | < 40 KB |

An example payload, whose braces must not read as placeholders:

```json
{ "status": "ok", "orgId": "{orgId}" }
```

## BTP rules applicability

| Rule | Status in register | How it applies here | Blocking? |
|---|---|---|---|
| R-001 | `CONFIRMED · verified 2026-09-12` | Not applicable to a read | No |
