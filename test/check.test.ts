import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { stageManifest } from "../src/stages/idea.js";

const now = "2026-05-25T00:00:00.000Z";

function ideaPath(workspace: string, slug = "contract-review-tool"): string {
  return path.join(workspace, slug, "idea");
}

async function createScaffoldedIdea(): Promise<string> {
  const workspace = await mkdtemp(path.join(tmpdir(), "founder-check-"));
  await main(["new", "Contract Review Tool", "--workspace", workspace]);
  return workspace;
}

async function writeArtifact(
  workspace: string,
  artifact: (typeof stageManifest.idea.required)[number],
  overrides: { status?: "draft" | "complete"; body?: string } = {},
): Promise<void> {
  await writeFile(
    path.join(ideaPath(workspace), `${artifact}.md`),
    matter.stringify(overrides.body ?? `# ${artifact}\n\nSpecific customer evidence with concrete details.\n`, {
      artifact,
      stage: "idea",
      status: overrides.status ?? "complete",
      updated: now,
      evidence: [],
    }),
    "utf8",
  );
}

async function populateRequiredArtifacts(workspace: string): Promise<void> {
  for (const artifact of stageManifest.idea.required) {
    await writeArtifact(workspace, artifact);
  }
}

async function writeGate(
  workspace: string,
  criteria: {
    problem_real_specific?: { answer: boolean | null; evidence: string[] };
    solution_addresses_actual_problem?: { answer: boolean | null; evidence: string[] };
    enough_signal_to_build?: { answer: boolean | null; evidence: string[] };
  } = {},
): Promise<void> {
  await writeFile(
    path.join(ideaPath(workspace), "GATE.md"),
    matter.stringify("# Idea Gate\n\nEvidence-backed gate decision.\n", {
      status: "complete",
      override: null,
      criteria: {
        problem_real_specific: {
          answer: true,
          evidence: ["problem-hypothesis.md#specific-problem"],
          ...criteria.problem_real_specific,
        },
        solution_addresses_actual_problem: {
          answer: true,
          evidence: ["solution-concept.md#solution-fit"],
          ...criteria.solution_addresses_actual_problem,
        },
        enough_signal_to_build: {
          answer: true,
          evidence: ["interview-synthesis.md#signal"],
          ...criteria.enough_signal_to_build,
        },
      },
    }),
    "utf8",
  );
}

async function populatePassingIdea(workspace: string): Promise<void> {
  await populateRequiredArtifacts(workspace);
  await writeGate(workspace);
}

function consoleErrors(): string {
  return vi.mocked(console.error).mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("founder check", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails on a freshly scaffolded idea and reports each incomplete required artifact", async () => {
    const workspace = await createScaffoldedIdea();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    const errors = consoleErrors();
    for (const artifact of stageManifest.idea.required) {
      expect(errors).toContain(artifact);
    }
    expect(errors).toContain("draft");
    expect(errors).toContain("placeholder");
  });

  it("fails when a gate criterion is unanswered", async () => {
    const workspace = await createScaffoldedIdea();
    await populateRequiredArtifacts(workspace);
    await writeGate(workspace, {
      problem_real_specific: { answer: null, evidence: ["problem-hypothesis.md#specific-problem"] },
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("problem_real_specific");
    expect(consoleErrors()).toContain("answer");
  });

  it("fails when a passing gate criterion has no evidence", async () => {
    const workspace = await createScaffoldedIdea();
    await populateRequiredArtifacts(workspace);
    await writeGate(workspace, {
      solution_addresses_actual_problem: { answer: true, evidence: [] },
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("solution_addresses_actual_problem");
    expect(consoleErrors()).toContain("evidence");
  });

  it("fails when gate evidence points to a missing artifact", async () => {
    const workspace = await createScaffoldedIdea();
    await populateRequiredArtifacts(workspace);
    await writeGate(workspace, {
      enough_signal_to_build: { answer: true, evidence: ["missing-artifact.md#signal"] },
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("missing-artifact.md#signal");
    expect(consoleErrors()).toContain("missing artifact");
  });

  it("fails when gate evidence is empty, anchor-only, or outside the Idea artifact set", async () => {
    const workspace = await createScaffoldedIdea();
    await populateRequiredArtifacts(workspace);
    await writeGate(workspace, {
      problem_real_specific: { answer: true, evidence: [""] },
      solution_addresses_actual_problem: { answer: true, evidence: ["#solution-fit"] },
      enough_signal_to_build: { answer: true, evidence: ["../../package.json"] },
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    const errors = consoleErrors();
    expect(errors).toContain("problem_real_specific");
    expect(errors).toContain("solution_addresses_actual_problem");
    expect(errors).toContain("enough_signal_to_build");
    expect(errors).toContain("missing artifact");
  });

  it("checks the stage recorded in state.json and reports NO_GATE_DEFINED for an ungated stage", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    // Drive the real flow to mvp so currentStage === "mvp" AND mvp/ exists on disk.
    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(0);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    const errors = consoleErrors();
    expect(errors).toContain("NO_GATE_DEFINED");
    // The old hardcoded-"idea" mismatch path must not fire: check now reads currentStage.
    expect(errors).not.toContain("STATE_STAGE_MISMATCH");
    expect(errors).not.toContain("currentStage is");
  });

  it("passes for a populated idea with complete required artifacts and evidenced gate criteria", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(0);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("CHECK PASSED"));
  });

  it("surfaces corrupt artifact frontmatter as a typed validation error", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    await writeFile(
      path.join(ideaPath(workspace), "problem-hypothesis.md"),
      "---\nartifact: problem-hypothesis\nstatus: [\n---\n# Broken\n",
      "utf8",
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("INVALID_ARTIFACT");
    expect(consoleErrors()).toContain("problem-hypothesis");
  });

  it("surfaces malformed GATE.md as a typed validation error", async () => {
    const workspace = await createScaffoldedIdea();
    await populateRequiredArtifacts(workspace);
    await writeFile(path.join(ideaPath(workspace), "GATE.md"), "---\ncriteria: [\n---\n# Broken\n", "utf8");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("INVALID_GATE");
    expect(consoleErrors()).toContain("GATE.md");
  });

  it("fails when the checked stage directory is missing from disk", async () => {
    const workspace = await createScaffoldedIdea();
    await rm(ideaPath(workspace), { recursive: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["check", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleErrors()).toContain("missing stage directory");
    expect(consoleErrors()).toContain("idea");
  });
});
