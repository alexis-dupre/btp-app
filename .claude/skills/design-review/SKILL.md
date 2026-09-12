---
name: design-review
description: Review the UI in the current diff against the shadcn design system and accessibility rules. Use after any UI change.
disable-model-invocation: false
---

# Design review

Changed UI files: !`git diff --name-only HEAD | grep -E '\.(tsx|css)$' || echo "(none)"`

Run these in parallel and consolidate:

1. `design-system-guardian` — token compliance, correct registry component, no hand-edited
   primitive, no arbitrary values, variants over forks, dark mode, on-site density.
2. `accessibility-auditor` — WCAG 2.2 AA, keyboard path, accessible names, contrast in both
   themes, reduced motion.
3. `performance-engineer` — only if the change adds a list, a chart, images or a client
   component: bundle impact and render cost.

Consolidate into one list ordered by severity, deduplicated, each item with the file, the
line and the exact replacement. Then state the verdict: `ship` / `fix first`.

Do not restate what each agent said separately. One list, one verdict.
