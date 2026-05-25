import { readFileSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { extractFounderCliVerbs, implementedFounderVerbs } from "../src/lib/skillVerbs.js";
import { stageManifest } from "../src/stages/idea.js";

const founderIdeaSkillPath = path.join(process.cwd(), "skills", "founder-idea", "SKILL.md");
const surfacesReferencePath = path.join(process.cwd(), "templates", "idea", "_reference", "surfaces.md");
const activitySkillNames = [
  "founder-pressure-test",
  "founder-market-research",
  "founder-user-discovery",
] as const;
const ideaStageSkillNames = ["founder-idea", ...activitySkillNames] as const;
const requiredActivitySections = [
  "## Purpose",
  "## When To Use",
  "## Workflow",
  "## Artifacts Written",
  "## CLI Verbs Used",
] as const;
const ideaArtifactPaths = new Set(
  [...stageManifest.idea.required, ...stageManifest.idea.recommended].map((artifact) => `idea/${artifact}.md`),
);

function readMarkdown(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function activitySkillPath(skillName: string): string {
  return path.join(process.cwd(), "skills", skillName, "SKILL.md");
}

function extractIdeaArtifactPaths(markdown: string): Set<string> {
  return new Set([...markdown.matchAll(/\bidea\/([a-z0-9-]+\.md)\b/g)].map((match) => `idea/${match[1]}`));
}

describe("skill lint", () => {
  it("extracts founder CLI verbs from skill markdown", () => {
    const markdown = ["Run `founder new \"CRM for dentists\"`.", "Then run `founder check`."].join("\n");

    expect(extractFounderCliVerbs(markdown)).toEqual(new Set(["new", "check"]));
  });

  it("knows the implemented founder CLI verbs", () => {
    expect(implementedFounderVerbs).toEqual(
      new Set(["init", "new", "use", "list", "status", "check", "advance"]),
    );
  });

  it("founder-idea has valid frontmatter and required sections", () => {
    const parsed = matter(readMarkdown(founderIdeaSkillPath));

    expect(parsed.data).toMatchObject({
      name: "founder-idea",
      description: expect.any(String),
    });
    expect(parsed.data.description).not.toHaveLength(0);

    for (const heading of [
      "## Purpose",
      "## When To Use",
      "## Idea-Stage Workflow",
      "## Gate Handling",
      "## CLI Verbs Used",
    ]) {
      expect(parsed.content).toContain(heading);
    }
  });

  it("founder-idea references the Chat/Cowork/Code surfaces guide", () => {
    const skill = readMarkdown(founderIdeaSkillPath);
    const surfaces = readMarkdown(surfacesReferencePath);

    expect(skill).toContain("templates/idea/_reference/surfaces.md");
    expect(surfaces).toContain("Chat");
    expect(surfaces).toContain("Cowork");
    expect(surfaces).toContain("Code");
  });

  it("founder-idea references only implemented founder CLI verbs", () => {
    const skill = readMarkdown(founderIdeaSkillPath);
    const referencedVerbs = extractFounderCliVerbs(skill);

    expect(referencedVerbs.size).toBeGreaterThan(0);
    expect([...referencedVerbs].sort()).toEqual(["advance", "check", "new", "status"]);

    for (const verb of referencedVerbs) {
      expect(implementedFounderVerbs.has(verb)).toBe(true);
    }
  });

  it.each(activitySkillNames)("%s has valid frontmatter and required sections", (skillName) => {
    const parsed = matter(readMarkdown(activitySkillPath(skillName)));

    expect(parsed.data).toMatchObject({
      name: skillName,
      description: expect.any(String),
    });
    expect(parsed.data.description).not.toHaveLength(0);

    for (const heading of requiredActivitySections) {
      expect(parsed.content).toContain(heading);
    }
  });

  it.each(activitySkillNames)("%s names at least one manifest-backed Idea artifact path", (skillName) => {
    const skill = readMarkdown(activitySkillPath(skillName));
    const referencedArtifactPaths = extractIdeaArtifactPaths(skill);

    expect(referencedArtifactPaths.size).toBeGreaterThan(0);
    for (const artifactPath of referencedArtifactPaths) {
      expect(ideaArtifactPaths.has(artifactPath)).toBe(true);
    }
  });

  it.each(activitySkillNames)("%s references only implemented founder CLI verbs", (skillName) => {
    const skill = readMarkdown(activitySkillPath(skillName));
    const referencedVerbs = extractFounderCliVerbs(skill);

    for (const verb of referencedVerbs) {
      expect(implementedFounderVerbs.has(verb)).toBe(true);
    }
  });

  it("cross-checks founder CLI verbs for all four Idea-stage skills", () => {
    for (const skillName of ideaStageSkillNames) {
      const skillPath = skillName === "founder-idea" ? founderIdeaSkillPath : activitySkillPath(skillName);
      const referencedVerbs = extractFounderCliVerbs(readMarkdown(skillPath));

      expect(referencedVerbs.size, `${skillName} should name at least one founder CLI verb`).toBeGreaterThan(0);
      expect(
        [...referencedVerbs].filter((verb) => !implementedFounderVerbs.has(verb)),
        `${skillName} should reference only implemented founder CLI verbs`,
      ).toEqual([]);
    }
  });
});
