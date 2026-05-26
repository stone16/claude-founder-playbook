import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { ZodError } from "zod";

import { type IdeaArtifactName, ArtifactFrontmatterSchema } from "../schemas/artifacts.js";
import { GateSchema } from "../schemas/gate.js";
import { type Stage } from "../schemas/state.js";
import { type StageDefinition, stageRegistry } from "../stages/registry.js";
import { readStateJson } from "./state.js";
import { hasPartialPlaceholderBody, isPlaceholderBody } from "./placeholder.js";

export type ValidationIssueCode =
  | "MISSING_ARTIFACT"
  | "INCOMPLETE_ARTIFACT"
  | "PLACEHOLDER_ARTIFACT"
  | "PLACEHOLDER_WARNING"
  | "EVIDENCE_NO_CLAIMS"
  | "INVALID_ARTIFACT"
  | "MISSING_GATE"
  | "INVALID_GATE"
  | "GATE_CRITERION_UNANSWERED"
  | "GATE_CRITERION_FAILED"
  | "GATE_EVIDENCE_MISSING"
  | "GATE_EVIDENCE_TARGET_MISSING"
  | "STATE_STAGE_MISMATCH"
  | "STAGE_DIRECTORY_MISSING"
  | "NO_GATE_DEFINED"
  | "INVALID_STATE";

export type IssueSeverity = "error" | "warning";

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string;
  severity: IssueSeverity;
  artifact?: string;
  criterion?: string;
};

/**
 * `ok` is computed from blocking (error-severity) issues only: warning-severity
 * issues are advisory and do not fail validation. For an all-error issue list
 * (today's behaviour) this equals the former `issues.length === 0`.
 */
export const hasBlockingIssue = (issues: ValidationIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");

export type ValidationResult = {
  ok: boolean;
  ideaSlug: string;
  stage: Stage;
  issues: ValidationIssue[];
};

type MatterDocument = {
  data: unknown;
  content: string;
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function readMarkdown(filePath: string): Promise<MatterDocument> {
  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  return {
    data: parsed.data,
    content: parsed.content,
  };
}

function evidenceArtifactPath(
  stageRoot: string,
  evidence: string,
  evidenceTargets: Set<string>,
): string | undefined {
  const [rawTarget] = evidence.split("#", 1);
  const target = rawTarget?.trim();

  if (target === undefined || target === "" || path.basename(target) !== target || !evidenceTargets.has(target)) {
    return undefined;
  }

  const resolved = path.resolve(stageRoot, target);
  const resolvedStageRoot = path.resolve(stageRoot);
  if (resolved === resolvedStageRoot || !resolved.startsWith(`${resolvedStageRoot}${path.sep}`)) {
    return undefined;
  }

  return resolved;
}

async function validateArtifact(
  stageRoot: string,
  artifact: IdeaArtifactName,
  issues: ValidationIssue[],
): Promise<void> {
  const artifactPath = path.join(stageRoot, `${artifact}.md`);

  if (!(await pathExists(artifactPath))) {
    issues.push({
      code: "MISSING_ARTIFACT",
      artifact,
      severity: "error",
      message: `${artifact}: missing required artifact`,
    });
    return;
  }

  let document: MatterDocument;
  try {
    document = await readMarkdown(artifactPath);
  } catch {
    issues.push({
      code: "INVALID_ARTIFACT",
      artifact,
      severity: "error",
      message: `INVALID_ARTIFACT: ${artifact} frontmatter could not be parsed`,
    });
    return;
  }

  const frontmatter = ArtifactFrontmatterSchema.safeParse(document.data);
  if (!frontmatter.success || frontmatter.data.artifact !== artifact) {
    issues.push({
      code: "INVALID_ARTIFACT",
      artifact,
      severity: "error",
      message: `INVALID_ARTIFACT: ${artifact} frontmatter does not match the Idea artifact schema`,
    });
    return;
  }

  if (frontmatter.data.status !== "complete") {
    issues.push({
      code: "INCOMPLETE_ARTIFACT",
      artifact,
      severity: "error",
      message: `${artifact}: status is ${frontmatter.data.status}; required artifact must be complete`,
    });
  }

  if (isPlaceholderBody(document.content)) {
    issues.push({
      code: "PLACEHOLDER_ARTIFACT",
      artifact,
      severity: "error",
      message: `${artifact}: body is placeholder content`,
    });
  } else if (hasPartialPlaceholderBody(document.content)) {
    issues.push({
      code: "PLACEHOLDER_WARNING",
      artifact,
      severity: "warning",
      message: `${artifact}: body is partially placeholder content`,
    });
  }

  const evidence = frontmatter.data.evidence;
  if (evidence.length > 0 && evidence.every((entry) => entry.claims.length === 0)) {
    issues.push({
      code: "EVIDENCE_NO_CLAIMS",
      artifact,
      severity: "warning",
      message: `${artifact}: evidence entries have no claims`,
    });
  }
}

async function validateGate(
  stageRoot: string,
  gateCriteria: readonly string[],
  evidenceTargets: Set<string>,
  issues: ValidationIssue[],
): Promise<void> {
  const gatePath = path.join(stageRoot, "GATE.md");

  if (!(await pathExists(gatePath))) {
    issues.push({
      code: "MISSING_GATE",
      severity: "error",
      message: "GATE.md: missing Idea gate artifact",
    });
    return;
  }

  let document: MatterDocument;
  try {
    document = await readMarkdown(gatePath);
  } catch {
    issues.push({
      code: "INVALID_GATE",
      severity: "error",
      message: "INVALID_GATE: GATE.md could not be parsed",
    });
    return;
  }

  const gate = GateSchema.safeParse(document.data);
  if (!gate.success) {
    issues.push({
      code: "INVALID_GATE",
      severity: "error",
      message: "INVALID_GATE: GATE.md frontmatter does not match the Idea gate schema",
    });
    return;
  }

  for (const criterion of gateCriteria) {
    const value = gate.data.criteria[criterion];

    if (value === undefined) {
      issues.push({
        code: "GATE_CRITERION_UNANSWERED",
        criterion,
        severity: "error",
        message: `${criterion}: expected gate criterion is missing from GATE.md`,
      });
      continue;
    }

    if (value.answer === null) {
      issues.push({
        code: "GATE_CRITERION_UNANSWERED",
        criterion,
        severity: "error",
        message: `${criterion}: answer is null`,
      });
      continue;
    }

    if (value.answer === false) {
      issues.push({
        code: "GATE_CRITERION_FAILED",
        criterion,
        severity: "error",
        message: `${criterion}: answer must be true to pass the Idea gate`,
      });
      continue;
    }

    if (value.evidence.length === 0) {
      issues.push({
        code: "GATE_EVIDENCE_MISSING",
        criterion,
        severity: "error",
        message: `${criterion}: answer is true but evidence is empty`,
      });
      continue;
    }

    for (const evidence of value.evidence) {
      const artifactPath = evidenceArtifactPath(stageRoot, evidence, evidenceTargets);
      if (artifactPath === undefined || !(await pathExists(artifactPath))) {
        issues.push({
          code: "GATE_EVIDENCE_TARGET_MISSING",
          criterion,
          severity: "error",
          message: `${criterion}: evidence ${evidence} points to a missing artifact`,
        });
      }
    }
  }
}

function invalidStateIssue(error: unknown): ValidationIssue {
  if (error instanceof ZodError) {
    return {
      code: "INVALID_STATE",
      severity: "error",
      message: "INVALID_STATE: state.json does not match the state schema",
    };
  }

  return {
    code: "INVALID_STATE",
    severity: "error",
    message: "INVALID_STATE: state.json could not be read or parsed",
  };
}

export async function validateStage(
  workspaceRoot: string,
  ideaSlug: string,
  stage: Stage,
  registry: Record<Stage, StageDefinition> = stageRegistry,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const ideaRoot = path.join(workspaceRoot, ideaSlug);
  const stageRoot = path.join(ideaRoot, stage);
  const definition = registry[stage];
  const evidenceTargets = new Set(
    [...definition.required, ...definition.recommended].map((artifact) => `${artifact}.md`),
  );

  try {
    const state = await readStateJson(path.join(ideaRoot, "state.json"));
    if (state.currentStage !== stage) {
      issues.push({
        code: "STATE_STAGE_MISMATCH",
        severity: "error",
        message: `state.json currentStage is ${state.currentStage}; checked stage is ${stage}`,
      });
    }
  } catch (error) {
    issues.push(invalidStateIssue(error));
  }

  if (!(await directoryExists(stageRoot))) {
    issues.push({
      code: "STAGE_DIRECTORY_MISSING",
      severity: "error",
      message: `${stage}: missing stage directory`,
    });
    return {
      ok: false,
      ideaSlug,
      stage,
      issues,
    };
  }

  for (const artifact of definition.required) {
    await validateArtifact(stageRoot, artifact, issues);
  }

  if (definition.gateCriteria.length === 0) {
    issues.push({
      code: "NO_GATE_DEFINED",
      severity: "error",
      message: `${stage}: no gate criteria defined`,
    });
  } else {
    await validateGate(stageRoot, definition.gateCriteria, evidenceTargets, issues);
  }

  return {
    ok: !hasBlockingIssue(issues),
    ideaSlug,
    stage,
    issues,
  };
}

/**
 * Thin alias preserved so existing Idea-stage callers (`check`, `advance`,
 * `report`) compile and behave unchanged. Repointing those consumers to
 * `validateStage` is owned by later checkpoints.
 */
export const validateIdeaStage = (
  workspaceRoot: string,
  ideaSlug: string,
  stage: Stage = "idea",
): Promise<ValidationResult> => validateStage(workspaceRoot, ideaSlug, stage);
