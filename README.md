# BTP AI Factory — an expert development infrastructure for Claude Code

An opinionated setup that makes a Claude Code + BMad Method installation produce
production-grade code for a French construction (BTP) SaaS, with enforced standards on
design, security, scalability and verifiability.

## The one idea

> **A standard that is not executable is a wish.**

Prompts alone do not produce expert code — they raise the average and leave the tail
untouched. So this infrastructure separates two jobs:

- **Judgement** — what the standard should be, whether a design is right, whether a French
  regulatory rule applies. This goes to **expert subagents**, each with a narrow remit,
  restricted tools, and a model chosen for the job.
- **Enforcement** — whether the standard was actually met. This goes to **hooks and CI**,
  which are deterministic, cannot be talked out of a verdict, and fail the build.

Everything below is one or the other. Nothing relies on an agent's good intentions.

## The five layers

```
┌─ L5  Autonomy ............... scripts/loop — one worker per story, gate between each
├─ L4  CI mirror .............. .github/workflows — the same gate, without an agent
├─ L3  Deterministic gates .... .claude/hooks — block, format, typecheck, refuse to stop on red
├─ L2  Expert subagents ....... .claude/agents — 13 specialists, tool-restricted
├─ L1  Process spine .......... BMad Method v6 — spec, stories, build, review, retro
└─ L0  Contracts .............. CLAUDE.md + docs/standards — the non-negotiables
```

## What is in the box

| Path | What it does |
|---|---|
| `CLAUDE.md` | The constitution. Loaded into every session and every subagent. |
| `.claude/agents/` | 13 experts: design system, UX, a11y, front end, API, data, performance, security × 2, testing, review, DevOps, BTP domain — plus a `tech-lead` that routes and arbitrates. |
| `.claude/skills/` | `/ship-story`, `/quality-gate`, `/design-review`, `/threat-model`, `/preflight`, `/run-epic`, `/loop-triage`. |
| `scripts/loop/` | The autonomous runner: one `bmad-build-auto` worker per story, our full gate after each, circuit breakers, escalation file. |
| `.claude/hooks/` | Blocks `npm`, blocks edits to `components/ui/**` and `.env`, blocks `drizzle-kit push` and `--no-verify`, typechecks after every write, refuses to end a turn on a red tree. |
| `.claude/settings.json` | Permissions and hook wiring. |
| `docs/standards/` | Definition of done, architecture, design system, security, performance, testing, accessibility, data/migrations, ops. |
| `docs/domain/` | French BTP glossary and the **rules register** — every regulatory rule with a source and a date. |
| `docs/adr/` | Architecture decision records. |
| `scripts/`, `.github/` | `verify` and the CI that runs exactly the same thing. |

## The expert roster

| Agent | Model | Tools | Owns |
|---|---|---|---|
| `tech-lead` | opus | + Agent | Routing, arbitration, definition of done |
| `design-system-guardian` | sonnet | read + Bash | 100% shadcn, tokens, registry APIs |
| `ux-flow-architect` | opus | read-only | Flows and states for on-site users |
| `accessibility-auditor` | sonnet | read-only | WCAG 2.2 AA |
| `frontend-implementer` | sonnet | write | RSC, server actions, forms |
| `api-architect` | opus | write | Contracts, authz predicate, errors, idempotency |
| `data-modeler` | opus | write | Schema, migrations, indexes, tenancy |
| `performance-engineer` | sonnet | write | Budgets, N+1, caching, bundle |
| `security-architect` | opus | write | Threat model, authz matrix, RGPD |
| `security-reviewer` | opus | read-only | Adversarial diff review |
| `test-engineer` | sonnet | write | Test strategy and tests |
| `code-reviewer` | opus | read-only | Quality review |
| `devops-release` | sonnet | write | CI/CD, migrations in prod, observability |
| `btp-domain-expert` | opus | write + web | French BTP rules, with sources |

Thirteen, not thirty. Subagent descriptions consume context on every turn and Claude routes
by reading them, so a bloated roster makes routing *worse*. Each of these owns a domain with
a clear boundary; two of them are deliberately read-only so a reviewer can never "fix" what
it was asked to judge.

## How a story actually runs

```
/ship-story <story>
  0. tech-lead frames it and produces the delegation plan
  1. design pass, in parallel: domain · security · data · API · UX+design-system
     → stop, show the user the decisions, get a yes
  2. build             (post-edit hook typechecks every write)
  3. test-engineer     (tenant-isolation negative test is mandatory)
  4. review, parallel: code-reviewer · security-reviewer · a11y · performance
  5. resolve every BLOCKING finding
  6. /quality-gate     must be green
  7. ADR + update the BTP rules register
```

## Running unattended

```bash
bash scripts/loop/run-epic.sh <spec-folder> --max 6
```

One `bmad-build-auto` worker per story, in manifest order. After every story the loop runs
`pnpm verify` **itself** — the worker's own "done" is an opinion, green is a fact. It halts on
a blocked story, on two consecutive blocks, on a red gate after a `done`, and on any story
listed as a human checkpoint in `scripts/loop/policy.txt`.

The rule that makes this safe: `guard-integrity.sh` stops any agent from editing the gate it
is measured by — settings, hooks, CI, tsconfig, lint and test configs, the standards — or from
introducing a skipped test. An agent that can relax the standard will eventually pass by
relaxing it. See `docs/standards/90-autonomous-loops.md`.

## What this will and will not do

**It will**: stop an agent from hand-editing a registry component, from inventing a shadcn
prop, from shipping an unscoped tenant query, from silencing a failing test, from ending a
turn on a red tree, and from quietly inventing a French VAT rate.

**It will not**: replace your judgement on the first two stories. Those set the patterns every
later story copies. Read every step of them yourself.

## Start here

`BOOTSTRAP.md` — eight steps, in order.
