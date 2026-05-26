import { describe, expect, it } from "vitest";

import { ArtifactFrontmatterSchema } from "../src/schemas/artifacts.js";
import { GateSchema } from "../src/schemas/gate.js";

describe("ArtifactFrontmatterSchema", () => {
  const validFrontmatter = {
    artifact: "problem-hypothesis",
    stage: "idea",
    status: "draft",
    updated: "2026-05-25T00:00:00.000Z",
    evidence: ["interview-synthesis.md#pain-points"],
  };

  it("accepts well-formed Idea artifact frontmatter", () => {
    expect(ArtifactFrontmatterSchema.parse(validFrontmatter)).toEqual(validFrontmatter);
  });

  it.each([
    ["artifact"],
    ["stage"],
    ["status"],
    ["updated"],
    ["evidence"],
  ])("rejects frontmatter missing %s", (field) => {
    const incomplete: Record<string, unknown> = { ...validFrontmatter };
    delete incomplete[field];

    expect(ArtifactFrontmatterSchema.safeParse(incomplete).success).toBe(false);
  });

  it.each([
    ["artifact", "unknown-artifact"],
    ["stage", "mvp"],
    ["status", "blocked"],
  ])("rejects invalid %s enum values", (field, value) => {
    expect(
      ArtifactFrontmatterSchema.safeParse({ ...validFrontmatter, [field]: value }).success,
    ).toBe(false);
  });

  it("rejects evidence that is not a string array", () => {
    expect(
      ArtifactFrontmatterSchema.safeParse({ ...validFrontmatter, evidence: [42] }).success,
    ).toBe(false);
  });
});

describe("GateSchema", () => {
  const validGate = {
    status: "draft",
    override: null,
    criteria: {
      problem_real_specific: {
        answer: null,
        evidence: [],
      },
      solution_addresses_actual_problem: {
        answer: false,
        evidence: ["problem-hypothesis.md#actual-problem"],
      },
      enough_signal_to_build: {
        answer: true,
        evidence: ["interview-synthesis.md#buying-signal"],
      },
    },
  };

  it("accepts the Idea gate shape", () => {
    expect(GateSchema.parse(validGate)).toEqual(validGate);
  });

  it("accepts a nullable or written override", () => {
    expect(GateSchema.safeParse({ ...validGate, override: "Founder judgment call" }).success).toBe(
      true,
    );
  });

  it.each([
    ["problem_real_specific"],
    ["solution_addresses_actual_problem"],
    ["enough_signal_to_build"],
  ])("requires criterion %s", (criterion) => {
    const criteria: Record<string, unknown> = { ...validGate.criteria };
    delete criteria[criterion];

    expect(GateSchema.safeParse({ ...validGate, criteria }).success).toBe(false);
  });

  it.each([true, false, null])("accepts %s as a criterion answer", (answer) => {
    expect(
      GateSchema.safeParse({
        ...validGate,
        criteria: {
          ...validGate.criteria,
          problem_real_specific: {
            answer,
            evidence: [],
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects invalid criterion answers", () => {
    expect(
      GateSchema.safeParse({
        ...validGate,
        criteria: {
          ...validGate.criteria,
          problem_real_specific: {
            answer: "yes",
            evidence: [],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid status enum values", () => {
    expect(GateSchema.safeParse({ ...validGate, status: "blocked" }).success).toBe(false);
  });
});
