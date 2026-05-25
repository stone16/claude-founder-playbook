import { describe, expect, it } from "vitest";

import { IllegalStageTransitionError, advanceStage } from "../src/lib/transition.js";
import { type FounderState } from "../src/schemas/state.js";

const baseState: FounderState = {
  ideaName: "Contract Review Tool",
  slug: "contract-review-tool",
  currentStage: "idea",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
  overrides: [],
};

describe("advanceStage", () => {
  it("moves from the current stage to the next stage", () => {
    expect(advanceStage(baseState, "idea", "2026-05-26T00:00:00.000Z")).toMatchObject({
      currentStage: "mvp",
      updatedAt: "2026-05-26T00:00:00.000Z",
      overrides: [],
    });
  });

  it("rejects attempts to advance a stage that is not current with a typed error", () => {
    const state = { ...baseState, currentStage: "mvp" as const };

    expect(() => advanceStage(state, "idea", "2026-05-26T00:00:00.000Z")).toThrow(IllegalStageTransitionError);
    expect(() => advanceStage(state, "idea", "2026-05-26T00:00:00.000Z")).toThrow(
      "Cannot advance idea while currentStage is mvp",
    );

    try {
      advanceStage(state, "idea", "2026-05-26T00:00:00.000Z");
    } catch (error) {
      expect(error).toMatchObject({ code: "ILLEGAL_STAGE_TRANSITION" });
    }
  });
});
