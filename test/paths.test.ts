import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveWorkspaceRoot } from "../src/lib/paths.js";

describe("resolveWorkspaceRoot", () => {
  const cwd = path.resolve("/tmp/founder-project");

  it("uses founder-journey in the current directory by default", () => {
    expect(resolveWorkspaceRoot({ cwd, env: {} })).toBe(path.join(cwd, "founder-journey"));
  });

  it("falls back to process defaults when no input is provided", () => {
    expect(resolveWorkspaceRoot()).toBe(path.join(process.cwd(), "founder-journey"));
  });

  it("uses FOUNDER_JOURNEY when no explicit workspace flag is present", () => {
    expect(resolveWorkspaceRoot({ cwd, env: { FOUNDER_JOURNEY: "journeys" } })).toBe(
      path.join(cwd, "journeys"),
    );
  });

  it("lets --workspace override FOUNDER_JOURNEY", () => {
    expect(
      resolveWorkspaceRoot({
        argv: ["--workspace", "/var/tmp/explicit"],
        cwd,
        env: { FOUNDER_JOURNEY: "/var/tmp/env" },
      }),
    ).toBe("/var/tmp/explicit");
  });

  it("supports --workspace=value syntax", () => {
    expect(resolveWorkspaceRoot({ argv: ["--workspace=custom"], cwd, env: {} })).toBe(
      path.join(cwd, "custom"),
    );
  });

  it("treats an empty --workspace= value as absent", () => {
    expect(resolveWorkspaceRoot({ argv: ["--workspace="], cwd, env: {} })).toBe(
      path.join(cwd, "founder-journey"),
    );
  });

  it("treats a whitespace-only --workspace value as absent", () => {
    expect(resolveWorkspaceRoot({ argv: ["--workspace", "  "], cwd, env: {} })).toBe(
      path.join(cwd, "founder-journey"),
    );
  });

  it("treats an empty FOUNDER_JOURNEY value as absent", () => {
    expect(resolveWorkspaceRoot({ cwd, env: { FOUNDER_JOURNEY: "" } })).toBe(
      path.join(cwd, "founder-journey"),
    );
  });

  it("treats a whitespace-only FOUNDER_JOURNEY value as absent", () => {
    expect(resolveWorkspaceRoot({ cwd, env: { FOUNDER_JOURNEY: "  " } })).toBe(
      path.join(cwd, "founder-journey"),
    );
  });

  it("ignores unrelated arguments while resolving workspace configuration", () => {
    expect(resolveWorkspaceRoot({ argv: ["new", "Idea"], cwd, env: {} })).toBe(
      path.join(cwd, "founder-journey"),
    );
  });
});
