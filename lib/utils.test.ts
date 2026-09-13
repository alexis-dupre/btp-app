import { describe, expect, it } from "vitest"

import { cn } from "./utils"

// cn() is the single place class names are composed, so every component's styling
// depends on these semantics. The behaviour that matters is Tailwind-aware conflict
// resolution — plain concatenation would leave both classes and let source order in the
// stylesheet decide, which is exactly the bug this helper exists to prevent.
describe("cn", () => {
  it("keeps the last of two conflicting utilities so overrides win", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("treats a different property as non-conflicting and keeps both", () => {
    expect(cn("px-2", "text-sm")).toBe("px-2 text-sm")
  })

  it("does not let a variant-prefixed class conflict with the bare one", () => {
    // hover:p-2 only applies on hover, so it must survive alongside p-4.
    expect(cn("hover:p-2", "p-4")).toBe("hover:p-2 p-4")
  })

  it("applies object keys only when their value is truthy", () => {
    expect(cn("base", { active: true, off: false })).toBe("base active")
  })

  it("drops falsy entries instead of emitting empty or 'false' classes", () => {
    expect(cn(["a", null, undefined, false, "b"])).toBe("a b")
  })

  it("collapses a repeated class to one occurrence", () => {
    expect(cn("flex", "flex")).toBe("flex")
  })

  it("returns an empty string for no input, never undefined", () => {
    // Callers spread this straight into className, where undefined would render as "undefined".
    expect(cn()).toBe("")
  })
})
