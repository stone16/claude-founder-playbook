import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { stageManifest } from "../src/stages/idea.js";

const now = "2026-05-25T00:00:00.000Z";

async function createWorkspace(prefix: string): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), prefix));
}

function ideaPath(workspace: string, slug: string): string {
  return path.join(workspace, slug, "idea");
}

async function completeRequiredArtifacts(workspace: string, slug: string): Promise<void> {
  for (const artifact of stageManifest.idea.required) {
    await writeFile(
      path.join(ideaPath(workspace, slug), `${artifact}.md`),
      matter.stringify(`# ${artifact}\n\nSpecific customer evidence with concrete details.\n`, {
        artifact,
        stage: "idea",
        status: "complete",
        updated: now,
        evidence: [],
      }),
      "utf8",
    );
  }
}

async function writePartialGate(workspace: string, slug: string): Promise<void> {
  await writeFile(
    path.join(ideaPath(workspace, slug), "GATE.md"),
    matter.stringify("# Idea Gate\n\nEvidence-backed gate decision.\n", {
      status: "complete",
      override: null,
      criteria: {
        problem_real_specific: {
          answer: true,
          evidence: ["problem-hypothesis.md#specific-problem"],
        },
        solution_addresses_actual_problem: {
          answer: true,
          evidence: ["solution-concept.md#solution-fit"],
        },
        enough_signal_to_build: {
          answer: null,
          evidence: [],
        },
      },
    }),
    "utf8",
  );
}

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("founder list", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enumerates multiple ideas with stage and gate summary tokens", async () => {
    const workspace = await createWorkspace("founder-list-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    await main(["new", "Customer Interview Coach", "--workspace", workspace]);
    await completeRequiredArtifacts(workspace, "customer-interview-coach");
    await writePartialGate(workspace, "customer-interview-coach");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["list", "--workspace", workspace])).toBe(0);

    const output = consoleOutput(log);
    expect(output).toContain("contract-review-tool");
    expect(output).toContain("idea");
    expect(output).toContain("0/3 ✗");
    expect(output).toContain("customer-interview-coach");
    expect(output).toContain("2/3 ✗");
    expect(output).toContain("blocked: enough_signal_to_build");
  });

  it("prints an empty portfolio message when the workspace has no ideas", async () => {
    const workspace = await createWorkspace("founder-list-empty-");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["list", "--workspace", workspace])).toBe(0);

    expect(consoleOutput(log)).toContain("No founder ideas found.");
  });

  it("keeps listing valid ideas when one idea has invalid state", async () => {
    const workspace = await createWorkspace("founder-list-invalid-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    await mkdir(path.join(workspace, "broken-idea"));
    await writeFile(path.join(workspace, "broken-idea", "state.json"), "{", "utf8");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["list", "--workspace", workspace])).toBe(0);

    const output = consoleOutput(log);
    expect(output).toContain("contract-review-tool");
    expect(output).toContain("broken-idea  invalid  invalid blocked: invalid state");
  });
});
