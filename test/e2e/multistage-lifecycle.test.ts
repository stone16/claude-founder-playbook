import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { beforeAll, describe, expect, it } from "vitest";

import { type FounderState, StateSchema } from "../../src/schemas/state.js";
import { stageManifest } from "../../src/stages/idea.js";

const cliPath = path.join(process.cwd(), "dist", "cli.js");
const now = "2026-05-25T00:00:00.000Z";

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function buildCli(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("npm", ["run", "build"], { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error === null) {
        resolve();
        return;
      }

      reject(new Error([stdout, stderr].filter((output) => output.length > 0).join("\n")));
    });
  });
}

function runFounder(args: readonly string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(process.execPath, [cliPath, ...args], { cwd: process.cwd() }, (error, stdout, stderr) => {
      const code =
        error !== null && typeof error === "object" && "code" in error && typeof error.code === "number"
          ? error.code
          : 0;
      resolve({ code, stdout, stderr });
    });
  });
}

function ideaRoot(workspace: string, slug: string): string {
  return path.join(workspace, slug);
}

function ideaStageRoot(workspace: string, slug: string): string {
  return path.join(ideaRoot(workspace, slug), "idea");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readState(workspace: string, slug: string): Promise<FounderState> {
  return StateSchema.parse(JSON.parse(await readFile(path.join(ideaRoot(workspace, slug), "state.json"), "utf8")));
}

async function completeRequiredArtifactsFromTemplates(workspace: string, slug: string): Promise<void> {
  for (const artifact of stageManifest.idea.required) {
    const artifactPath = path.join(ideaStageRoot(workspace, slug), `${artifact}.md`);
    const document = matter(await readFile(artifactPath, "utf8"));

    await writeFile(
      artifactPath,
      matter.stringify(
        document.content.replace(/\bTBD\b/g, `Specific evidence for ${artifact} from customer and market work.`),
        {
          ...document.data,
          status: "complete",
          updated: now,
          evidence: [],
        },
      ),
      "utf8",
    );
  }
}

async function answerGateWithLinkedEvidence(workspace: string, slug: string): Promise<void> {
  const gatePath = path.join(ideaStageRoot(workspace, slug), "GATE.md");
  const document = matter(await readFile(gatePath, "utf8"));

  await writeFile(
    gatePath,
    matter.stringify(document.content.replace(/\bTBD\b/g, "Answered with evidence linked to required artifacts."), {
      ...document.data,
      status: "complete",
      criteria: {
        problem_real_specific: {
          answer: true,
          evidence: ["problem-hypothesis.md#problem"],
        },
        solution_addresses_actual_problem: {
          answer: true,
          evidence: ["solution-concept.md#solution"],
        },
        enough_signal_to_build: {
          answer: true,
          evidence: ["interview-synthesis.md#interview-synthesis"],
        },
      },
    }),
    "utf8",
  );
}

async function populatePassingIdea(workspace: string, slug: string): Promise<void> {
  await completeRequiredArtifactsFromTemplates(workspace, slug);
  await answerGateWithLinkedEvidence(workspace, slug);
}

describe("Multi-stage lifecycle e2e", () => {
  beforeAll(async () => {
    await buildCli();
  }, 30_000);

  it("threads init through the post-Idea cliff (mvp/launch) without state corruption", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-multistage-e2e-"));
    const slug = "kb-agent";

    // 1. init -> new -> populate idea artifacts + gate with structured evidence -> check PASSES.
    const init = await runFounder(["init", "--workspace", workspace]);
    expect(init).toMatchObject({ code: 0 });
    await expect(pathExists(path.join(workspace, "_reference", "surfaces.md"))).resolves.toBe(true);

    const created = await runFounder(["new", "KB Agent", "--workspace", workspace]);
    expect(created).toMatchObject({ code: 0 });
    expect(created.stdout).toContain(slug);

    await populatePassingIdea(workspace, slug);

    const ideaCheck = await runFounder(["check", slug, "--workspace", workspace]);
    expect(ideaCheck.code).toBe(0);
    expect(ideaCheck.stdout).toContain("CHECK PASSED");

    // 2. advance (met idea gate) -> currentStage mvp, mvp/ dir created.
    const advanceToMvp = await runFounder(["advance", slug, "--workspace", workspace]);
    expect(advanceToMvp).toMatchObject({ code: 0 });
    expect(advanceToMvp.stdout).toContain(`ADVANCED: ${slug} idea -> mvp`);
    expect((await readState(workspace, slug)).currentStage).toBe("mvp");
    await expect(pathExists(path.join(ideaRoot(workspace, slug), "mvp"))).resolves.toBe(true);
    // Meeting the gate records no override, so the array is still empty here.
    expect((await readState(workspace, slug)).overrides).toHaveLength(0);

    // 3. check at mvp -> NO_GATE_DEFINED, exit 1 (NOT STATE_STAGE_MISMATCH).
    const mvpCheck = await runFounder(["check", slug, "--workspace", workspace]);
    expect(mvpCheck.code).toBe(1);
    expect(mvpCheck.stderr).toContain("NO_GATE_DEFINED");
    expect(mvpCheck.stderr).not.toContain("STATE_STAGE_MISMATCH");

    // 6 (at mvp). status shows the no-gate / no-required-artifacts view; no crash, no n/a.
    const mvpStatus = await runFounder(["status", slug, "--workspace", workspace]);
    expect(mvpStatus).toMatchObject({ code: 0 });
    expect(mvpStatus.stdout).toContain("Stage: mvp");
    expect(mvpStatus.stdout).toContain("Gate: no gate");
    expect(mvpStatus.stdout).toContain("(no required artifacts for this stage yet)");
    expect(mvpStatus.stdout).not.toContain("n/a");

    // 6 (at mvp). list shows real stage + no gate token, NOT invalid.
    const mvpList = await runFounder(["list", "--workspace", workspace]);
    expect(mvpList).toMatchObject({ code: 0 });
    expect(mvpList.stdout).toContain(`${slug}  mvp  no gate`);
    expect(mvpList.stdout).not.toContain("invalid");

    // 4. advance from mvp with NO --override -> BLOCKED, state NOT mutated, no launch/ dir.
    const blockedAdvance = await runFounder(["advance", slug, "--workspace", workspace]);
    expect(blockedAdvance.code).not.toBe(0);
    expect(blockedAdvance.stderr).toContain("ADVANCE_BLOCKED");
    expect(blockedAdvance.stderr).toContain("NO_GATE_DEFINED");
    expect((await readState(workspace, slug)).currentStage).toBe("mvp");
    expect((await readState(workspace, slug)).overrides).toHaveLength(0);
    await expect(pathExists(path.join(ideaRoot(workspace, slug), "launch"))).resolves.toBe(false);

    // 5. advance from mvp with --override -> exit 0, currentStage launch, OVERRIDE-mvp.md,
    //    one override-log entry (stage mvp + reason), launch/ dir created.
    const overrideReason = "no gate defined yet";
    const overrideAdvance = await runFounder([
      "advance",
      slug,
      "--override",
      overrideReason,
      "--workspace",
      workspace,
    ]);
    expect(overrideAdvance).toMatchObject({ code: 0 });
    expect(overrideAdvance.stdout).toContain(`ADVANCED: ${slug} mvp -> launch`);

    const launchState = await readState(workspace, slug);
    expect(launchState.currentStage).toBe("launch");
    expect(launchState.overrides).toHaveLength(1);
    expect(launchState.overrides[0]).toMatchObject({
      stage: "mvp",
      reason: overrideReason,
      artifact: "OVERRIDE-mvp.md",
    });
    await expect(
      pathExists(path.join(ideaRoot(workspace, slug), "OVERRIDE-mvp.md")),
    ).resolves.toBe(true);
    await expect(pathExists(path.join(ideaRoot(workspace, slug), "launch"))).resolves.toBe(true);

    // 6 (at launch). status still renders the no-gate view; list still resolves to a real stage.
    const launchStatus = await runFounder(["status", slug, "--workspace", workspace]);
    expect(launchStatus).toMatchObject({ code: 0 });
    expect(launchStatus.stdout).toContain("Stage: launch");
    expect(launchStatus.stdout).toContain("Gate: no gate");
    expect(launchStatus.stdout).toContain("(no required artifacts for this stage yet)");
    expect(launchStatus.stdout).not.toContain("n/a");

    const launchList = await runFounder(["list", "--workspace", workspace]);
    expect(launchList).toMatchObject({ code: 0 });
    expect(launchList.stdout).toContain(`${slug}  launch  no gate`);
    expect(launchList.stdout).not.toContain("invalid");
  }, 30_000);
});
