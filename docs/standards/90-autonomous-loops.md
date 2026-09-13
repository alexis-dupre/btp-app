# Autonomous loops standard

Autonomy is a multiplier, not a substitute. It multiplies whatever your specs and standards
already produce — including the mistakes, faster and in bulk. Everything below exists to make
the multiplier safe.

## The three-layer model

| Layer | What it is | Owns |
|---|---|---|
| **Worker** | `bmad-build-auto` | One story: clarify, plan, implement, review, write a terminal status |
| **Orchestrator** | `scripts/loop/run-epic.sh` + `/run-epic` | Which story, in what order, what happens on a halt |
| **Judge** | `pnpm verify` + the hooks | Whether the result is actually acceptable |

The worker never judges itself. The orchestrator runs the full gate after every story the
worker declares `done`, because "done" is the worker's opinion and green is a fact.

## The five preconditions

A loop may only start when:

1. The working tree is clean and under version control.
2. `pnpm verify:fast` is green **before** the run.
3. The epic has a `SPEC.md` and an ordered `stories.yaml`, prerequisites first — the
   scheduler is linear and infers no dependency graph.
4. **The first two stories of the epic were built with a human in the loop.** Early stories
   set the patterns later ones copy. Automating unreviewed patterns industrialises them.
5. Every story touching authentication, the tenancy layer, money computation, a migration on
   a populated table, or a French regulatory rule is a checkpoint in `scripts/loop/policy.txt`.

## What never runs unattended

- Anything on the list in precondition 5.
- A first migration against production data.
- Anything where `docs/domain/btp-rules.md` marks the governing rule `TO VERIFY` or `OPEN`.
  An autonomous worker will invent a plausible rule. That is the one failure mode with legal
  consequences.
- A story whose spec you have not read yourself.

## Circuit breakers

| Breaker | Default | Why |
|---|---|---|
| Stories per run | 8 (`BTP_LOOP_MAX_STORIES`) | Bounds the blast radius of a bad spec |
| Consecutive blocked stories | 2 (`BTP_LOOP_MAX_CONSECUTIVE_BLOCKS`) | Two in a row means the spec is wrong, not the code |
| Gate red after a `done` story | halt immediately | The worker's review missed something; keep going and you compound it |
| Unexpected status | halt | Never guess what an unknown state means |
| Review repair iterations | 5, enforced by the worker | Non-convergence is a story-size problem |

## The gate cannot edit itself

`guard-integrity.sh` blocks any agent write to `.claude/settings.json`, `.claude/hooks/**`,
`.claude/agents/**`, `.github/workflows/**`, `scripts/verify.sh`, `scripts/loop/**`,
`tsconfig.json`, the lint/test configs and `docs/standards/**`. It also blocks introducing
`.skip`, `.only` or `.todo` in test files.

The same rules apply to shell commands. `path_policy.py` is shared by the Edit guard and the
Bash guard, so `cat >`, `sed -i`, `tee`, `cp`, `mv`, `rm` and inline interpreter one-liners
cannot write what the Edit tool is forbidden from writing. A path rule that covers only one
tool is not a rule — it is a speed bump with a marked detour.

This is the single most important rule for unattended work. An agent that can relax the
standard it is measured against will always eventually pass. A human lifts the block
deliberately with `BTP_ALLOW_GATE_EDIT=1`.

## Permissions during a run

The loop runs `claude -p ... --permission-mode acceptEdits`. It does **not** use
`bypassPermissions` or `--dangerously-skip-permissions`: the deny rules in
`.claude/settings.json` and every hook stay active. Autonomy is about removing the prompts
you would always answer yes to, not the ones that protect you.

## Reading a run

Three files, in this order, every time:

- `docs/backlog/loop-ledger.md` — what happened
- `docs/backlog/escalations.md` — every halt, with its cause
- `docs/backlog/deferred.md` — findings the workers set aside

Run `/loop-triage` at the start of the next session. Ten minutes there is worth an hour of
re-reading diffs later.

## The metric that matters

Not "stories completed per hour". Track **blocked rate** and **gate-red-after-done rate**
across runs. Falling means the specs and standards are improving. Rising means you are
producing debt faster than you retire it — slow down and fix the spec, not the throughput.

## Why our own orchestrator rather than `bmad-loop`

`bmad-loop` is the official orchestrator and it does more (TUI, resumable sweeps, decision
queue, tmux fan-out). It also adds a toolchain — `uv`, a Python tool, tmux — and it couples to
the worker skill's name, which has already broken once across a BMad rename.

`run-epic.sh` is fifty lines of bash, drives the same unmodified `bmad-build-auto` primitive,
and inserts our gate between stories. Start there. If you later want parallel epic streams and
the decision queue, adopt `bmad-loop`, keep this standard, and run `bmad-loop validate` first.
