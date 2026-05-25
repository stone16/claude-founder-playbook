import { writeFile } from "node:fs/promises";
import path from "node:path";

import { type Stage } from "../schemas/state.js";

export function overrideArtifactName(stage: Stage): string {
  return `OVERRIDE-${stage}.md`;
}

export async function writeOverrideArtifact(
  ideaRoot: string,
  stage: Stage,
  reason: string,
  date: string,
): Promise<string> {
  const artifact = overrideArtifactName(stage);
  const body = [
    "---",
    `stage: ${stage}`,
    `date: ${date}`,
    "---",
    "",
    `# Override: ${stage}`,
    "",
    "## Reason",
    "",
    reason,
    "",
  ].join("\n");

  await writeFile(path.join(ideaRoot, artifact), body, "utf8");
  return artifact;
}
