import { describe, expect, it } from "vitest";

import { slugify } from "../src/lib/slugify.js";

describe("slugify", () => {
  it("lowercases mixed-case input and hyphenates whitespace", () => {
    expect(slugify("Contract Review Tool")).toBe("contract-review-tool");
    expect(slugify("  Multi   Space\tName  ")).toBe("multi-space-name");
  });

  it("strips punctuation and unsafe characters", () => {
    expect(slugify("AI/R&D: Founder? Toolkit!")).toBe("aird-founder-toolkit");
  });

  it("normalizes non-ASCII characters before removing unsafe leftovers", () => {
    expect(slugify("Crème Brûlée 世界")).toBe("creme-brulee");
  });
});
