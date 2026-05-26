import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";

describe("founder init", () => {
  it("creates an idempotent workspace with the surfaces reference", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-init-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["init", "--workspace", workspace])).toBe(0);
    const surfacesPath = path.join(workspace, "_reference", "surfaces.md");
    const firstSeed = await readFile(surfacesPath, "utf8");

    expect(await main(["init", "--workspace", workspace])).toBe(0);
    const secondSeed = await readFile(surfacesPath, "utf8");

    expect(firstSeed).toContain("# Founder Journey Surfaces");
    expect(secondSeed).toBe(firstSeed);
    expect(log).toHaveBeenCalledWith(`Initialized founder workspace at ${workspace}`);
  });
});
