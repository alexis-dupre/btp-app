# Fixture — a conforming register

Status values: `CONFIRMED` · `TO VERIFY` · `OPEN`.

A header may document the shape of a rule, including markers that would fail, inside a
fence. Blanking fences is what lets the register document its own rule:

```
## R-999 — A rule as it appears in the template

**Status:** CONFIRMED by domain practice
```

---

## R-001 — A confirmed rule

**Status:** CONFIRMED · verified 2026-09-13

Body.

---

## R-002 — An unsourced rule

**Status:** TO VERIFY

Body.

---

## R-003 — A rule awaiting a decision

**Status:** OPEN · raised 2026-09-13

Body.

### R-003.1 — A sub-rule carrying its own marker

**Status:** TO VERIFY · raised 2026-09-13

Body.
