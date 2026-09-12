# Security standard

Owned by the `security-architect` subagent. Nothing here is aspirational; each rule has a
control and a test.

## Threat context

Multi-tenant SaaS holding, per construction company: commercial prices and margins,
employee identity and working hours (sometimes geolocated), site photographs, and invoices
with legal force. A cross-tenant leak is an existential incident.

## 1. Tenant isolation

- `org_id NOT NULL` + foreign key on every tenant-scoped table.
- All reads and writes go through a data-access layer that requires a scope object derived
  from the session. It is impossible to call it without one — enforce this with types.
- Postgres Row Level Security enabled as the second line of defence.
- Unknown or foreign ids return **404, never 403** — do not leak existence.
- **Mandatory test:** for every tenant-scoped resource, org A requesting org B's id gets 404.

## 2. Authorisation matrix

Roles: `admin`, `conducteur`, `chef_chantier`, `compta`, `sous_traitant`, `client`.

| Resource | admin | conducteur | chef_chantier | compta | sous_traitant | client |
|---|---|---|---|---|---|---|
| chantier | CRUD | CRUD (assigned) | R (assigned) | R | R (own lot) | R (own) |
| devis | CRUD | CRUD | – | R | – | R (sent) |
| situation | CRUD | CRU | R | RU | R (own lot) | R (validated) |
| facture | CRUD | R | – | CRUD | – | R (own) |
| pointage | CRUD | CRUD | CRU (own team) | R | – | – |
| utilisateur | CRUD | R | R | R | – | – |

Keep this table current. The code derives from it through a single
`authorize(subject, action, resource)` helper; no scattered role checks.

## 3. Input and output

- Zod at every boundary, one schema shared by client and server.
- Output is an explicit projection. Never return a whole row.
- Errors are a closed set; internal details never reach the client.

## 4. Uploads (site photos, plans, attestations)

Validate by content sniffing, cap size, strip EXIF GPS before storage, store outside the web
root with a generated key, serve via short-lived signed URLs, scan for malware where
available. Generate thumbnails server-side — a 12 MB camera photo never reaches a phone.

## 5. Sessions and accounts

httpOnly + Secure + SameSite=Lax cookies, short TTL, server-side revocation, MFA for `admin`
and `compta`. Rate-limit login, password reset, invitation and export. Invitations expire.

## 6. Headers and transport

HSTS, CSP without `unsafe-inline`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` denying what is unused.

## 7. Secrets

Platform secret store only. Nothing in the repo, nothing in `NEXT_PUBLIC_*`, nothing in logs.
Every `NEXT_PUBLIC_` variable is reviewed as public data. Rotate on any suspicion.

## 8. RGPD and CNIL

Personal data inventory, with purpose, legal basis, retention and access, is maintained below.
**Employee geolocation attached to `pointages` is sensitive**: it requires proportionality,
prior information, and usually consultation of staff representatives. Never design it
silently — raise it to the user.

Implement, from the start: export of a person's data, deletion with a documented retention
override for accounting records, and an audit trail of who read what.

## 9. Dependencies

`pnpm audit --audit-level=high` in CI. A new dependency needs a stated reason, a maintenance
check (last release, open critical issues) and an owner.

## Threat models per feature

> Appended by the `/threat-model` skill. One section per feature.
