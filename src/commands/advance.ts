import { mkdir } from "node:fs/promises";
import path from "node:path";

import { readActiveIdea } from "../lib/active.js";
import { writeOverrideArtifact } from "../lib/override.js";
import { readStateJson, writeStateJson } from "../lib/state.js";
import { advanceStage } from "../lib/transition.js";
import { validateIdeaStage } from "../lib/validate.js";

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
  const positionals: string[] = [];
  let overrideReason: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--workspace") {
      index += 1;
      continue;
    }

    if (arg.startsWith("--workspace=")) {
      continue;
    }

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

    positionals.push(arg);
  }

  if (overrideReason !== undefined && overrideReason.trim() === "") {
    throw new MissingOverrideReasonError();
  }

  return {
    ideaSlug: positionals[0],
    overrideReason,
  };
}

async function createStageDirectory(ideaRoot: string, stage: string): Promise<void> {
  await mkdir(path.join(ideaRoot, stage), { recursive: true });
}

export async function advanceIdea(workspaceRoot: string, args: readonly string[]): Promise<number> {
  const parsed = parseAdvanceArgs(args);
  const ideaSlug = parsed.ideaSlug ?? (await readActiveIdea(workspaceRoot));

  if (ideaSlug === undefined) {
    throw new MissingAdvanceIdeaError();
  }

  const ideaRoot = path.join(workspaceRoot, ideaSlug);
  const statePath = path.join(ideaRoot, "state.json");
  const state = await readStateJson(statePath);
  const currentStage = state.currentStage;
  const validation = await validateIdeaStage(workspaceRoot, ideaSlug, currentStage);

  if (!validation.ok && parsed.overrideReason === undefined) {
    for (const issue of validation.issues) {
      console.error(`ADVANCE_BLOCKED: ${issue.code}: ${issue.message}`);
    }
    return 1;
  }

  const advancedAt = new Date().toISOString();
  const artifact =
    parsed.overrideReason === undefined
      ? undefined
      : await writeOverrideArtifact(ideaRoot, currentStage, parsed.overrideReason, advancedAt);
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

  await createStageDirectory(ideaRoot, nextState.currentStage);
  await writeStateJson(statePath, nextState);
  console.log(`ADVANCED: ${ideaSlug} ${currentStage} -> ${nextState.currentStage}`);
  return 0;
}
