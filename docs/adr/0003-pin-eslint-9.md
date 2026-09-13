# ADR-0003 — Pin ESLint to v9 until eslint-plugin-react supports v10

- **Status:** accepted
- **Date:** 2026-09-12
- **Deciders:** Alexis Dupré
- **Impacts:** `50-testing.md`, the CI gate, any future dependency upgrade

## Context

The scaffold installed ESLint 10. `pnpm lint` crashes immediately:

```
TypeError: Error while loading rule 'react/display-name':
contextOrFilename.getFilename is not a function
```

`eslint-plugin-react@7.37.5` calls `context.getFilename()`, a rule-context API that ESLint 10
removed. The plugin arrives transitively through `eslint-config-next`, so it cannot simply be
dropped. The upstream compatibility issue (`jsx-eslint/eslint-plugin-react#3977`) was opened
in February 2026 and the fix PR in July 2026; neither had landed as of September 2026.

Options considered:

| Option | Buys us | Costs us | Reversible? |
|---|---|---|---|
| Pin ESLint to `^9` | Lint works today, zero rules lost, no third-party code | One major version behind until upstream catches up | Yes, trivially |
| Patch the plugin (`pnpm patch`) | Stay on ESLint 10 | A patch file to maintain and re-apply on every plugin bump; silent breakage when it stops applying | Yes |
| Swap in a community fork | Stay on ESLint 10 | A fork in the dependency chain of the tool that guards our code quality | Painful |
| Disable the failing rules | — | Weakens the gate to make the gate pass. Forbidden by `90-autonomous-loops.md`. | — |

## Decision

Pin `eslint` to `^9` in `devDependencies`.

## Consequences

- Lint runs, `--max-warnings=0` holds, no rule is lost. ESLint 10 brings no capability we need.
- **Do not "upgrade ESLint" as routine maintenance.** It will reintroduce the crash. Dependabot
  or any agent proposing it must be refused until the condition below is met.
- **Signal to revisit:** `eslint-plugin-react` (or `eslint-config-next`) ships ESLint 10
  support. Then bump both together, run `pnpm lint` on the whole tree, and supersede this ADR.
- The failure surfaced on day one because the gate runs before any feature code exists. That
  is the intended behaviour: a toolchain incompatibility found now costs five minutes; found
  at story 20, it costs a day and tempts someone into disabling rules.
