import { readActiveIdea } from "../lib/active.js";
import { buildIdeaReport, renderStatusReport } from "../lib/report.js";

export class MissingStatusIdeaError extends Error {
  readonly code = "MISSING_IDEA_SELECTION";

  constructor() {
    super("No founder idea selected or created. Run founder new \"Idea Name\" or pass an idea slug.");
    this.name = "MissingStatusIdeaError";
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

export async function statusIdea(workspaceRoot: string, args: readonly string[]): Promise<number> {
  const [requestedIdea] = positionalArgs(args);
  const ideaSlug = requestedIdea ?? (await readActiveIdea(workspaceRoot));

  if (ideaSlug === undefined) {
    throw new MissingStatusIdeaError();
  }

  console.log(renderStatusReport(await buildIdeaReport(workspaceRoot, ideaSlug)));
  return 0;
}
