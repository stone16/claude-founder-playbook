import { readActiveIdea } from "../lib/active.js";
import { validateIdeaStage } from "../lib/validate.js";

export class MissingIdeaSelectionError extends Error {
  readonly code = "MISSING_IDEA_SELECTION";

  constructor() {
    super("Pass an idea slug or select one with founder use");
    this.name = "MissingIdeaSelectionError";
  }
}

function positionalArgs(args: readonly string[]): string[] {
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace") {
      index += 1;
      continue;
    }

    if (arg.startsWith("--workspace=")) {
      continue;
    }

    positionals.push(arg);
  }

  return positionals;
}

export async function checkIdea(workspaceRoot: string, args: readonly string[]): Promise<number> {
  const [requestedIdea] = positionalArgs(args);
  const ideaSlug = requestedIdea ?? (await readActiveIdea(workspaceRoot));

  if (ideaSlug === undefined) {
    throw new MissingIdeaSelectionError();
  }

  const result = await validateIdeaStage(workspaceRoot, ideaSlug, "idea");

  if (result.ok) {
    console.log(`CHECK PASSED: ${result.ideaSlug} ${result.stage}`);
    return 0;
  }

  for (const issue of result.issues) {
    console.error(`${issue.code}: ${issue.message}`);
  }

  return 1;
}
