import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { ArtifactFrontmatterSchema, type IdeaArtifactName } from "../schemas/artifacts.js";
import { type Stage } from "../schemas/state.js";
import { stageRegistry } from "../stages/registry.js";
import { isPlaceholderBody } from "./placeholder.js";
import { readStateJson } from "./state.js";
import { type ValidationIssue, validateStage } from "./validate.js";

const NO_GATE_TOKEN = "no gate";

type ArtifactChecklistItem = {
  artifact: IdeaArtifactName;
  required: boolean;
  ok: boolean;
  blocking: boolean;
  notes: string[];
};

export type IdeaReport = {
  ideaSlug: string;
  stage: Stage;
  gate: {
    passed: number;
    total: number;
    ok: boolean;
    blockers: string[];
    token: string;
  };
  artifacts: ArtifactChecklistItem[];
  blockingIssues: ValidationIssue[];
};

export type IdeaListEntry = {
  ideaSlug: string;
  stage: Stage | "invalid";
  gateToken: string;
  blockers: string[];
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function artifactIssueNotes(issues: readonly ValidationIssue[], artifact: IdeaArtifactName): string[] {
  return issues.filter((issue) => issue.artifact === artifact).map((issue) => issue.message);
}

async function artifactNotes(stageRoot: string, artifact: IdeaArtifactName): Promise<string[]> {
  const artifactPath = path.join(stageRoot, `${artifact}.md`);
  if (!(await pathExists(artifactPath))) {
    return ["missing artifact"];
  }

  try {
    const document = matter(await readFile(artifactPath, "utf8"));
    const frontmatter = ArtifactFrontmatterSchema.safeParse(document.data);
    if (!frontmatter.success || frontmatter.data.artifact !== artifact) {
      return ["invalid artifact frontmatter"];
    }

    const notes: string[] = [];
    if (frontmatter.data.status !== "complete") {
      notes.push(`status is ${frontmatter.data.status}`);
    }

    if (isPlaceholderBody(document.content)) {
      notes.push("body is placeholder content");
    }

    return notes;
  } catch {
    return ["artifact could not be read"];
  }
}

async function buildArtifactChecklist(
  workspaceRoot: string,
  ideaSlug: string,
  stage: Stage,
  issues: readonly ValidationIssue[],
): Promise<ArtifactChecklistItem[]> {
  const definition = stageRegistry[stage];
  const requiredArtifacts = new Set<IdeaArtifactName>(definition.required);
  const artifacts = [...definition.required, ...definition.recommended];
  const stageRoot = path.join(workspaceRoot, ideaSlug, stage);

  return await Promise.all(
    artifacts.map(async (artifact) => {
      const blockingNotes = artifactIssueNotes(issues, artifact);
      const notes = blockingNotes.length > 0 ? blockingNotes : await artifactNotes(stageRoot, artifact);

      return {
        artifact,
        required: requiredArtifacts.has(artifact),
        ok: notes.length === 0,
        blocking: blockingNotes.length > 0,
        notes,
      };
    }),
  );
}

function summarizeGate(stage: Stage, issues: readonly ValidationIssue[]): IdeaReport["gate"] {
  const gateCriteria = stageRegistry[stage].gateCriteria;

  if (gateCriteria.length === 0) {
    return {
      passed: 0,
      total: 0,
      ok: true,
      blockers: [],
      token: NO_GATE_TOKEN,
    };
  }

  const criteria = new Set(gateCriteria);
  const blockedCriteria = new Set<string>();
  let gateShapeBlocks = false;

  for (const issue of issues) {
    if (issue.criterion !== undefined && criteria.has(issue.criterion)) {
      blockedCriteria.add(issue.criterion);
      continue;
    }

    if (issue.code === "MISSING_GATE" || issue.code === "INVALID_GATE") {
      gateShapeBlocks = true;
    }
  }

  const blockers = gateShapeBlocks ? [...gateCriteria] : [...blockedCriteria];
  const passed = gateCriteria.length - blockers.length;
  const ok = blockers.length === 0;

  return {
    passed,
    total: gateCriteria.length,
    ok,
    blockers,
    token: `${passed}/${gateCriteria.length} ${ok ? "✓" : "✗"}`,
  };
}

export async function buildIdeaReport(workspaceRoot: string, ideaSlug: string): Promise<IdeaReport> {
  const state = await readStateJson(path.join(workspaceRoot, ideaSlug, "state.json"));
  const validation = await validateStage(workspaceRoot, ideaSlug, state.currentStage);
  const gate = summarizeGate(state.currentStage, validation.issues);

  return {
    ideaSlug,
    stage: state.currentStage,
    gate,
    artifacts: await buildArtifactChecklist(workspaceRoot, ideaSlug, state.currentStage, validation.issues),
    blockingIssues: validation.issues,
  };
}

export function renderStatusReport(report: IdeaReport): string {
  const lines = [
    `Idea: ${report.ideaSlug}`,
    `Stage: ${report.stage}`,
    `Gate: ${report.gate.token}`,
    "",
    "Artifacts:",
  ];

  if (report.artifacts.length === 0) {
    lines.push("(no required artifacts for this stage yet)");
  } else {
    for (const item of report.artifacts) {
      const marker = item.ok ? "✓" : "✗";
      const requiredLabel = item.required ? "required" : "recommended";
      const blockingLabel = item.blocking ? " blocking" : "";
      const note = item.notes.length > 0 ? ` - ${item.notes.join("; ")}` : "";
      lines.push(`${marker} ${item.artifact}.md (${requiredLabel}${blockingLabel})${note}`);
    }
  }

  const blocking = report.blockingIssues.filter(
    (issue) =>
      issue.severity === "error" && issue.code !== "INVALID_STATE" && issue.code !== "NO_GATE_DEFINED",
  );
  if (blocking.length > 0) {
    lines.push("", "Blocking:");
    for (const issue of blocking) {
      lines.push(`- ${issue.message}`);
    }
  }

  const warnings = report.blockingIssues.filter((issue) => issue.severity === "warning");
  if (warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const issue of warnings) {
      lines.push(`- ${issue.message}`);
    }
  }

  return lines.join("\n");
}

export async function buildIdeaList(workspaceRoot: string): Promise<IdeaListEntry[]> {
  let entries;
  try {
    entries = await readdir(workspaceRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const slugs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return await Promise.all(
    slugs.map(async (ideaSlug) => {
      try {
        const report = await buildIdeaReport(workspaceRoot, ideaSlug);
        return {
          ideaSlug,
          stage: report.stage,
          gateToken: report.gate.token,
          blockers: report.gate.blockers,
        };
      } catch {
        return {
          ideaSlug,
          stage: "invalid",
          gateToken: "invalid",
          blockers: ["invalid state"],
        };
      }
    }),
  );
}

export function renderIdeaList(entries: readonly IdeaListEntry[]): string {
  if (entries.length === 0) {
    return "No founder ideas found.";
  }

  return entries
    .map((entry) => {
      const blocked = entry.blockers.length > 0 ? ` blocked: ${entry.blockers.join(", ")}` : "";
      return `${entry.ideaSlug}  ${entry.stage}  ${entry.gateToken}${blocked}`;
    })
    .join("\n");
}
