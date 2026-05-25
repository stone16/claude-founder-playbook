import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { setActiveIdea } from "../lib/active.js";
import { slugify } from "../lib/slugify.js";
import { writeStateJson } from "../lib/state.js";
import { stageManifest } from "../stages/idea.js";
import { initWorkspace } from "./init.js";

export class IdeaExistsError extends Error {
  readonly code = "IDEA_EXISTS";

  constructor(readonly slug: string) {
    super(`Idea already exists: ${slug}`);
    this.name = "IdeaExistsError";
  }
}

export class InvalidIdeaNameError extends Error {
  readonly code = "INVALID_IDEA_NAME";

  constructor(readonly ideaName: string) {
    super(`Idea name cannot be slugified: ${ideaName}`);
    this.name = "InvalidIdeaNameError";
  }
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..");
const ideaTemplateDir = path.join(repoRoot, "templates", "idea");

async function mkdirExclusive(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
      throw new IdeaExistsError(path.basename(dirPath));
    }

    throw error;
  }
}

export async function createIdea(workspaceRoot: string, ideaName: string): Promise<string> {
  const slug = slugify(ideaName);
  if (slug === "") {
    throw new InvalidIdeaNameError(ideaName);
  }

  await initWorkspace(workspaceRoot);

  const ideaRoot = path.join(workspaceRoot, slug);
  const ideaStageRoot = path.join(ideaRoot, "idea");
  await mkdirExclusive(ideaRoot);
  await mkdir(ideaStageRoot);

  const templates = [...stageManifest.idea.required, ...stageManifest.idea.recommended].map((artifact) => `${artifact}.md`);
  for (const template of [...templates, "GATE.md"]) {
    await copyFile(path.join(ideaTemplateDir, template), path.join(ideaStageRoot, template));
  }

  const now = new Date().toISOString();
  await writeStateJson(path.join(ideaRoot, "state.json"), {
    ideaName,
    slug,
    currentStage: "idea",
    createdAt: now,
    updatedAt: now,
    overrides: [],
  });

  await setActiveIdea(workspaceRoot, slug);

  return slug;
}
