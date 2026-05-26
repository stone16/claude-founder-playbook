import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import { readActiveIdea } from "../lib/active.js";
import { positionalArgs } from "../lib/args.js";
import { overrideArtifactName, writeOverrideArtifact } from "../lib/override.js";
import { readStateJson, writeStateJson } from "../lib/state.js";
import { advanceStage } from "../lib/transition.js";
import { validateStage } from "../lib/validate.js";
import { type Stage } from "../schemas/state.js";
import { type StageDefinition, stageRegistry } from "../stages/registry.js";

export class MissingAdvanceIdeaError extends Error {
  readonly code = "MISSING_IDEA_SELECTION";

  constructor() {
    super("Pass an idea slug or select one with founder use");
    this.name = "MissingAdvanceIdeaError";
  }
}

export class MissingOverrideReasonError extends Error {
  readonly code = "MISSING_OVERRIDE_REASON";

  constructor() {
    super("Pass a non-empty reason after --override");
    this.name = "MissingOverrideReasonError";
  }
}

type AdvanceArgs = {
  ideaSlug?: string;
  overrideReason?: string;
};

function parseAdvanceArgs(args: readonly string[]): AdvanceArgs {
  let overrideReason: string | undefined;
  const argsWithoutOverride: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--override") {
      const reason = args[index + 1];
      if (reason === undefined || reason.startsWith("--")) {
        throw new MissingOverrideReasonError();
      }

      overrideReason = reason;
      index += 1;
      continue;
    }

    if (arg.startsWith("--override=")) {
      overrideReason = arg.slice("--override=".length);
      continue;
    }

    argsWithoutOverride.push(arg);
  }

  if (overrideReason !== undefined && overrideReason.trim() === "") {
    throw new MissingOverrideReasonError();
  }

  return {
    ideaSlug: positionalArgs(argsWithoutOverride)[0],
    overrideReason,
  };
}

async function createStageDirectory(
  ideaRoot: string,
  stage: string,
  definition: StageDefinition,
): Promise<void> {
  const stageRoot = path.join(ideaRoot, stage);
  await mkdir(stageRoot, { recursive: true });

  if (definition.templateDir === undefined) {
    return;
  }

  for (const entry of await readdir(definition.templateDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      await copyFile(path.join(definition.templateDir, entry.name), path.join(stageRoot, entry.name));
    }
  }
}

export async function advanceIdea(
  workspaceRoot: string,
  args: readonly string[],
  registry: Record<Stage, StageDefinition> = stageRegistry,
): Promise<number> {
  const parsed = parseAdvanceArgs(args);
  const ideaSlug = parsed.ideaSlug ?? (await readActiveIdea(workspaceRoot));

  if (ideaSlug === undefined) {
    throw new MissingAdvanceIdeaError();
  }

  const ideaRoot = path.join(workspaceRoot, ideaSlug);
  const statePath = path.join(ideaRoot, "state.json");
  const state = await readStateJson(statePath);
  const currentStage = state.currentStage;
  const validation = await validateStage(workspaceRoot, ideaSlug, currentStage, registry);

  if (!validation.ok && parsed.overrideReason === undefined) {
    for (const issue of validation.issues) {
      console.error(`ADVANCE_BLOCKED: ${issue.code}: ${issue.message}`);
    }
    return 1;
  }

  const advancedAt = new Date().toISOString();
  const shouldRecordOverride = !validation.ok && parsed.overrideReason !== undefined;
  const artifact = shouldRecordOverride ? overrideArtifactName(currentStage) : undefined;
  const nextState = advanceStage(
    state,
    currentStage,
    advancedAt,
    artifact === undefined
      ? undefined
      : {
          stage: currentStage,
          reason: parsed.overrideReason ?? "",
          date: advancedAt,
          artifact,
        },
  );

  if (shouldRecordOverride && parsed.overrideReason !== undefined) {
    await writeOverrideArtifact(ideaRoot, currentStage, parsed.overrideReason, advancedAt);
  }

  await createStageDirectory(ideaRoot, nextState.currentStage, registry[nextState.currentStage]);
  await writeStateJson(statePath, nextState);
  console.log(`ADVANCED: ${ideaSlug} ${currentStage} -> ${nextState.currentStage}`);
  return 0;
}
