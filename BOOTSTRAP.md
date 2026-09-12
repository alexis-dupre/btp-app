# Bootstrap — run this once, in this order

Order matters. shadcn scaffolds the project, BMad installs into it, our layer sits on top.

## 0. Prerequisites

```bash
node --version     # 20.12+ (BMad requires it)
python3 --version  # 3.10+  (BMad requires it)
pnpm --version
claude --version
# uv is also required by BMad: https://docs.astral.sh/uv/
```

Install `jq` if you can — the hooks use it, and fall back to `python3` if it is absent.

## 1. Scaffold the app with the imposed preset

```bash
pnpm dlx shadcn@latest init --preset b4qO --template next
cd <project>
```

Then, immediately:

```bash
pnpm dlx shadcn@latest info
```

Paste that output into `docs/standards/20-design-system.md` under **Resolved preset**.
Until that section is filled, UI work is blocked — agents must read tokens, not invent them.

## 2. Give the agent real shadcn knowledge

```bash
pnpm dlx skills add shadcn/ui
```

This installs the official shadcn skill: correct CLI flags, current component APIs for both
Base UI and Radix, and registry workflows. Without it, an agent will confidently use a prop
that was removed two versions ago.

## 3. Install BMad

```bash
npx bmad-method install
```

Select the BMad Method module. For Claude Code it writes its skills into `.claude/skills/`.
Then:

```bash
bmad-project-context     # let BMad read the repo and write its context
bmad-help                # confirms the install and suggests the next step
```

## 4. Drop this layer in

Copy the contents of this package into the project root, preserving paths:

```
CLAUDE.md
.claude/agents/**        13 expert subagents
.claude/skills/**        our 5 orchestration skills (alongside BMad's)
.claude/hooks/**         the deterministic gates
.claude/settings.json    permissions + hook wiring
docs/**                  standards, domain register, ADRs
scripts/**               verify + bundle budget
.github/workflows/**     the CI mirror of the local gate
_bmad/custom/README.md   the four customisation prompts
```

```bash
chmod +x .claude/hooks/*.sh scripts/verify.sh
```

Restart Claude Code — a session does not pick up an `agents` directory created after it started.

## 5. Wire the scripts

Add to `package.json` (adjust paths to your layout):

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "test:unit": "vitest run --dir lib/domain",
    "test:integration": "vitest run --dir lib/db --config vitest.integration.ts",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --grep @a11y",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "verify:fast": "bash scripts/verify.sh --fast",
    "verify": "bash scripts/verify.sh"
  }
}
```

`verify:fast` is what the `Stop` hook runs after every turn. If it does not exist, the hook
exits quietly and you lose the gate — so create it before you write any feature code.

## 6. Apply the BMad customisations

Follow `_bmad/custom/README.md`. Four prompts, copy-paste.

## 7. Check the factory before using it

```
/preflight
```

Fix everything it reports. Only then start work.

## 8. First real run

```
bmad-spec    # give it the intent for your first epic
/ship-story  # then run one story end to end
```

Do the first two stories with a human reading every step. They set the patterns every later
story will copy — including the mistakes.

## 9. Only later: turn on autonomy

Do **not** do this on day one. Build the first two stories of your first epic yourself with
`/ship-story`, reading every step. Those stories set the patterns every autonomous run will
copy — including the mistakes.

When they are green and you are happy with the patterns:

```bash
pip install pyyaml                       # the loop reads story frontmatter
chmod +x scripts/loop/*.sh scripts/loop/*.py
# list every story that must NOT run unattended
$EDITOR scripts/loop/policy.txt
bash scripts/loop/run-epic.sh <spec-folder> --max 3 --dry-run   # see the plan
bash scripts/loop/run-epic.sh <spec-folder> --max 3             # for real
```

Then `/loop-triage` at the start of your next session. Read
`docs/standards/90-autonomous-loops.md` before the first real run — it lists the five
preconditions and what must never run unattended.
