import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { stageManifest } from "../src/stages/idea.js";

async function createWorkspace(prefix: string): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), prefix));
}

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("founder status", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints an artifact checklist with blocking items for a scaffolded idea", async () => {
    const workspace = await createWorkspace("founder-status-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["status", "contract-review-tool", "--workspace", workspace])).toBe(0);

    const output = consoleOutput(log);
    expect(output).toContain("Idea: contract-review-tool");
    expect(output).toContain("Stage: idea");
    expect(output).toContain("Gate: 0/3 ✗");
    for (const artifact of stageManifest.idea.required) {
      expect(output).toContain(`✗ ${artifact}.md`);
    }
    expect(output).toContain("Blocking:");
    expect(output).toContain("problem-hypothesis: status is draft");
  });

  it("uses the active idea when no idea argument is provided", async () => {
    const workspace = await createWorkspace("founder-status-active-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["status", "--workspace", workspace])).toBe(0);

    expect(consoleOutput(log)).toContain("Idea: contract-review-tool");
  });

  it("errors clearly when no idea exists and no idea argument is provided", async () => {
    const workspace = await createWorkspace("founder-status-missing-");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["status", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("No founder idea selected or created");
    expect(consoleOutput(error)).toContain("founder new");
  });
});
