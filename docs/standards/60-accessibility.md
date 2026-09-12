# Accessibility standard — WCAG 2.2 AA

Target: WCAG 2.2 level AA. French public-sector clients may also require RGAA conformance;
assume they will.

## Why it is a hard gate here

Site users work one-handed, in sunlight, sometimes with impaired hearing from years of
machinery. Accessibility work is usability work for this audience, not compliance theatre.

## Rules

- **Use the registry primitives as they ship.** They are accessible. Almost every defect
  comes from breaking them: removing `asChild`, replacing `Dialog` with a `div`, dropping the
  `Label` from a `Field`.
- **Every control has an accessible name.** Icon-only buttons need `aria-label` or visually
  hidden text. A placeholder is never a label.
- **Keyboard completeness.** Every action reachable and operable by keyboard; focus visible
  everywhere; focus trapped in modals and returned to the trigger on close; logical Tab order.
- **State conveyed non-visually.** `aria-invalid` plus a linked error message on fields,
  `aria-live="polite"` for async results, skeletons or `aria-busy` for loading.
- **Contrast.** 4.5:1 for text, 3:1 for UI boundaries and graphical objects, checked in both
  themes. Never colour alone: a `Retard` badge carries the word, not just red.
- **Target size** ≥ 24 × 24 px per WCAG 2.2; ≥ 44 × 44 px by our own on-site rule.
- **Motion** respects `prefers-reduced-motion`.
- **Tables** have a caption or `aria-label`; sortable headers announce sort state.
- **Language** is `lang="fr"`; any English string in the UI is a bug.

## Verification

`pnpm test:a11y` (axe on every page object) blocks the merge. Automated checks catch roughly
a third of real issues, so `accessibility-auditor` reviews every UI diff manually, and a
keyboard-only pass is done on each new flow.
