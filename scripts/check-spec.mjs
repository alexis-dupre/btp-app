#!/usr/bin/env node
// Checks a spec folder's SPEC.md against the project spec contract.
//
// The contract lives in two places and this script is the third: the template at
// _bmad/custom/bmad-spec-btp-template.md produces the shape, the on_complete block in
// _bmad/custom/bmad-spec.toml asks bmad-spec to check it, and this script is what makes
// the check real. The first two are prompt-level and can be talked out of; this one exits 1.
//
//   node scripts/check-spec.mjs <spec-folder|SPEC.md> [...]
//
// Exit 0 = every spec passed. 1 = at least one failed. 2 = bad usage.

import { readFileSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"

/** Sections every spec must carry. Non-goals is the explicit out-of-scope section. */
export const REQUIRED_SECTIONS = [
  "Tenant isolation impact",
  "Authorisation",
  "Performance budget",
  "BTP rules applicability",
  "Non-goals",
]

/** Unreplaced template placeholder, e.g. {Chantier list} or {< 400 ms server}. */
export const PLACEHOLDER = /\{[A-Za-z<][^}]*\}/

/**
 * Blank out fenced code blocks, preserving line count so reported line numbers stay true.
 * A spec may legitimately show `{orgId}` inside an example; a false positive here would
 * block real work, which is worse than missing a placeholder someone hid in a fence.
 */
function blankFences(lines) {
  let inFence = false
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      return ""
    }
    return inFence ? "" : line
  })
}

/** Strip HTML comments and whitespace; what remains is content the author actually wrote. */
function substantive(body) {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .trim()
}

/** Map each `## Heading` to its body text and 1-indexed line number. */
function sections(lines) {
  const found = new Map()
  let current = null
  lines.forEach((line, i) => {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      current = { name: heading[1], line: i + 1, body: [] }
      found.set(current.name, current)
    } else if (current) {
      current.body.push(line)
    }
  })
  return found
}

/**
 * Check one SPEC.md's text.
 * @returns {{ok: boolean, failures: Array<{kind: string, section?: string, line?: number, text?: string}>}}
 */
export function checkSpec(source) {
  const lines = source.split("\n")
  const failures = []
  const found = sections(lines)

  for (const name of REQUIRED_SECTIONS) {
    const section = found.get(name)
    if (!section) {
      failures.push({ kind: "missing-section", section: name })
    } else if (substantive(section.body.join("\n")) === "") {
      failures.push({
        kind: "empty-section",
        section: name,
        line: section.line,
      })
    }
  }

  // Placeholders are scanned across the whole document: one left anywhere means the
  // spec was rendered from the template and never finished.
  blankFences(lines).forEach((line, i) => {
    const hit = PLACEHOLDER.exec(line)
    if (hit) {
      const owner = [...found.values()].filter((s) => s.line <= i + 1).pop()
      failures.push({
        kind: "placeholder",
        section: owner ? owner.name : "(frontmatter)",
        line: i + 1,
        text: hit[0],
      })
    }
  })

  return { ok: failures.length === 0, failures }
}

/**
 * Check a spec folder (or a direct path to a SPEC.md).
 * @returns {{ok: boolean, path: string, failures: Array<object>}}
 */
export function checkSpecFolder(target) {
  const path =
    existsSync(target) && statSync(target).isDirectory()
      ? join(target, "SPEC.md")
      : target

  if (!existsSync(path)) {
    return { ok: false, path, failures: [{ kind: "missing-spec-file" }] }
  }
  const { ok, failures } = checkSpec(readFileSync(path, "utf8"))
  return { ok, path, failures }
}

/** Human-readable line for one failure. Says which section, never just "invalid". */
export function describe(failure) {
  switch (failure.kind) {
    case "missing-spec-file":
      return "no SPEC.md in this folder"
    case "missing-section":
      return `missing required section: ${failure.section}`
    case "empty-section":
      return `section is present but empty (line ${failure.line}): ${failure.section}`
    case "placeholder":
      return `unreplaced placeholder in ${failure.section} (line ${failure.line}): ${failure.text}`
    default:
      return `unknown failure: ${failure.kind}`
  }
}

function main(argv) {
  if (argv.length === 0) {
    process.stderr.write(
      "usage: node scripts/check-spec.mjs <spec-folder|SPEC.md> [...]\n"
    )
    return 2
  }

  let failed = 0
  for (const target of argv) {
    const result = checkSpecFolder(target)
    if (result.ok) {
      process.stdout.write(`OK   ${result.path}\n`)
      continue
    }
    failed += 1
    process.stdout.write(`FAIL ${result.path}\n`)
    for (const failure of result.failures) {
      process.stdout.write(`       ${describe(failure)}\n`)
    }
  }

  if (failed > 0) {
    process.stdout.write(
      `\n${failed} spec(s) incomplete. An incomplete spec is not handed to build.\n`
    )
    return 1
  }
  return 0
}

// Only run as a CLI, so the test can import the functions without triggering a process exit.
if (process.argv[1] && process.argv[1].endsWith("check-spec.mjs")) {
  process.exit(main(process.argv.slice(2)))
}
