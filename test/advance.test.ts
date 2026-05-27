import { mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import matter from "gray-matter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";
import { advanceIdea } from "../src/commands/advance.js";
import { type FounderState, StateSchema } from "../src/schemas/state.js";
import { stageManifest } from "../src/stages/idea.js";
import { stageRegistry } from "../src/stages/registry.js";

const now = "2026-05-25T00:00:00.000Z";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createScaffoldedIdea(): Promise<string> {
  const workspace = await mkdtemp(path.join(tmpdir(), "founder-advance-"));
  await main(["new", "Contract Review Tool", "--workspace", workspace]);
  return workspace;
}

function ideaRoot(workspace: string): string {
  return path.join(workspace, "contract-review-tool");
}

function ideaStageRoot(workspace: string): string {
  return path.join(ideaRoot(workspace), "idea");
}

async function readState(workspace: string): Promise<FounderState> {
  return StateSchema.parse(JSON.parse(await readFile(path.join(ideaRoot(workspace), "state.json"), "utf8")));
}

async function populatePassingIdea(workspace: string): Promise<void> {
  for (const artifact of stageManifest.idea.required) {
    await writeFile(
      path.join(ideaStageRoot(workspace), `${artifact}.md`),
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
    path.join(ideaStageRoot(workspace), "GATE.md"),
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

describe("founder advance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks an unmet Idea gate without mutating state.json", async () => {
    const workspace = await createScaffoldedIdea();
    const stateBefore = await readFile(path.join(ideaRoot(workspace), "state.json"), "utf8");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(1);

    await expect(readFile(path.join(ideaRoot(workspace), "state.json"), "utf8")).resolves.toBe(stateBefore);
    await expect(pathExists(path.join(ideaRoot(workspace), "mvp"))).resolves.toBe(false);
    expect(consoleOutput(error)).toContain("ADVANCE_BLOCKED");
  });

  it("records an override and advances an unmet Idea gate when a reason is provided", async () => {
    const workspace = await createScaffoldedIdea();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const reason = "Founder accepts risk to run a concierge MVP";

    expect(await main(["advance", "contract-review-tool", `--override=${reason}`, "--workspace", workspace])).toBe(0);

    const state = await readState(workspace);
    expect(state.currentStage).toBe("mvp");
    expect(state.overrides).toHaveLength(1);
    expect(state.overrides[0]).toMatchObject({
      stage: "idea",
      reason,
      artifact: "OVERRIDE-idea.md",
    });
    expect(new Date(state.overrides[0].date).toISOString()).toBe(state.overrides[0].date);
    await expect(pathExists(path.join(ideaRoot(workspace), "mvp"))).resolves.toBe(true);
    await expect(readFile(path.join(ideaRoot(workspace), "OVERRIDE-idea.md"), "utf8")).resolves.toContain(reason);
    expect(consoleOutput(log)).toContain("ADVANCED");
  });

  it("advances a met Idea gate without an override and creates the next stage directory", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(0);

    const state = await readState(workspace);
    expect(state.currentStage).toBe("mvp");
    expect(state.overrides).toEqual([]);
    await expect(pathExists(path.join(ideaRoot(workspace), "mvp"))).resolves.toBe(true);
  });

  it("ignores an override reason when the Idea gate is already met", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--override", "not needed", "--workspace", workspace])).toBe(0);

    const state = await readState(workspace);
    expect(state.currentStage).toBe("mvp");
    expect(state.overrides).toEqual([]);
    await expect(pathExists(path.join(ideaRoot(workspace), "OVERRIDE-idea.md"))).resolves.toBe(false);
  });

  it("does not write an override artifact when the transition is illegal", async () => {
    const workspace = await createScaffoldedIdea();
    const state = await readState(workspace);
    await writeFile(
      path.join(ideaRoot(workspace), "state.json"),
      `${JSON.stringify({ ...state, currentStage: "scale", updatedAt: new Date().toISOString() }, null, 2)}\n`,
      "utf8",
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--override", "force", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("TERMINAL_STAGE");
    await expect(pathExists(path.join(ideaRoot(workspace), "OVERRIDE-scale.md"))).resolves.toBe(false);
  });

  it("uses the active idea and --workspace= form when advancing a met gate", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["advance", `--workspace=${workspace}`])).toBe(0);

    const state = await readState(workspace);
    expect(state.currentStage).toBe("mvp");
  });

  it("rejects an override flag without a reason", async () => {
    const workspace = await createScaffoldedIdea();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--override", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("MISSING_OVERRIDE_REASON");
  });

  it("surfaces a typed state error when state.json is unreadable", async () => {
    const workspace = await createScaffoldedIdea();
    await writeFile(path.join(ideaRoot(workspace), "state.json"), "{", "utf8");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("INVALID_JSON");
  });

  async function advanceToMvp(workspace: string): Promise<void> {
    await populatePassingIdea(workspace);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(0);
    log.mockRestore();
  }

  it("blocks advancing an ungated mvp stage without an override and leaves state.json untouched", async () => {
    const workspace = await createScaffoldedIdea();
    await advanceToMvp(workspace);
    const stateBefore = await readFile(path.join(ideaRoot(workspace), "state.json"), "utf8");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["advance", "contract-review-tool", "--workspace", workspace])).toBe(1);

    expect(consoleOutput(error)).toContain("ADVANCE_BLOCKED");
    expect(consoleOutput(error)).toContain("NO_GATE_DEFINED");
    await expect(readFile(path.join(ideaRoot(workspace), "state.json"), "utf8")).resolves.toBe(stateBefore);
    await expect(pathExists(path.join(ideaRoot(workspace), "launch"))).resolves.toBe(false);
  });

  it("records an override and advances an ungated mvp stage when a reason is provided", async () => {
    const workspace = await createScaffoldedIdea();
    await advanceToMvp(workspace);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const reason = "Founder accepts launch risk to ship early";

    expect(await main(["advance", "contract-review-tool", `--override=${reason}`, "--workspace", workspace])).toBe(0);

    const state = await readState(workspace);
    expect(state.currentStage).toBe("launch");
    expect(state.overrides).toHaveLength(1);
    expect(state.overrides[0]).toMatchObject({
      stage: "mvp",
      reason,
      artifact: "OVERRIDE-mvp.md",
    });
    await expect(pathExists(path.join(ideaRoot(workspace), "launch"))).resolves.toBe(true);
    await expect(readFile(path.join(ideaRoot(workspace), "OVERRIDE-mvp.md"), "utf8")).resolves.toContain(reason);
    expect(consoleOutput(log)).toContain("ADVANCED");
  });

  it("seeds the target stage directory from the registry templateDir when one is declared", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const templateDir = await mkdtemp(path.join(tmpdir(), "founder-template-"));
    await writeFile(path.join(templateDir, "seed.md"), "# seed\n", "utf8");
    await writeFile(path.join(templateDir, "GATE.md"), "# gate\n", "utf8");
    const registry = {
      ...stageRegistry,
      mvp: { ...stageRegistry.mvp, templateDir },
    };

    expect(await advanceIdea(workspace, ["contract-review-tool"], registry)).toBe(0);

    const mvpRoot = path.join(ideaRoot(workspace), "mvp");
    await expect(readFile(path.join(mvpRoot, "seed.md"), "utf8")).resolves.toContain("# seed");
    await expect(readFile(path.join(mvpRoot, "GATE.md"), "utf8")).resolves.toContain("# gate");
  });

  it("creates an empty target stage directory when the registry declares no templateDir", async () => {
    const workspace = await createScaffoldedIdea();
    await populatePassingIdea(workspace);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await advanceIdea(workspace, ["contract-review-tool"], stageRegistry)).toBe(0);

    const mvpRoot = path.join(ideaRoot(workspace), "mvp");
    await expect(pathExists(mvpRoot)).resolves.toBe(true);
    await expect(readdir(mvpRoot)).resolves.toEqual([]);
  });
});
