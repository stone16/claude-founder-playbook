import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { type FounderState, StateSchema } from "../../src/schemas/state.js";
import { stageManifest } from "../../src/stages/idea.js";

const cliPath = path.join(process.cwd(), "dist", "cli.js");
const now = "2026-05-25T00:00:00.000Z";

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

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

describe("Idea-stage lifecycle e2e", () => {
  it("runs init, new, check, list, and advance through the real founder CLI", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-e2e-"));

    const init = await runFounder(["init", "--workspace", workspace]);
    expect(init).toMatchObject({ code: 0 });
    await expect(pathExists(path.join(workspace, "_reference", "surfaces.md"))).resolves.toBe(true);

    const created = await runFounder(["new", "Sample Idea", "--workspace", workspace]);
    expect(created).toMatchObject({ code: 0 });
    expect(created.stdout).toContain("sample-idea");

    const initialCheck = await runFounder(["check", "sample-idea", "--workspace", workspace]);
    expect(initialCheck.code).toBe(1);
    expect(initialCheck.stderr).toContain("INCOMPLETE_ARTIFACT");
    expect(initialCheck.stderr).toContain("GATE_CRITERION_UNANSWERED");

    const initialStatus = await runFounder(["status", "sample-idea", "--workspace", workspace]);
    expect(initialStatus).toMatchObject({ code: 0 });
    expect(initialStatus.stdout).toContain("Stage: idea");
    expect(initialStatus.stdout).toContain("Gate: 0/3");

    const blockedAdvance = await runFounder(["advance", "sample-idea", "--workspace", workspace]);
    expect(blockedAdvance.code).toBe(1);
    expect(blockedAdvance.stderr).toContain("ADVANCE_BLOCKED");
    expect((await readState(workspace, "sample-idea")).currentStage).toBe("idea");
    await expect(pathExists(path.join(ideaRoot(workspace, "sample-idea"), "mvp"))).resolves.toBe(false);

    const blockedList = await runFounder(["list", "--workspace", workspace]);
    expect(blockedList).toMatchObject({ code: 0 });
    expect(blockedList.stdout).toContain("sample-idea  idea  0/3 ✗");
    expect(blockedList.stdout).toContain(
      "blocked: problem_real_specific, solution_addresses_actual_problem, enough_signal_to_build",
    );

    const overrideAdvance = await runFounder([
      "advance",
      "sample-idea",
      "--override",
      "Founder accepts the risk to run a concierge MVP.",
      "--workspace",
      workspace,
    ]);
    expect(overrideAdvance).toMatchObject({ code: 0 });
    expect((await readState(workspace, "sample-idea")).currentStage).toBe("mvp");
    await expect(pathExists(path.join(ideaRoot(workspace, "sample-idea"), "mvp"))).resolves.toBe(true);

    const secondIdea = await runFounder(["new", "Met Gate Idea", "--workspace", workspace]);
    expect(secondIdea).toMatchObject({ code: 0 });
    await populatePassingIdea(workspace, "met-gate-idea");

    const passingCheck = await runFounder(["check", "met-gate-idea", "--workspace", workspace]);
    expect(passingCheck).toMatchObject({ code: 0 });
    expect(passingCheck.stdout).toContain("CHECK PASSED");

    const passingList = await runFounder(["list", "--workspace", workspace]);
    expect(passingList).toMatchObject({ code: 0 });
    expect(passingList.stdout).toContain("sample-idea  mvp  3/3 ✓");
    expect(passingList.stdout).toContain("met-gate-idea  idea  3/3 ✓");

    const metGateAdvance = await runFounder(["advance", "met-gate-idea", "--workspace", workspace]);
    expect(metGateAdvance).toMatchObject({ code: 0 });
    expect((await readState(workspace, "met-gate-idea")).currentStage).toBe("mvp");
    await expect(pathExists(path.join(ideaRoot(workspace, "met-gate-idea"), "mvp"))).resolves.toBe(true);
  });
});
