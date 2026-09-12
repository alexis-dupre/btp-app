# ADR-0002 — A semantic status layer over a monochrome preset

- **Status:** accepted
- **Date:** 2026-09-12
- **Deciders:** Alexis Dupré
- **Impacts:** `20-design-system.md`, `60-accessibility.md`, `design-system-guardian`

## Context

The installed preset (`b4qO`, resolved to style `nova` / baseColor `neutral`) is entirely
monochrome. Every token in `app/globals.css` is `oklch(L 0 0)` — zero chroma — with one
exception, `--destructive`. The five `--chart-*` tokens are five shades of grey.

A BTP product signals state constantly: a devis accepted, pending or refused; a chantier
late; a situation validated; a réserve not cleared; a sous-traitant not declared. A site
manager scanning a list of 40 chantiers on a phone reads state before reading text.
Monochrome removes that channel entirely.

Two options were considered.

| Option | Buys us | Costs us | Reversible? |
|---|---|---|---|
| A — stay monochrome, signal state by icon + label only | Absolute consistency with the preset; forces the accessibility discipline we want anyway; high legibility in sunlight | No at-a-glance scanning; multi-series charts unreadable | Yes |
| B — add a semantic status layer beside the preset | State is scannable; charts work; the preset's aesthetic is untouched | Eight extra tokens to maintain; a rule to enforce so they don't leak into decoration | Yes |

## Decision

**Option B.** Add eight status tokens (`--status-{success,warning,danger,info}` and their
`-bg` surfaces) plus a five-hue categorical chart palette, defined in `app/globals.css`
alongside the preset tokens, never overriding them. The reference block is
`docs/standards/semantic-tokens.css`.

The scope is deliberately narrow: **state information only**. Not branding, not decoration,
not emphasis, not layout. Everything outside state stays strictly monochrome.

## Consequences

- The interface keeps the preset's sober monochrome character; colour appears only where it
  carries information, which is also what makes it readable in direct sunlight.
- Colour is never the sole carrier: every status renders icon + French label + colour. The
  rule from `60-accessibility.md` already required it; here it becomes load-bearing.
- `design-system-guardian` gains one blocking rule: a status token used outside state
  information is a defect, as is a raw colour used for state.
- These tokens are ours, not the preset's. A future `shadcn apply --preset <other>` will not
  touch them, and will not remove them either — re-check contrast after any preset change.
- **Signal this was wrong:** if we find ourselves adding a fifth or sixth status colour, the
  state taxonomy is too fine for a colour channel. Go back to option A for the overflow and
  use shape.
