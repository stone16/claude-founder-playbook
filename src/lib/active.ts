import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export class UnknownIdeaError extends Error {
  readonly code = "UNKNOWN_IDEA";

  constructor(readonly slug: string) {
    super(`Unknown idea: ${slug}`);
    this.name = "UnknownIdeaError";
  }
}

export function activePointerPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".active");
}

export async function ideaExists(workspaceRoot: string, slug: string): Promise<boolean> {
  try {
    const stats = await stat(path.join(workspaceRoot, slug));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function setActiveIdea(workspaceRoot: string, slug: string): Promise<void> {
  if (!(await ideaExists(workspaceRoot, slug))) {
    throw new UnknownIdeaError(slug);
  }

  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(activePointerPath(workspaceRoot), `${slug}\n`, "utf8");
}

export async function readActiveIdea(workspaceRoot: string): Promise<string | undefined> {
  try {
    const active = await readFile(activePointerPath(workspaceRoot), "utf8");
    return active.trim() || undefined;
  } catch {
    return undefined;
  }
}
