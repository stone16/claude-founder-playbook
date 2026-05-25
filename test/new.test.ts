import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { StateSchema } from "../src/schemas/state.js";
import { stageManifest } from "../src/stages/idea.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("founder new", () => {
  it("creates an idea workspace with all Idea templates, state.json, and .active", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-new-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["new", "Contract Review Tool", "--workspace", workspace])).toBe(0);

    const ideaRoot = path.join(workspace, "contract-review-tool");
    const ideaStage = path.join(ideaRoot, "idea");
    const templates = [...stageManifest.idea.required, ...stageManifest.idea.recommended];

    await expect(readFile(path.join(workspace, ".active"), "utf8")).resolves.toBe("contract-review-tool\n");
    for (const artifact of templates) {
      await expect(pathExists(path.join(ideaStage, `${artifact}.md`))).resolves.toBe(true);
    }
    await expect(pathExists(path.join(ideaStage, "GATE.md"))).resolves.toBe(true);

    const state = StateSchema.parse(JSON.parse(await readFile(path.join(ideaRoot, "state.json"), "utf8")));
    expect(state).toMatchObject({
      ideaName: "Contract Review Tool",
      slug: "contract-review-tool",
      currentStage: "idea",
      overrides: [],
    });
  });

  it("leaves an existing idea intact and rejects a duplicate with a typed error", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-new-"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["new", "Contract Review Tool", "--workspace", workspace])).toBe(0);
    const firstStatePath = path.join(workspace, "contract-review-tool", "state.json");
    const firstState = await readFile(firstStatePath, "utf8");

    expect(await main(["new", "Another Tool", "--workspace", workspace])).toBe(0);
    await expect(pathExists(path.join(workspace, "another-tool", "idea", "GATE.md"))).resolves.toBe(true);
    await expect(readFile(firstStatePath, "utf8")).resolves.toBe(firstState);

    expect(await main(["new", "Contract Review Tool", "--workspace", workspace])).toBe(1);
    await expect(readFile(firstStatePath, "utf8")).resolves.toBe(firstState);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("IDEA_EXISTS"));
  });

  it("rejects an idea name that cannot produce a slug with a typed error", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-new-"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["new", "!!!", "--workspace", workspace])).toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("INVALID_IDEA_NAME"));
  });
});
