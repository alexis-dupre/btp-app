#!/usr/bin/env node
/**
 * Fails the build when a route's first-load JS exceeds the budget.
 * Budgets live in docs/standards/40-performance-scalability.md and are enforced here.
 * Reads .next/app-build-manifest.json + the build output; adjust the parser to your
 * Next.js version the first time you run it, then never touch it again.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET_KB = 180;
const MANIFEST = ".next/app-build-manifest.json";

if (!existsSync(MANIFEST)) {
  console.error(`Bundle budget: ${MANIFEST} not found. Run 'pnpm build' first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const pages = manifest.pages ?? {};
const failures = [];

for (const [route, files] of Object.entries(pages)) {
  let bytes = 0;
  for (const f of files) {
    const p = join(".next", f);
    if (existsSync(p)) bytes += statSync(p).size;
  }
  const kb = Math.round(bytes / 1024);
  const verdict = kb > BUDGET_KB ? "OVER" : "ok";
  console.log(`${verdict.padEnd(4)} ${String(kb).padStart(5)} KB  ${route}`);
  if (kb > BUDGET_KB) failures.push({ route, kb });
}

if (failures.length) {
  console.error(
    `\nBundle budget exceeded on ${failures.length} route(s) (limit ${BUDGET_KB} KB).\n` +
      `Fix it, or raise the budget in an ADR — never silently.`,
  );
  process.exit(1);
}
console.log(`\nAll routes within the ${BUDGET_KB} KB budget.`);
