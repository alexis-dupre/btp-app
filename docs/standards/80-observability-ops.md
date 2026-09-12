# Observability and operations standard

## Logging

Structured JSON. Every log line carries `request_id`, `org_id`, `user_id`, `route`, `duration_ms`.
Never a token, a password, a full request body, or personal data. Site photo filenames can
contain names — log the key, not the filename.

## Errors

Error tracking with release tagging and source maps. Every unhandled error is an alert with an
owner. An error that fires more than ten times a day is either fixed or downgraded on purpose,
with a note.

## Metrics that matter here

Beyond the four golden signals per critical route:

- `devis` PDF generation failures
- e-invoice transmission failures and rejections from the platform
- queue depth and dead-letter count
- authentication failure spikes (credential stuffing)
- p95 of the `situations` list, the heaviest office screen
- mobile error rate split from desktop — site users hit different failures

## Alerting

Alert on user-visible symptoms, not on causes. Every alert names the owner, the runbook and
the first thing to check. An alert nobody acts on is deleted.

## Environments

`local` → `preview` (per PR, seeded, disposable DB) → `staging` (production-like volume) →
`production`. Secrets are per environment and never copied down from production.

## Releases

Migrations run as a separate step before the new code goes live and are backward compatible.
Deploys are reversible. Risky changes ship behind a flag. A rollback plan is written before
the deploy, not during the incident.

## Restore drills

| Date | Environment | Restored to | Duration | Result | By |
|---|---|---|---|---|---|
| _(fill in quarterly)_ | | | | | |
