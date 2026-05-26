import { readFileSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../src/schemas/artifacts.js";
import { GateSchema } from "../src/schemas/gate.js";
import { stageManifest } from "../src/stages/idea.js";

const ideaTemplateDir = path.join(process.cwd(), "templates", "idea");

function readFrontmatter(templateName: string): unknown {
  return matter(readFileSync(path.join(ideaTemplateDir, templateName), "utf8")).data;
}

describe("Idea artifact templates", () => {
  const allArtifacts = [...stageManifest.idea.required, ...stageManifest.idea.recommended];

  it("declares the expected required and recommended artifact sets", () => {
    expect(stageManifest.idea.required).toEqual([
      "problem-hypothesis",
      "interview-synthesis",
      "solution-concept",
    ]);
    expect(stageManifest.idea.recommended).toEqual([
      "competitive-landscape",
      "market-sizing",
      "trend-analysis",
      "customer-discovery-plan",
      "prototype-learnings",
    ]);
  });

  it.each(allArtifacts)("%s.md exists and has draft-valid frontmatter", (artifact) => {
    const frontmatter = readFrontmatter(`${artifact}.md`);

    expect(ArtifactFrontmatterSchema.parse(frontmatter)).toMatchObject({
      artifact,
      stage: "idea",
      status: "draft",
    });
  });

  it("has a template for every manifest entry", () => {
    expect(allArtifacts).toHaveLength(8);

    for (const artifact of allArtifacts) {
      expect(() => readFrontmatter(`${artifact}.md`)).not.toThrow();
    }
  });

  it("has a draft-valid GATE.md template", () => {
    const frontmatter = readFrontmatter("GATE.md");

    expect(GateSchema.parse(frontmatter)).toMatchObject({
      status: "draft",
      override: null,
    });
  });
});
