import { describe, expect, it } from "vitest";

import { hasPartialPlaceholderBody, isPlaceholderBody } from "../src/lib/placeholder.js";

describe("isPlaceholderBody — semantics unchanged", () => {
  it("treats an all-placeholder body as placeholder", () => {
    expect(isPlaceholderBody("# Heading\n\nTODO\n\nTBD: later\n")).toBe(true);
  });

  it("treats an empty body (headings/dividers only) as placeholder", () => {
    expect(isPlaceholderBody("# Heading\n\n---\n")).toBe(true);
  });

  it("treats a body with any real content line as NOT placeholder", () => {
    expect(isPlaceholderBody("# Heading\n\nSpecific customer evidence with concrete details.\n")).toBe(false);
  });

  it("treats a partial body (some placeholder, some real) as NOT fully placeholder", () => {
    expect(
      isPlaceholderBody("# Heading\n\nReal concrete finding from interviews.\n\nTODO: add more.\n"),
    ).toBe(false);
  });
});

describe("hasPartialPlaceholderBody", () => {
  it("returns false for 0% placeholder (no placeholder content lines)", () => {
    expect(
      hasPartialPlaceholderBody("# Heading\n\nReal finding one.\n\nReal finding two.\n"),
    ).toBe(false);
  });

  it("returns true when SOME but NOT ALL content lines are placeholder", () => {
    expect(
      hasPartialPlaceholderBody("# Heading\n\nReal concrete finding from interviews.\n\nTODO: add more.\n"),
    ).toBe(true);
  });

  it("returns false for 100% placeholder content lines", () => {
    expect(hasPartialPlaceholderBody("# Heading\n\nTODO\n\nTBD: later\n")).toBe(false);
  });

  it("returns false for an empty body (no content lines)", () => {
    expect(hasPartialPlaceholderBody("# Heading\n\n---\n")).toBe(false);
  });
});
