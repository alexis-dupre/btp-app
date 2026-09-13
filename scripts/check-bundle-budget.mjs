#!/usr/bin/env node
/**
 * Fails the build when a route's first-load JS exceeds the budget.
 * Budget lives in docs/standards/40-performance-scalability.md: <= 180 KB gzip per route.
 *
 * Next 16 + Turbopack does not emit `.next/app-build-manifest.json`, and its
 * `.next/build-manifest.json` carries only the pages-router map (`{"/_app": []}`).
 * See docs/adr/0005-bundle-budget-turbopack.md. First-load JS per app route is
 * reassembled from two manifests that Turbopack does emit:
 *
 *   shared  .next/server/app/<route>/build-manifest.json -> rootMainFiles
 *   route   .next/server/app/<route>_client-reference-manifest.js -> entryJSFiles
 *
 * Exit 0 = every route within budget. 1 = a route is over. 2 = cannot measure.
 * A shape this script does not recognise is never reported as a pass.
 */
import { readFileSync, existsSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

const BUDGET_KB = 180
const NEXT = ".next"
const ROUTES_MANIFEST = join(NEXT, "app-path-routes-manifest.json")

/** Exit 2. Reserved for "the build output is not the shape we know how to read". */
function cannotMeasure(reason) {
  console.error(`Bundle budget: cannot measure — ${reason}`)
  console.error(
    "Refusing to report a pass. If the Next.js build output changed shape, update this\n" +
      "script and docs/adr/0005-bundle-budget-turbopack.md together.",
  )
  process.exit(2)
}

const gzipKb = (bytes) => Math.round((bytes / 1024) * 10) / 10

/** Gzipped size of one emitted asset. Missing file = cannot measure, never 0. */
function assetBytes(file) {
  const p = join(NEXT, file.replace(/^\/_next\//, "").replace(/^\//, ""))
  if (!existsSync(p) || !statSync(p).isFile()) {
    cannotMeasure(`chunk referenced by a manifest is not on disk: ${p}`)
  }
  return gzipSync(readFileSync(p)).length
}

/** Shared client runtime for a route: the chunks every page pays for. */
function sharedChunks(appKey) {
  const perRoute = join(NEXT, "server/app", appKey, "build-manifest.json")
  const path = existsSync(perRoute) ? perRoute : join(NEXT, "build-manifest.json")
  if (!existsSync(path)) cannotMeasure(`no build-manifest.json for ${appKey}`)

  let manifest
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"))
  } catch (err) {
    cannotMeasure(`${path} is not valid JSON: ${err.message}`)
  }
  const root = manifest.rootMainFiles
  if (!Array.isArray(root) || root.length === 0) {
    cannotMeasure(
      `${path} has no rootMainFiles — cannot tell what the shared runtime is`,
    )
  }
  return root.filter((f) => f.endsWith(".js"))
}

/**
 * Route-specific client chunks, from the RSC manifest's entryJSFiles.
 * The manifest is a side-effecting script that assigns to `self.__RSC_MANIFEST`.
 */
function routeChunks(appKey) {
  const path = join(NEXT, "server/app", `${appKey}_client-reference-manifest.js`)
  if (!existsSync(path)) {
    cannotMeasure(`no client-reference-manifest for page route ${appKey}`)
  }

  globalThis.self = globalThis
  const require = createRequire(import.meta.url)
  try {
    require(join(process.cwd(), path))
  } catch (err) {
    cannotMeasure(`${path} could not be evaluated: ${err.message}`)
  }

  const raw = (globalThis.self.__RSC_MANIFEST ?? {})[appKey]
  if (!raw) cannotMeasure(`${path} did not define __RSC_MANIFEST[${appKey}]`)

  let entry
  try {
    entry = (typeof raw === "string" ? JSON.parse(raw) : raw).entryJSFiles
  } catch (err) {
    cannotMeasure(`__RSC_MANIFEST[${appKey}] is not valid JSON: ${err.message}`)
  }
  if (!entry || typeof entry !== "object") {
    cannotMeasure(`${path} has no entryJSFiles — Turbopack output shape changed`)
  }

  const chunks = new Set()
  for (const files of Object.values(entry)) {
    for (const f of files ?? []) if (f.endsWith(".js")) chunks.add(f)
  }
  return [...chunks]
}

if (!existsSync(ROUTES_MANIFEST)) {
  cannotMeasure(`${ROUTES_MANIFEST} not found. Run 'pnpm build' first.`)
}

let routes
try {
  routes = JSON.parse(readFileSync(ROUTES_MANIFEST, "utf8"))
} catch (err) {
  cannotMeasure(`${ROUTES_MANIFEST} is not valid JSON: ${err.message}`)
}

// Route handlers ship no client JS; only `/page` entries carry a first-load cost.
const pages = Object.entries(routes).filter(([key]) => key.endsWith("/page"))
if (pages.length === 0) {
  cannotMeasure(`${ROUTES_MANIFEST} lists no page routes`)
}

const failures = []
console.log(`First-load JS per route (gzip, budget ${BUDGET_KB} KB)\n`)

for (const [appKey, route] of pages.sort((a, b) => a[1].localeCompare(b[1]))) {
  const shared = sharedChunks(appKey)
  const own = routeChunks(appKey).filter((f) => !shared.includes(f))

  const sharedBytes = shared.reduce((n, f) => n + assetBytes(f), 0)
  const ownBytes = own.reduce((n, f) => n + assetBytes(f), 0)
  const kb = gzipKb(sharedBytes + ownBytes)

  const verdict = kb > BUDGET_KB ? "OVER" : "ok"
  console.log(`${verdict.padEnd(4)} ${String(kb).padStart(7)} KB  ${route}`)
  console.log(
    `        ${String(gzipKb(sharedBytes)).padStart(7)} KB  shared runtime (${shared.length} chunks)`,
  )
  console.log(
    `        ${String(gzipKb(ownBytes)).padStart(7)} KB  route-specific (${own.length} chunks)`,
  )
  for (const f of own) console.log(`                       ${f}  ${gzipKb(assetBytes(f))} KB`)
  console.log()

  if (kb > BUDGET_KB) failures.push({ route, kb })
}

if (failures.length) {
  console.error(
    `Bundle budget exceeded on ${failures.length} route(s) (limit ${BUDGET_KB} KB gzip).\n` +
      `Fix it, or raise the budget in an ADR — never silently.`,
  )
  process.exit(1)
}
console.log(`All ${pages.length} route(s) within the ${BUDGET_KB} KB gzip budget.`)
