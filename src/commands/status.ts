import { readActiveIdea } from "../lib/active.js";
import { positionalArgs } from "../lib/args.js";
import { buildIdeaReport, renderStatusReport } from "../lib/report.js";

export class MissingStatusIdeaError extends Error {
  readonly code = "MISSING_IDEA_SELECTION";

  constructor() {
    super("No founder idea selected or created. Run founder new \"Idea Name\" or pass an idea slug.");
    this.name = "MissingStatusIdeaError";
  }
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
