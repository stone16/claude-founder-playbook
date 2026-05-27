import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../src/schemas/artifacts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoIdeaDir = path.join(repoRoot, "founder-journey", "ai-agent", "idea");

const demoArtifactFiles = readdirSync(demoIdeaDir)
  .filter((name) => name.endsWith(".md") && name !== "GATE.md")
  .sort();

describe("ai-agent demo Idea artifacts parse against ArtifactFrontmatterSchema", () => {
  it("includes every non-gate idea artifact", () => {
    // Guard against an empty glob silently passing the it.each below.
    expect(demoArtifactFiles.length).toBe(8);
  });

  it.each(demoArtifactFiles)("%s frontmatter is structurally valid", (fileName) => {
    const raw = readFileSync(path.join(demoIdeaDir, fileName), "utf8");
    const { data } = matter(raw);

    const result = ArtifactFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
