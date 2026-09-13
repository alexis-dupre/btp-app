<!-- Prepared 2026-09-13 from the `domain` worktree (/Users/alexis/dev/btp-app-domain,
     branch feat/btp-rules). Three items that stream could not write:

       1. lib/utils.rules-check.test.ts — REFUSED by guard-stream.sh: `lib` belongs to
          stream 'main' (branch main, worktree /Users/alexis/dev/btp-app). Apply from there.
       2. scripts/verify.sh — gate file, deliberately not applied.
       3. .claude/skills/quality-gate/SKILL.md — gate file, deliberately not applied.

     Already applied in the domain worktree, no action needed:
       docs/domain/btp-rules.md            R-005, R-009/R-009.1, header vocabulary,
                                           R-002 and R-008 marker tails
       scripts/check-rules.mjs             the checker
       scripts/fixtures/rules-check/*.md   7 fixtures

     Both diffs below were generated from real edited copies and verified:
       - `bash -n` clean
       - patched fast gate PASSES against the current register
       - patched fast gate EXITS 1 when a qualified CONFIRMED is added to the register
     Items 2 and 3 turn the check on; the register already conforms, so applying them
     before item 1 is safe. -->

=========== ITEM 1 — new file: lib/utils.rules-check.test.ts (apply from `main`) ===========

Verified green in the domain worktree before handover: 19 passed (19). Named to fall inside
the existing `test:unit` filter (`vitest run lib/domain lib/utils`) — the same trick
lib/utils.spec-check.test.ts uses — so no test-config change is needed. Already formatted
against the repo Prettier config.

```ts
// Self-test for scripts/check-rules.mjs.
//
// Named to sit inside the existing `test:unit` filter (`vitest run lib/domain lib/utils`)
// so the gate picks it up without editing test config — same trick as
// lib/utils.spec-check.test.ts, for the same reason.
//
// The CLI is driven as a subprocess rather than imported: the exit code and the printed
// rule id are the contract CI depends on, so they are what gets asserted.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "check-rules.mjs");
const FIXTURES = join(ROOT, "scripts", "fixtures", "rules-check");

function check(...targets: string[]) {
  const result = spawnSync("node", [SCRIPT, ...targets], {
    encoding: "utf8",
    cwd: ROOT,
  });
  return { status: result.status, out: result.stdout + result.stderr };
}

function fixture(name: string) {
  return join(FIXTURES, `${name}.md`);
}

describe("check-rules", () => {
  it("passes a register whose every marker conforms", () => {
    const { status, out } = check(fixture("passing"));
    expect(status).toBe(0);
    expect(out).toContain("OK");
  });

  it("does not mistake a marker quoted inside a code fence for a real one", () => {
    // The passing fixture documents `**Status:** CONFIRMED by domain practice` in a fence.
    const { status, out } = check(fixture("passing"));
    expect(status).toBe(0);
    expect(out).not.toContain("R-999");
  });

  // The reason this script exists: both of these read as CONFIRMED when skimmed.
  it("rejects a CONFIRMED carrying a trailing exception", () => {
    const { status, out } = check(fixture("qualified-confirmed"));
    expect(status).toBe(1);
    expect(out).toContain("R-001");
    expect(out).toContain("except the retention start point");
  });

  it("rejects a CONFIRMED qualified by something other than a source", () => {
    const { status, out } = check(fixture("qualified-confirmed"));
    expect(status).toBe(1);
    expect(out).toContain("R-002");
    expect(out).toContain("CONFIRMED by domain practice");
  });

  it("tells the author to split the qualification into a sub-rule", () => {
    const { out } = check(fixture("qualified-confirmed"));
    expect(out).toContain("sub-rule R-nnn.n");
  });

  it("rejects a CONFIRMED with no verification date", () => {
    const { status, out } = check(fixture("confirmed-without-date"));
    expect(status).toBe(1);
    expect(out).toContain("R-001");
    expect(out).toContain("CONFIRMED without a verification date");
  });

  it("rejects a CONFIRMED dated with `raised` instead of `verified`", () => {
    const { status, out } = check(fixture("confirmed-without-date"));
    expect(status).toBe(1);
    expect(out).toContain("R-002");
  });

  it("rejects free text where the date suffix belongs", () => {
    const { status, out } = check(fixture("bad-suffix"));
    expect(status).toBe(1);
    expect(out).toContain("needs a sourced read before implementation");
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    const { status, out } = check(fixture("bad-suffix"));
    expect(status).toBe(1);
    expect(out).toContain("13-09-2026");
  });

  it("rejects a date that is well-formed but not a real day", () => {
    const { status, out } = check(fixture("bad-suffix"));
    expect(status).toBe(1);
    expect(out).toContain("not a real day");
    expect(out).toContain("2026-02-31");
  });

  it("fails a rule heading with no status line under it", () => {
    const { status, out } = check(fixture("missing-status"));
    expect(status).toBe(1);
    expect(out).toContain("R-001");
    expect(out).toContain("has no **Status:** line");
  });

  it("does not let a rule borrow the marker of a rule far below it", () => {
    const { status, out } = check(fixture("missing-status"));
    expect(status).toBe(1);
    expect(out).toContain("R-002");
  });

  it("fails when the same rule id is defined twice", () => {
    const { status, out } = check(fixture("duplicate-rule"));
    expect(status).toBe(1);
    expect(out).toContain("R-001 is defined twice");
  });

  it("fails rather than passes when handed a file with no rules at all", () => {
    const { status, out } = check(fixture("no-rules"));
    expect(status).toBe(1);
    expect(out).toContain("no R-nnn rule headings found");
  });

  it("fails when the rules file does not exist", () => {
    const { status, out } = check(fixture("does-not-exist"));
    expect(status).toBe(1);
    expect(out).toContain("no such rules file");
  });

  it('names the offending rule, never a bare "invalid"', () => {
    const { out } = check(fixture("qualified-confirmed"));
    expect(out).not.toMatch(/\binvalid\b/i);
  });

  it("fails the run when any one of several registers is non-conforming", () => {
    const { status, out } = check(fixture("passing"), fixture("bad-suffix"));
    expect(status).toBe(1);
    expect(out).toContain("OK");
    expect(out).toContain("FAIL");
  });

  it("checks the real register by default, with no arguments", () => {
    const { status, out } = check();
    expect(out).toContain("docs/domain/btp-rules.md");
    expect(status).toBe(0);
  });

  it("holds the committed register to its own vocabulary", () => {
    const { status } = check("docs/domain/btp-rules.md");
    expect(status).toBe(0);
  });
});
```

=========== ITEM 2 — scripts/verify.sh (one added line) ===========

Sits inside the fast gate, so `pnpm verify:fast`, `pnpm verify` and CI all get it. Placed
after the spec-contract block, before the `--fast` early exit.

```diff
--- a/scripts/verify.sh
+++ b/scripts/verify.sh
@@ -46,6 +46,8 @@
   printf '%s\n' "$SPECS" | xargs node scripts/check-spec.mjs || exit 1
 fi
 
+echo; echo "── rules register"; node scripts/check-rules.mjs || exit 1
+
 if [ "$FAST" = "--fast" ]; then
   echo
   [ ${#SKIPPED[@]} -gt 0 ] && printf 'Not checked: %s\n' "$(IFS=', '; echo "${SKIPPED[*]}")"
```

Two notes on the shape of that line:

- The separators are `;` not `&&`, so `|| exit 1` binds to the `node` call alone.
- No `has_script` guard and no `SKIPPED` entry, unlike the staged tool stages. That is
  deliberate: check-rules.mjs is committed to the repo, so it can never be legitimately
  absent, and a missing checker should fail the gate rather than be reported as skipped.

=========== ITEM 3 — .claude/skills/quality-gate/SKILL.md (one added line + report line) ===========

```diff
--- a/.claude/skills/quality-gate/SKILL.md
+++ b/.claude/skills/quality-gate/SKILL.md
@@ -23,6 +23,7 @@
 pnpm test:a11y
 pnpm audit --audit-level=high
 git ls-files -co --exclude-standard 'docs/specs/*/SPEC.md' | xargs -r node scripts/check-spec.mjs
+node scripts/check-rules.mjs
 ```
 
 ## Then check what a script cannot
@@ -41,7 +42,7 @@
 GATE: PASS | FAIL
 typecheck   ✓/✗   lint ✓/✗   unit ✓/✗   build ✓/✗
 integration ✓/✗   e2e  ✓/✗   a11y ✓/✗   audit ✓/✗
-spec-check  ✓/✗
+spec-check  ✓/✗   rules ✓/✗
 Manual checks: <findings or "none">
 Blocking: <list, or "none">
 ```
```

The first hunk is the one you asked for. The second keeps the report template honest — a
gate that runs a check it does not report is how a check quietly stops mattering. Drop that
hunk if you would rather keep the diff to a single line.
