import { mkdtemp, writeFile } from "node:fs/promises";
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

function ideaPath(workspace: string): string {
  return path.join(workspace, "contract-review-tool", "idea");
}

async function populatePassingIdea(workspace: string): Promise<void> {
  for (const artifact of stageManifest.idea.required) {
    await writeFile(
      path.join(ideaPath(workspace), `${artifact}.md`),
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

  await writeFile(
    path.join(ideaPath(workspace), "GATE.md"),
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
          answer: true,
          evidence: ["interview-synthesis.md#signal"],
        },
      },
    }),
    "utf8",
  );
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

  it("prints a passing gate token without blocking items", async () => {
    const workspace = await createWorkspace("founder-status-pass-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    await populatePassingIdea(workspace);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["status", "contract-review-tool", "--workspace", workspace])).toBe(0);

    const output = consoleOutput(log);
    expect(output).toContain("Gate: 3/3 ✓");
    expect(output).toContain("✓ problem-hypothesis.md");
    expect(output).not.toContain("Blocking:");
  });

  it("reports a non-numeric gate and a no-artifacts note for an advanced empty-gate stage", async () => {
    const workspace = await createWorkspace("founder-status-mvp-");
    await main(["new", "Contract Review Tool", "--workspace", workspace]);
    expect(
      await main([
        "advance",
        "contract-review-tool",
        "--override",
        "Founder accepts the risk to run a concierge MVP.",
        "--workspace",
        workspace,
      ]),
    ).toBe(0);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["status", "contract-review-tool", "--workspace", workspace])).toBe(0);

    const output = consoleOutput(log);
    expect(output).toContain("Stage: mvp");
    expect(output).toContain("Gate: no gate");
    expect(output).toContain("(no required artifacts for this stage yet)");
    expect(output).not.toContain("n/a");
    expect(output).not.toContain("NO_GATE_DEFINED");
    expect(output).not.toContain("Blocking:");
  });

  it("errors clearly when no idea exists and no idea argument is provided", async () => {
    const workspace = await createWorkspace("founder-status-missing-");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["status", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("No founder idea selected or created");
    expect(consoleOutput(error)).toContain("founder new");
  });
});
