import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { afterEach, describe, expect, it } from "vitest";

import { type Stage } from "../src/schemas/state.js";
import { type StageDefinition } from "../src/stages/registry.js";
import {
  type ValidationIssue,
  hasBlockingIssue,
  validateIdeaStage,
  validateStage,
} from "../src/lib/validate.js";

const now = "2026-05-25T00:00:00.000Z";
const slug = "contract-review-tool";

const workspaces: string[] = [];

async function makeWorkspace(): Promise<string> {
  const workspace = await mkdtemp(path.join(tmpdir(), "founder-validate-"));
  workspaces.push(workspace);
  return workspace;
}

async function writeState(
  workspace: string,
  overrides: { currentStage?: Stage } = {},
): Promise<void> {
  const ideaRoot = path.join(workspace, slug);
  await mkdir(ideaRoot, { recursive: true });
  await writeFile(
    path.join(ideaRoot, "state.json"),
    `${JSON.stringify(
      {
        ideaName: "Contract Review Tool",
        slug,
        currentStage: overrides.currentStage ?? "idea",
        createdAt: now,
        updatedAt: now,
        overrides: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeIdeaArtifact(
  workspace: string,
  artifact: string,
  overrides: { status?: "draft" | "complete"; body?: string } = {},
): Promise<void> {
  const stageRoot = path.join(workspace, slug, "idea");
  await mkdir(stageRoot, { recursive: true });
  await writeFile(
    path.join(stageRoot, `${artifact}.md`),
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

type GateCriterion = { answer: boolean | null; evidence: string[] };

async function writeIdeaGate(
  workspace: string,
  criteria: Partial<Record<string, GateCriterion>> = {},
): Promise<void> {
  const stageRoot = path.join(workspace, slug, "idea");
  await mkdir(stageRoot, { recursive: true });
  await writeFile(
    path.join(stageRoot, "GATE.md"),
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

const ideaRequired = ["problem-hypothesis", "interview-synthesis", "solution-concept"];

async function populatePassingIdea(workspace: string): Promise<void> {
  await writeState(workspace);
  for (const artifact of ideaRequired) {
    await writeIdeaArtifact(workspace, artifact);
  }
  await writeIdeaGate(workspace);
}

function codes(issues: ValidationIssue[]): string[] {
  return issues.map((issue) => issue.code).sort();
}

afterEach(async () => {
  for (const workspace of workspaces.splice(0)) {
    await rm(workspace, { recursive: true, force: true });
  }
});

describe("validateStage — idea regression pin", () => {
  it("passes a fully populated idea with zero issues (matches today)", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.stage).toBe("idea");
    expect(result.ideaSlug).toBe(slug);
  });

  it("reports each missing required artifact and the missing gate when nothing is populated", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    await mkdir(path.join(workspace, slug, "idea"), { recursive: true });

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(false);
    expect(codes(result.issues)).toEqual([
      "MISSING_ARTIFACT",
      "MISSING_ARTIFACT",
      "MISSING_ARTIFACT",
      "MISSING_GATE",
    ]);
  });

  it("flags incomplete and placeholder artifacts", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    await writeIdeaArtifact(workspace, "problem-hypothesis", {
      status: "draft",
      body: "# problem-hypothesis\n\nTODO: fill this in.\n",
    });
    await writeIdeaArtifact(workspace, "interview-synthesis");
    await writeIdeaArtifact(workspace, "solution-concept");
    await writeIdeaGate(workspace);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(false);
    const problemIssues = result.issues.filter((issue) => issue.artifact === "problem-hypothesis");
    expect(problemIssues.map((issue) => issue.code).sort()).toEqual([
      "INCOMPLETE_ARTIFACT",
      "PLACEHOLDER_ARTIFACT",
    ]);
  });

  it("flags an unanswered gate criterion", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace, {
      problem_real_specific: { answer: null, evidence: ["problem-hypothesis.md#specific-problem"] },
    });

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "GATE_CRITERION_UNANSWERED", criterion: "problem_real_specific" }),
    );
  });

  it("flags a passing gate criterion with no evidence", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace, {
      solution_addresses_actual_problem: { answer: true, evidence: [] },
    });

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "GATE_EVIDENCE_MISSING",
        criterion: "solution_addresses_actual_problem",
      }),
    );
  });

  it("flags gate evidence pointing at a missing artifact", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace, {
      enough_signal_to_build: { answer: true, evidence: ["missing-artifact.md#signal"] },
    });

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "GATE_EVIDENCE_TARGET_MISSING",
        criterion: "enough_signal_to_build",
      }),
    );
  });

  it("treats empty, anchor-only, and out-of-set evidence as a missing evidence target", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace, {
      problem_real_specific: { answer: true, evidence: [""] },
      solution_addresses_actual_problem: { answer: true, evidence: ["#solution-fit"] },
      enough_signal_to_build: { answer: true, evidence: ["../../package.json"] },
    });

    const result = await validateStage(workspace, slug, "idea");

    const targetMissing = result.issues.filter((issue) => issue.code === "GATE_EVIDENCE_TARGET_MISSING");
    expect(targetMissing.map((issue) => issue.criterion).sort()).toEqual([
      "enough_signal_to_build",
      "problem_real_specific",
      "solution_addresses_actual_problem",
    ]);
  });

  it("flags a state mismatch when state.json disagrees with the checked stage", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace, { currentStage: "mvp" });
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "STATE_STAGE_MISMATCH" }),
    );
  });
});

describe("validateStage — malformed-input fault paths", () => {
  it("surfaces unparseable artifact frontmatter as INVALID_ARTIFACT, not a crash", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);
    await writeFile(
      path.join(workspace, slug, "idea", "problem-hypothesis.md"),
      "---\nartifact: problem-hypothesis\nstatus: [\n---\n# Broken\n",
      "utf8",
    );

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_ARTIFACT", artifact: "problem-hypothesis" }),
    );
  });

  it("surfaces malformed GATE.md as INVALID_GATE, not a crash", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeFile(path.join(workspace, slug, "idea", "GATE.md"), "---\ncriteria: [\n---\n# Broken\n", "utf8");

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(expect.objectContaining({ code: "INVALID_GATE" }));
  });

  it("surfaces an invalid state.json as INVALID_STATE, not a crash", async () => {
    const workspace = await makeWorkspace();
    await mkdir(path.join(workspace, slug, "idea"), { recursive: true });
    await writeFile(path.join(workspace, slug, "state.json"), "{", "utf8");
    for (const artifact of ideaRequired) {
      await writeIdeaArtifact(workspace, artifact);
    }
    await writeIdeaGate(workspace);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.issues).toContainEqual(expect.objectContaining({ code: "INVALID_STATE" }));
  });

  it("returns STAGE_DIRECTORY_MISSING and stops when the stage directory is absent", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "STAGE_DIRECTORY_MISSING" }));
    // Stops before the artifact/gate loops.
    expect(result.issues.some((issue) => issue.code === "MISSING_ARTIFACT")).toBe(false);
    expect(result.issues.some((issue) => issue.code === "NO_GATE_DEFINED")).toBe(false);
  });
});

describe("validateStage — ungated stage emits NO_GATE_DEFINED", () => {
  it("returns exactly one NO_GATE_DEFINED issue for a correctly-staged mvp with an empty gate set", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace, { currentStage: "mvp" });
    await mkdir(path.join(workspace, slug, "mvp"), { recursive: true });

    const result = await validateStage(workspace, slug, "mvp");

    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: "NO_GATE_DEFINED",
      severity: "error",
    });
    expect(result.issues[0].message).toContain("mvp");
    // No trivial pass, no spurious mismatch.
    expect(result.issues.some((issue) => issue.code === "STATE_STAGE_MISMATCH")).toBe(false);
  });
});

describe("validateStage — registry-driven gate criteria (dependency injection)", () => {
  const customStage: StageDefinition = {
    required: [],
    recommended: [],
    gateCriteria: ["custom_key_alpha", "custom_key_beta"],
  };

  const customRegistry = {
    idea: {
      required: [] as never[],
      recommended: [] as never[],
      gateCriteria: [] as string[],
    },
    mvp: customStage,
    launch: { required: [] as never[], recommended: [] as never[], gateCriteria: [] as string[] },
    scale: { required: [] as never[], recommended: [] as never[], gateCriteria: [] as string[] },
  } as const;

  async function writeCustomGate(
    workspace: string,
    stage: Stage,
    criteria: Record<string, GateCriterion>,
  ): Promise<void> {
    const stageRoot = path.join(workspace, slug, stage);
    await mkdir(stageRoot, { recursive: true });
    await writeFile(
      path.join(stageRoot, "GATE.md"),
      matter.stringify("# Custom Gate\n\nEvidence.\n", {
        status: "complete",
        override: null,
        criteria,
      }),
      "utf8",
    );
  }

  it("demands the injected criteria keys, treating an absent expected key as unanswered", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace, { currentStage: "mvp" });
    // Gate answers only one of the two expected keys; the other is absent.
    await writeCustomGate(workspace, "mvp", {
      custom_key_alpha: { answer: true, evidence: ["#anchor"] },
    });

    const result = await validateStage(workspace, slug, "mvp", customRegistry);

    expect(result.ok).toBe(false);
    // The absent expected key must be demanded.
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "GATE_CRITERION_UNANSWERED", criterion: "custom_key_beta" }),
    );
    // It must NOT silently validate against idea's hard-coded keys.
    expect(result.issues.some((issue) => issue.criterion === "problem_real_specific")).toBe(false);
  });

  it("passes when every injected criteria key is answered with valid evidence", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace, { currentStage: "mvp" });
    await writeIdeaArtifact(workspace, "problem-hypothesis"); // a real .md the evidence can point at
    // Re-place that artifact under mvp/ so the evidence target resolves.
    const mvpRoot = path.join(workspace, slug, "mvp");
    await mkdir(mvpRoot, { recursive: true });
    await writeFile(
      path.join(mvpRoot, "problem-hypothesis.md"),
      matter.stringify("# evidence\n\nbody\n", {
        artifact: "problem-hypothesis",
        stage: "idea",
        status: "complete",
        updated: now,
        evidence: [],
      }),
      "utf8",
    );

    const registryWithEvidence = {
      ...customRegistry,
      mvp: {
        required: [] as never[],
        recommended: ["problem-hypothesis"] as string[],
        gateCriteria: ["custom_key_alpha", "custom_key_beta"],
      },
    } as const;

    await writeCustomGate(workspace, "mvp", {
      custom_key_alpha: { answer: true, evidence: ["problem-hypothesis.md#a"] },
      custom_key_beta: { answer: true, evidence: ["problem-hypothesis.md#b"] },
    });

    const result = await validateStage(workspace, slug, "mvp", registryWithEvidence);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("validateStage — evidenceTargets derived per-call from the registry", () => {
  it("validates gate evidence against the injected stage's recommended/required set, not idea's", async () => {
    const workspace = await makeWorkspace();
    await writeState(workspace, { currentStage: "mvp" });
    const mvpRoot = path.join(workspace, slug, "mvp");
    await mkdir(mvpRoot, { recursive: true });
    // A file named after an idea artifact must NOT be a valid evidence target for mvp,
    // because mvp's registry set does not include it.
    await writeFile(
      path.join(mvpRoot, "problem-hypothesis.md"),
      matter.stringify("# evidence\n\nbody\n", {
        artifact: "problem-hypothesis",
        stage: "idea",
        status: "complete",
        updated: now,
        evidence: [],
      }),
      "utf8",
    );
    await writeFile(
      path.join(mvpRoot, "GATE.md"),
      matter.stringify("# Gate\n\nbody\n", {
        status: "complete",
        override: null,
        criteria: {
          mvp_key: { answer: true, evidence: ["problem-hypothesis.md#a"] },
        },
      }),
      "utf8",
    );

    const registry = {
      idea: { required: [] as never[], recommended: [] as never[], gateCriteria: [] as string[] },
      mvp: {
        required: [] as never[],
        recommended: [] as never[], // empty — so problem-hypothesis.md is NOT a valid target
        gateCriteria: ["mvp_key"],
      },
      launch: { required: [] as never[], recommended: [] as never[], gateCriteria: [] as string[] },
      scale: { required: [] as never[], recommended: [] as never[], gateCriteria: [] as string[] },
    } as const;

    const result = await validateStage(workspace, slug, "mvp", registry);

    // The evidence file exists on disk but is outside mvp's per-call evidenceTargets set.
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "GATE_EVIDENCE_TARGET_MISSING", criterion: "mvp_key" }),
    );
  });
});

describe("validateStage — non-blocking warning tier", () => {
  async function writeArtifactWithEvidence(
    workspace: string,
    artifact: string,
    evidence: { label: string; url?: string; claims: string[] }[],
  ): Promise<void> {
    const stageRoot = path.join(workspace, slug, "idea");
    await mkdir(stageRoot, { recursive: true });
    await writeFile(
      path.join(stageRoot, `${artifact}.md`),
      matter.stringify(`# ${artifact}\n\nSpecific customer evidence with concrete details.\n`, {
        artifact,
        stage: "idea",
        status: "complete",
        updated: now,
        evidence,
      }),
      "utf8",
    );
  }

  it("emits PLACEHOLDER_WARNING (warning) for a partial-placeholder body and stays ok: true", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);
    await writeIdeaArtifact(workspace, "problem-hypothesis", {
      body: "# problem-hypothesis\n\nReal concrete finding from interviews.\n\nTODO: add more detail.\n",
    });

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "PLACEHOLDER_WARNING",
        artifact: "problem-hypothesis",
        severity: "warning",
      }),
    );
    expect(result.issues.some((issue) => issue.code === "PLACEHOLDER_ARTIFACT")).toBe(false);
  });

  it("emits EVIDENCE_NO_CLAIMS (warning) when evidence entries exist but all lack claims, staying ok: true", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);
    await writeArtifactWithEvidence(workspace, "problem-hypothesis", [
      { label: "User interview notes", claims: [] },
      { label: "Survey export", url: "https://example.com/survey", claims: [] },
    ]);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "EVIDENCE_NO_CLAIMS",
        artifact: "problem-hypothesis",
        severity: "warning",
      }),
    );
  });

  it("does NOT emit EVIDENCE_NO_CLAIMS when at least one evidence entry carries a claim", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);
    await writeArtifactWithEvidence(workspace, "problem-hypothesis", [
      { label: "User interview notes", claims: ["3 of 5 users hit the problem weekly"] },
      { label: "Survey export", claims: [] },
    ]);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.code === "EVIDENCE_NO_CLAIMS")).toBe(false);
  });

  it("does NOT emit EVIDENCE_NO_CLAIMS for an empty evidence array (regression guard for the toEqual([]) pins)", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);
    await writeArtifactWithEvidence(workspace, "problem-hypothesis", []);

    const result = await validateStage(workspace, slug, "idea");

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("hasBlockingIssue / ok ignores warnings", () => {
  it("treats a list with an error-severity issue as blocking", () => {
    const issues: ValidationIssue[] = [
      { code: "MISSING_GATE", message: "x", severity: "warning" },
      { code: "MISSING_ARTIFACT", message: "y", severity: "error" },
    ];
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("treats a warning-only list as non-blocking", () => {
    const issues: ValidationIssue[] = [
      { code: "MISSING_GATE", message: "x", severity: "warning" },
    ];
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("treats an empty list as non-blocking", () => {
    expect(hasBlockingIssue([])).toBe(false);
  });
});

describe("validateIdeaStage alias", () => {
  it("delegates to validateStage with the idea stage", async () => {
    const workspace = await makeWorkspace();
    await populatePassingIdea(workspace);

    const result = await validateIdeaStage(workspace, slug);

    expect(result.ok).toBe(true);
    expect(result.stage).toBe("idea");
  });
});
