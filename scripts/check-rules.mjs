#!/usr/bin/env node
// Checks docs/domain/btp-rules.md against the status vocabulary declared in its own header.
//
// The vocabulary is three words. Its whole value is that a marker can be read at a glance
// and mean one thing, so the failure mode this script exists to stop is the *qualified*
// marker — "CONFIRMED by domain practice", "CONFIRMED … except the retention start point".
// Both read as CONFIRMED to anyone skimming the register for what is safe to implement,
// which is the opposite of what a three-value vocabulary is for. Prose in the header asks
// for this; this script is what makes it true. Prose can be talked out of; this exits 1.
//
//   node scripts/check-rules.mjs [docs/domain/btp-rules.md ...]
//
// Exit 0 = every register passed. 1 = at least one failed. 2 = bad usage.

import { readFileSync, existsSync } from "node:fs"

/** The only three markers. Order matters: longest first, so "TO VERIFY" wins over a prefix. */
export const STATUSES = ["CONFIRMED", "TO VERIFY", "OPEN"]

/** Default target, so the gate can call the script with no arguments. */
export const DEFAULT_TARGET = "docs/domain/btp-rules.md"

/**
 * A conforming marker, anchored at both ends: one of the three words, optionally followed
 * by exactly one ` · verified YYYY-MM-DD` or ` · raised YYYY-MM-DD` suffix, and nothing else.
 * Anchoring at the end is the point — an unanchored match is what lets a qualifier through.
 */
export const STATUS_RE =
  /^\*\*Status:\*\*\s+(CONFIRMED|TO VERIFY|OPEN)(?:\s+·\s+(verified|raised)\s+(\d{4}-\d{2}-\d{2}))?$/

/** `## R-004 — …` or `### R-004.1 — …`. The id is what gets reported. */
export const HEADING_RE = /^#{2,6}\s+(R-\d{3}(?:\.\d+)*)\b/

/** A line that is trying to be a status marker, conforming or not. */
const STATUS_LINE_RE = /^\*\*Status:\*\*/

/** How far below a heading the marker may sit: a blank line, then the marker. */
const MARKER_WINDOW = 4

/** A real calendar date, not merely four-two-two digits. Catches 2026-13-01 and 2026-02-31. */
function isRealDate(text) {
  const [y, m, d] = text.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/**
 * Blank out fenced code blocks, preserving line count so reported line numbers stay true.
 * The header quotes markers as examples of what is *not* allowed; a fence around them must
 * not trip the check it is documenting.
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

/**
 * Check one register's text.
 * @returns {{ok: boolean, failures: Array<{kind: string, id?: string, line?: number, text?: string}>}}
 */
export function checkRules(source) {
  const lines = blankFences(source.split("\n"))
  const failures = []
  const seen = new Set()
  let anyHeading = false

  lines.forEach((line, i) => {
    const heading = HEADING_RE.exec(line)
    if (!heading) return
    anyHeading = true

    const id = heading[1]
    if (seen.has(id)) {
      failures.push({ kind: "duplicate-rule", id, line: i + 1 })
    }
    seen.add(id)

    // Find the marker in the window below the heading, and stop at the next heading so a
    // rule can never borrow the marker of the rule after it.
    let marker = null
    for (
      let j = i + 1;
      j < Math.min(i + 1 + MARKER_WINDOW, lines.length);
      j += 1
    ) {
      if (HEADING_RE.test(lines[j])) break
      if (STATUS_LINE_RE.test(lines[j])) {
        marker = { text: lines[j], line: j + 1 }
        break
      }
    }

    if (!marker) {
      failures.push({ kind: "missing-status", id, line: i + 1 })
      return
    }

    const match = STATUS_RE.exec(marker.text)
    if (!match) {
      failures.push({
        kind: "malformed-status",
        id,
        line: marker.line,
        text: marker.text,
      })
      return
    }

    const [, status, suffix, date] = match

    if (date && !isRealDate(date)) {
      failures.push({
        kind: "impossible-date",
        id,
        line: marker.line,
        text: date,
      })
    }

    // The one rule that is about content rather than shape: a CONFIRMED without a date is
    // an assertion with nothing behind it, which the header forbids for the whole file.
    if (status === "CONFIRMED" && suffix !== "verified") {
      failures.push({ kind: "confirmed-without-date", id, line: marker.line })
    }
  })

  if (!anyHeading) {
    failures.push({ kind: "no-rules" })
  }

  return { ok: failures.length === 0, failures }
}

/** Check one file path. */
export function checkRulesFile(path) {
  if (!existsSync(path)) {
    return { ok: false, path, failures: [{ kind: "missing-file" }] }
  }
  const { ok, failures } = checkRules(readFileSync(path, "utf8"))
  return { ok, path, failures }
}

/** Human-readable line for one failure. Names the rule and shows the offending text. */
export function describe(failure) {
  const allowed = STATUSES.map((s) => `"${s}"`).join(", ")
  switch (failure.kind) {
    case "missing-file":
      return "no such rules file"
    case "no-rules":
      return "no R-nnn rule headings found — wrong file, or the register is empty"
    case "duplicate-rule":
      return `${failure.id} is defined twice (line ${failure.line})`
    case "missing-status":
      return `${failure.id} (line ${failure.line}) has no **Status:** line under its heading`
    case "malformed-status":
      return (
        `${failure.id} (line ${failure.line}) has a status marker that is not one of ` +
        `${allowed}, optionally followed by " · verified YYYY-MM-DD" or ` +
        `" · raised YYYY-MM-DD":\n         ${failure.text}\n` +
        `         A qualified marker reads as the bare word to anyone skimming. Split the ` +
        `qualification into a sub-rule R-nnn.n with its own marker.`
      )
    case "impossible-date":
      return `${failure.id} (line ${failure.line}) has a date that is not a real day: ${failure.text}`
    case "confirmed-without-date":
      return (
        `${failure.id} (line ${failure.line}) is CONFIRMED without a verification date. ` +
        `Every CONFIRMED carries " · verified YYYY-MM-DD".`
      )
    default:
      return `unknown failure: ${failure.kind}`
  }
}

function main(argv) {
  const targets = argv.length > 0 ? argv : [DEFAULT_TARGET]

  let failed = 0
  for (const target of targets) {
    const result = checkRulesFile(target)
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
      `\n${failed} rules file(s) with a non-conforming status marker. ` +
        `The three-value vocabulary is what makes the register readable at a glance.\n`
    )
    return 1
  }
  return 0
}

// Only run as a CLI, so the test can import the functions without triggering a process exit.
if (process.argv[1] && process.argv[1].endsWith("check-rules.mjs")) {
  process.exit(main(process.argv.slice(2)))
}
