// Self-test for scripts/check-spec.mjs.
//
// Named to sit inside the existing `test:unit` filter (`vitest run lib/domain lib/utils`)
// so the gate picks it up without editing test config.
//
// The CLI is driven as a subprocess rather than imported: the exit code and the printed
// section name are the contract CI depends on, so they are what gets asserted.

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCRIPT = join(ROOT, "scripts", "check-spec.mjs")
const FIXTURES = join(ROOT, "scripts", "fixtures", "spec-check")

function check(...targets: string[]) {
  const result = spawnSync("node", [SCRIPT, ...targets], {
    encoding: "utf8",
    cwd: ROOT,
  })
  return { status: result.status, out: result.stdout + result.stderr }
}

function fixture(name: string) {
  return join(FIXTURES, name)
}

describe("check-spec", () => {
  it("passes a complete spec", () => {
    const { status, out } = check(fixture("passing"))
    expect(status).toBe(0)
    expect(out).toContain("OK")
  })

  it("does not mistake braces inside a code fence for a placeholder", () => {
    // The passing fixture embeds {"orgId": "{orgId}"} in a JSON block on purpose.
    const { status, out } = check(fixture("passing"))
    expect(status).toBe(0)
    expect(out).not.toContain("placeholder")
  })

  it("fails and names the section when a required section is absent", () => {
    const { status, out } = check(fixture("missing-section"))
    expect(status).toBe(1)
    expect(out).toContain("missing required section: Performance budget")
  })

  it("fails and names the section when a section holds only a rubric comment", () => {
    const { status, out } = check(fixture("empty-section"))
    expect(status).toBe(1)
    expect(out).toContain("section is present but empty")
    expect(out).toContain("Authorisation")
  })

  it("fails and names the section and placeholder when one is left unreplaced", () => {
    const { status, out } = check(fixture("placeholder"))
    expect(status).toBe(1)
    expect(out).toContain("unreplaced placeholder")
    expect(out).toContain("Performance budget")
    expect(out).toContain("{Chantier list}")
  })

  it("fails when the folder has no SPEC.md", () => {
    const { status, out } = check(fixture("no-spec-file"))
    expect(status).toBe(1)
    expect(out).toContain("no SPEC.md")
  })

  it('reports every required section by name, never a bare "invalid"', () => {
    const { out } = check(fixture("missing-section"))
    expect(out).not.toMatch(/\binvalid\b/i)
  })

  it("fails the run when any one of several specs is incomplete", () => {
    const { status, out } = check(fixture("passing"), fixture("placeholder"))
    expect(status).toBe(1)
    expect(out).toContain("OK")
    expect(out).toContain("FAIL")
  })

  it("exits 2 on usage error rather than reporting a pass", () => {
    const { status } = check()
    expect(status).toBe(2)
  })
})
