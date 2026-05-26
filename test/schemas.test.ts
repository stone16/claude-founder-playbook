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

  it("accepts a non-idea stage value", () => {
    expect(
      ArtifactFrontmatterSchema.safeParse({ ...validFrontmatter, stage: "mvp" }).success,
    ).toBe(true);
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
    ["stage", "prototype"],
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

  it("accepts a gate whose criteria is an empty key set", () => {
    expect(GateSchema.safeParse({ ...validGate, criteria: {} }).success).toBe(true);
  });

  it("accepts a gate whose criteria uses a different key set", () => {
    expect(
      GateSchema.safeParse({
        ...validGate,
        criteria: { mvp_some_key: { answer: null, evidence: [] } },
      }).success,
    ).toBe(true);
  });

  it.each([
    ["missing answer", { evidence: [] }],
    ["missing evidence", { answer: null }],
    ["non-array evidence", { answer: null, evidence: "not-an-array" }],
    ["wrong-typed answer", { answer: "yes", evidence: [] }],
  ])("rejects a malformed criterion value: %s", (_label, criterion) => {
    expect(
      GateSchema.safeParse({
        ...validGate,
        criteria: { problem_real_specific: criterion },
      }).success,
    ).toBe(false);
  });

  it("rejects a non-object criteria", () => {
    expect(GateSchema.safeParse({ ...validGate, criteria: "x" }).success).toBe(false);
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
