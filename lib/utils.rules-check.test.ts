// Self-test for scripts/check-rules.mjs.
//
// Named to sit inside the existing `test:unit` filter (`vitest run lib/domain lib/utils`)
// so the gate picks it up without editing test config — same trick as
// lib/utils.spec-check.test.ts, for the same reason.
//
// The CLI is driven as a subprocess rather than imported: the exit code and the printed
// rule id are the contract CI depends on, so they are what gets asserted.

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCRIPT = join(ROOT, "scripts", "check-rules.mjs")
const FIXTURES = join(ROOT, "scripts", "fixtures", "rules-check")

function check(...targets: string[]) {
  const result = spawnSync("node", [SCRIPT, ...targets], {
    encoding: "utf8",
    cwd: ROOT,
  })
  return { status: result.status, out: result.stdout + result.stderr }
}

function fixture(name: string) {
  return join(FIXTURES, `${name}.md`)
}

describe("check-rules", () => {
  it("passes a register whose every marker conforms", () => {
    const { status, out } = check(fixture("passing"))
    expect(status).toBe(0)
    expect(out).toContain("OK")
  })

  it("does not mistake a marker quoted inside a code fence for a real one", () => {
    // The passing fixture documents `**Status:** CONFIRMED by domain practice` in a fence.
    const { status, out } = check(fixture("passing"))
    expect(status).toBe(0)
    expect(out).not.toContain("R-999")
  })

  // The reason this script exists: both of these read as CONFIRMED when skimmed.
  it("rejects a CONFIRMED carrying a trailing exception", () => {
    const { status, out } = check(fixture("qualified-confirmed"))
    expect(status).toBe(1)
    expect(out).toContain("R-001")
    expect(out).toContain("except the retention start point")
  })

  it("rejects a CONFIRMED qualified by something other than a source", () => {
    const { status, out } = check(fixture("qualified-confirmed"))
    expect(status).toBe(1)
    expect(out).toContain("R-002")
    expect(out).toContain("CONFIRMED by domain practice")
  })

  it("tells the author to split the qualification into a sub-rule", () => {
    const { out } = check(fixture("qualified-confirmed"))
    expect(out).toContain("sub-rule R-nnn.n")
  })

  it("rejects a CONFIRMED with no verification date", () => {
    const { status, out } = check(fixture("confirmed-without-date"))
    expect(status).toBe(1)
    expect(out).toContain("R-001")
    expect(out).toContain("CONFIRMED without a verification date")
  })

  it("rejects a CONFIRMED dated with `raised` instead of `verified`", () => {
    const { status, out } = check(fixture("confirmed-without-date"))
    expect(status).toBe(1)
    expect(out).toContain("R-002")
  })

  it("rejects free text where the date suffix belongs", () => {
    const { status, out } = check(fixture("bad-suffix"))
    expect(status).toBe(1)
    expect(out).toContain("needs a sourced read before implementation")
  })

  it("rejects a date that is not YYYY-MM-DD", () => {
    const { status, out } = check(fixture("bad-suffix"))
    expect(status).toBe(1)
    expect(out).toContain("13-09-2026")
  })

  it("rejects a date that is well-formed but not a real day", () => {
    const { status, out } = check(fixture("bad-suffix"))
    expect(status).toBe(1)
    expect(out).toContain("not a real day")
    expect(out).toContain("2026-02-31")
  })

  it("fails a rule heading with no status line under it", () => {
    const { status, out } = check(fixture("missing-status"))
    expect(status).toBe(1)
    expect(out).toContain("R-001")
    expect(out).toContain("has no **Status:** line")
  })

  it("does not let a rule borrow the marker of a rule far below it", () => {
    const { status, out } = check(fixture("missing-status"))
    expect(status).toBe(1)
    expect(out).toContain("R-002")
  })

  it("fails when the same rule id is defined twice", () => {
    const { status, out } = check(fixture("duplicate-rule"))
    expect(status).toBe(1)
    expect(out).toContain("R-001 is defined twice")
  })

  it("fails rather than passes when handed a file with no rules at all", () => {
    const { status, out } = check(fixture("no-rules"))
    expect(status).toBe(1)
    expect(out).toContain("no R-nnn rule headings found")
  })

  it("fails when the rules file does not exist", () => {
    const { status, out } = check(fixture("does-not-exist"))
    expect(status).toBe(1)
    expect(out).toContain("no such rules file")
  })

  it('names the offending rule, never a bare "invalid"', () => {
    const { out } = check(fixture("qualified-confirmed"))
    expect(out).not.toMatch(/\binvalid\b/i)
  })

  it("fails the run when any one of several registers is non-conforming", () => {
    const { status, out } = check(fixture("passing"), fixture("bad-suffix"))
    expect(status).toBe(1)
    expect(out).toContain("OK")
    expect(out).toContain("FAIL")
  })

  it("checks the real register by default, with no arguments", () => {
    const { status, out } = check()
    expect(out).toContain("docs/domain/btp-rules.md")
    expect(status).toBe(0)
  })

  it("holds the committed register to its own vocabulary", () => {
    const { status } = check("docs/domain/btp-rules.md")
    expect(status).toBe(0)
  })
})
