# Design system standard — shadcn/ui, no exceptions

## The single source of truth

The design system is the **installed shadcn preset**. Not this document, not anyone's memory
of shadcn, not a Figma file. Before any UI work:

```bash
pnpm dlx shadcn@latest info
```

That output — framework, base (Base UI or Radix), CSS variables, installed components,
documentation links — is authoritative. Paste it into the session when starting UI work.

## Bootstrap (once)

```bash
pnpm dlx shadcn@latest init --preset b4qO --template next
pnpm dlx skills add shadcn/ui     # gives the agent the correct CLI and component knowledge
```

Then record in this file, under "Resolved preset", the actual token names, the base, the icon
library and the font that the preset produced. Do it the day you initialise; do not let the
team work from assumptions.

## Rules

1. **Composition before creation.** Search the registry before writing a component:
   `pnpm dlx shadcn@latest search <query>`. Build from primitives.
2. **Tokens only.** Use the semantic classes the preset defines — `bg-background`,
   `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `rounded-md`. Forbidden:
   raw hex, `rgb()`, arbitrary values (`p-[13px]`, `text-[#0a0a0a]`), inline `style` for
   anything the tokens cover, and any colour that is not a token.
   Two exceptions, each needing a comment: one-off layout geometry, and third-party embeds.
3. **`components/ui/**` is registry-owned.** A `PreToolUse` hook blocks edits to it. To change
   a primitive: change the preset, or wrap it.
4. **Wrappers live in `components/<feature>/`** and use `cva` for variants. One wrapper per
   recurring pattern — `<MontantCell>`, `<StatutBadge>`, `<ChantierCard>` — so a visual
   decision is made once.
5. **`cn()` for conditional classes.** Never build a class string with template literals.
6. **Never invent an API.** `pnpm dlx shadcn@latest docs <component>` and
   `... add <component> --view` before use. Primitives moved to Base UI; props you remember
   from an older version may not exist.
7. **Updating a primitive**: `pnpm dlx shadcn@latest add <component> --diff` to see upstream
   changes, then `--overwrite` deliberately. Never by hand.

## On-site density rules

The primary device is a phone held with one hand, outdoors.

- Touch targets ≥ 44 × 44 px, with ≥ 8 px between adjacent destructive and safe actions.
- Primary action within thumb reach: bottom-anchored on mobile, not in a top-right corner.
- Body text ≥ 16 px; numbers in tables use tabular figures so columns align.
- Maximum contrast for anything read in sunlight: no `text-muted-foreground` for data the
  user must act on.
- Every destructive or financial action gets an `AlertDialog` naming the consequence in
  French, in the user's terms ("Cette situation sera transmise au client").

## Layout conventions

- Page shell: registry `Sidebar` on desktop, `Sheet`-based navigation on mobile.
- Data lists: registry `Data Table` with server-side pagination, sorting and filtering.
  Never a hand-rolled table.
- Forms: registry `Field` + `Label` + `Input`/`Select`, React Hook Form + Zod, errors below
  the field and linked with `aria-describedby`.
- Feedback: `Toast` for async results, `Empty` for empty states, `Skeleton` matching the final
  layout exactly so there is no shift.

## Resolved preset

Captured 2026-09-12 from `pnpm dlx shadcn@latest info` on the initialised project.

| | |
|---|---|
| Framework | Next.js 16.3.4 (App Router, RSC on), TypeScript, **no `src/` directory** |
| Tailwind | v4, tokens in `app/globals.css`, no `tailwind.config` |
| **Primitives** | **Base UI** (`base`), *not Radix* |
| Style | `base-nova` · preset `b4qO` (the CLI re-emits it as `b4nI`; identical tokens) |
| Colour | `neutral` — **fully monochrome**, every token `oklch(L 0 0)` except `--destructive` |
| Icons | `lucide` — import per icon, never the barrel |
| Font | `manrope`, headings inherit |
| Radius | `--radius: 0.625rem`, scaled `sm`→`4xl` by multipliers |
| Aliases | `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` |

### The source of truth is `app/globals.css`, not the preset code

Preset codes are opaque transport, and the CLI's own reference forbids decoding or resolving
them by hand. The tokens that actually govern the interface are the CSS variables in
`app/globals.css`. **Read that file** before any UI work. It is short and it cannot lie.

Available tokens: `background` `foreground` `card` `popover` `primary` `secondary` `muted`
`accent` `destructive` `border` `input` `ring` `chart-1..5` `sidebar*`, each with a `.dark`
counterpart, plus the radius scale.

### Base UI, not Radix — this is the biggest trap

Nearly every shadcn example online is written for Radix. The props differ. An agent working
from memory will use APIs that do not exist here.

Before using any component, fetch its real documentation:

```
https://ui.shadcn.com/docs/components/base/<component>.md
```

That URL pattern comes from this project's own `shadcn info` output and returns raw markdown.
Or run `pnpm dlx shadcn@latest docs <component>` for the resolved links, and
`pnpm dlx shadcn@latest add <component> --view` for the source that would be installed.

### Semantic status layer (ADR-0002)

The preset gives no colour for state. Eight status tokens and a five-hue chart palette are
defined alongside it — reference block in `docs/standards/semantic-tokens.css`.

- `text-status-success` `bg-status-success-bg` and the same for `warning`, `danger`, `info`
- `--chart-cat-1..5` for any chart with three or more series

**Blocking rule:** these tokens are for *state information only*. A status colour used for
decoration, branding or emphasis is a defect, and so is a raw colour used for state. Colour
never carries meaning alone — icon and French label always accompany it.

Everything outside state information stays strictly monochrome.
