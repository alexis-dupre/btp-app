# Project constitution — read this before writing any code

This file is loaded into every Claude Code session and every subagent. It is short on
purpose. It states what is non-negotiable and where the detail lives.

## What we are building

A production SaaS for French construction companies (BTP): contractors, sub-contractors,
site managers (`conducteurs de travaux`), foremen (`chefs de chantier`) and back-office.
Users work on site, on phone, with gloves, in sunlight, often with no network.

## The four non-negotiables

1. **Design** — 100% shadcn/ui. Every pixel comes from the installed preset's tokens and
   registry components. See `docs/standards/20-design-system.md`.
2. **Security** — multi-tenant isolation is a correctness property, not a feature.
   Every data access is scoped by organisation and proven by a test.
   See `docs/standards/30-security.md`.
3. **Scalability** — performance budgets are enforced in CI, not discussed in review.
   See `docs/standards/40-performance-scalability.md`.
4. **Verifiability** — no work is "done" until `pnpm verify` passes locally and in CI.
   See `docs/standards/00-definition-of-done.md`.

## How work flows

BMad Method owns the process. Claude Code subagents own the expertise. Hooks and CI own
the enforcement.

```
intent -> bmad-spec -> [bmad-architecture | bmad-ux] -> stories
       -> bmad-build (per story, with our expert subagents)
       -> /quality-gate -> bmad-code-review -> bmad-retrospective
```

Never skip straight to implementation for anything that touches money, tenancy,
authentication, migrations, or a new domain concept. Those go through a spec first.

Once an epic's patterns are settled, stories can run unattended through
`scripts/loop/run-epic.sh`, one `bmad-build-auto` worker each, with the full gate run between
them. The preconditions and the list of work that never runs unattended are in
`docs/standards/90-autonomous-loops.md`. You do not decide to go autonomous — the user does.

## Standing rules for every session

- Package manager is **pnpm**. Never `npm install` / `yarn add`.
- `components/ui/**` is owned by the shadcn registry. Never hand-edit it; regenerate with
  the CLI or wrap it in `components/` instead.
- Never invent a shadcn flag or a component API. Run `pnpm dlx shadcn@latest docs <cmp>`
  or `... add <cmp> --view` and read the real thing.
- No `any`, no `@ts-expect-error` without an issue link, no disabled lint rule without a
  one-line justification on the same line.
- Money is `numeric`/integer cents, never `float`. Dates are stored UTC, rendered in
  `Europe/Paris`. Percentages are stored as decimals, not strings.
- French regulatory rules are not guesses. If a rule is not in `docs/domain/btp-rules.md`,
  ask the `btp-domain-expert` subagent or ask the user. Do not improvise VAT rates,
  retention rules, or invoicing formats.
- Every non-trivial decision that constrains future work becomes an ADR in `docs/adr/`.

## Delegation map

| Situation | Subagent |
|---|---|
| Any UI, component choice, token, spacing, variant | `design-system-guardian` |
| Screen flow, states, mobile-on-site ergonomics | `ux-flow-architect` |
| Keyboard, screen reader, contrast, focus | `accessibility-auditor` |
| React / Next implementation | `frontend-implementer` |
| Route handlers, server actions, contracts, errors | `api-architect` |
| Schema, migrations, indexes, tenancy columns | `data-modeler` |
| Latency, N+1, caching, bundle size | `performance-engineer` |
| Authz model, threat model, secrets, RGPD | `security-architect` |
| Reviewing a diff for vulnerabilities | `security-reviewer` |
| Test strategy and writing tests | `test-engineer` |
| Reviewing a diff for quality | `code-reviewer` |
| CI/CD, envs, releases, observability | `devops-release` |
| Devis, situations, TVA, retenue, sous-traitance, Factur-X | `btp-domain-expert` |

When two experts disagree, `security-architect` wins over everyone on security,
`btp-domain-expert` wins over everyone on a regulatory rule, and the user decides the rest.

## Anti-patterns that will get a change rejected

- Producing code before reading the relevant file with `Read`.
- "It should work" without running it.
- Claiming a test passes without showing the command output.
- Silently widening a type or catching an error to make a gate go green.
- Adding a dependency to avoid writing twenty lines.
- Scope creep inside a story. Note it, finish the story, raise it in the retro.
- Touching the gate to make the gate pass: settings, hooks, CI, tsconfig, lint or test config,
  the standards, or adding `.skip` to a test. A hook blocks this. Treat the block as correct.
