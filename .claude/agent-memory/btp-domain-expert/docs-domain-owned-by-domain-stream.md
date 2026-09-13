---
name: docs-domain-owned-by-domain-stream
description: docs/domain/ is claimed by the parallel stream 'domain' (branch feat/btp-rules, worktree btp-app-domain) — edits from the main worktree are refused by a hook
metadata:
  type: project
---

`docs/domain/` — including `btp-rules.md` — is claimed by the parallel stream **`domain`**
(branch `feat/btp-rules`, worktree `/Users/alexis/dev/btp-app-domain`). The main worktree's
`.btp-stream` file says `main`, so `guard-stream.sh` refuses any edit to `docs/domain/` from
there. Observed 2026-09-13 while trying to rewrite R-004.

**Why:** two sessions editing the register merge cleanly and still produce a wrong rule —
exactly the failure mode the register exists to prevent. The refusal is correct behaviour and
must not be worked around (also stated in CLAUDE.md).

**How to apply:** when asked to write to `docs/domain/btp-rules.md`, do the research and hand
the finished block back as text for the `domain` stream to apply, or ask the user to re-run in
the `btp-app-domain` worktree. Do not edit the other worktree's files directly and do not
widen the claim. Re-check `.btp-stream` before assuming this still holds — stream claims are
temporary. See [[rules-verification-log]].
