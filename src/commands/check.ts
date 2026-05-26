import path from "node:path";

import { readActiveIdea } from "../lib/active.js";
import { positionalArgs } from "../lib/args.js";
import { readStateJson } from "../lib/state.js";
import { validateStage } from "../lib/validate.js";

export class MissingIdeaSelectionError extends Error {
  readonly code = "MISSING_IDEA_SELECTION";

  constructor() {
    super("Pass an idea slug or select one with founder use");
    this.name = "MissingIdeaSelectionError";
  }
}

export async function checkIdea(workspaceRoot: string, args: readonly string[]): Promise<number> {
  const [requestedIdea] = positionalArgs(args);
  const ideaSlug = requestedIdea ?? (await readActiveIdea(workspaceRoot));

  if (ideaSlug === undefined) {
    throw new MissingIdeaSelectionError();
  }

  const statePath = path.join(workspaceRoot, ideaSlug, "state.json");
  const state = await readStateJson(statePath);
  const result = await validateStage(workspaceRoot, ideaSlug, state.currentStage);

  if (result.ok) {
    console.log(`CHECK PASSED: ${result.ideaSlug} ${result.stage}`);
    return 0;
  }

  for (const issue of result.issues) {
    console.error(`${issue.code}: ${issue.message}`);
  }

  return 1;
}
