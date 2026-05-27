import { describe, expect, it } from "vitest";

import { stageManifest } from "../src/stages/idea.js";
import { stageOrder } from "../src/stages/order.js";
import { stageRegistry } from "../src/stages/registry.js";

// Source of truth for today's Idea definition. The registry must match these
// exactly; any later drift in the Idea sets or gate criteria must fail here.
const IDEA_REQUIRED = [
  "problem-hypothesis",
  "interview-synthesis",
  "solution-concept",
] as const;

const IDEA_RECOMMENDED = [
  "competitive-landscape",
  "market-sizing",
  "trend-analysis",
  "customer-discovery-plan",
  "prototype-learnings",
] as const;

const IDEA_GATE_CRITERIA = [
  "problem_real_specific",
  "solution_addresses_actual_problem",
  "enough_signal_to_build",
] as const;

describe("stageRegistry", () => {
  it("has an entry for every stage, keyed exactly by stageOrder", () => {
    expect(Object.keys(stageRegistry)).toEqual([...stageOrder]);
  });

  it("populates the idea stage with today's manifest and gate criteria", () => {
    expect(stageRegistry.idea.required).toEqual([...IDEA_REQUIRED]);
    expect(stageRegistry.idea.recommended).toEqual([...IDEA_RECOMMENDED]);
    expect(stageRegistry.idea.gateCriteria).toEqual([...IDEA_GATE_CRITERIA]);
  });

  it.each(["mvp", "launch", "scale"] as const)(
    "declares %s as defined-but-empty with no templateDir",
    (stage) => {
      expect(stageRegistry[stage].required).toEqual([]);
      expect(stageRegistry[stage].recommended).toEqual([]);
      expect(stageRegistry[stage].gateCriteria).toEqual([]);
      expect(stageRegistry[stage].templateDir).toBeUndefined();
    },
  );

  it("keeps the Idea sets a consumer reads identical to today's values", () => {
    expect(stageManifest.idea.required).toEqual([...IDEA_REQUIRED]);
    expect(stageManifest.idea.recommended).toEqual([...IDEA_RECOMMENDED]);
  });
});
