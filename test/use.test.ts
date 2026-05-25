import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";

describe("founder use", () => {
  it("updates .active to a known idea slug", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-use-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    await main(["new", "Another Tool", "--workspace", workspace]);

    expect(await main(["use", "contract-review-tool", "--workspace", workspace])).toBe(0);

    await expect(readFile(path.join(workspace, ".active"), "utf8")).resolves.toBe("contract-review-tool\n");
  });

  it("returns a typed error for an unknown idea slug", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-use-"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["use", "missing-idea", "--workspace", workspace])).toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("UNKNOWN_IDEA"));
  });
});
