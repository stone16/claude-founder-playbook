import { readFileSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { extractFounderCliVerbs, implementedFounderVerbs } from "../src/lib/skillVerbs.js";

const founderIdeaSkillPath = path.join(process.cwd(), "skills", "founder-idea", "SKILL.md");
const surfacesReferencePath = path.join(process.cwd(), "templates", "idea", "_reference", "surfaces.md");

function readMarkdown(filePath: string): string {
  return readFileSync(filePath, "utf8");
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
});
