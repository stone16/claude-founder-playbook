import { type FounderState, type Stage } from "../schemas/state.js";
import { nextStage } from "../stages/order.js";

export class IllegalStageTransitionError extends Error {
  readonly code = "ILLEGAL_STAGE_TRANSITION";

  constructor(readonly requestedStage: Stage, readonly currentStage: Stage) {
    super(`Cannot advance ${requestedStage} while currentStage is ${currentStage}`);
    this.name = "IllegalStageTransitionError";
  }
}

export class TerminalStageTransitionError extends Error {
  readonly code = "TERMINAL_STAGE";

  constructor(readonly stage: Stage) {
    super(`Cannot advance past terminal stage ${stage}`);
    this.name = "TerminalStageTransitionError";
  }
}

type OverrideLogEntry = FounderState["overrides"][number];

export function advanceStage(
  state: FounderState,
  requestedStage: Stage,
  advancedAt: string,
  override?: OverrideLogEntry,
): FounderState {
  if (state.currentStage !== requestedStage) {
    throw new IllegalStageTransitionError(requestedStage, state.currentStage);
  }

  const next = nextStage(requestedStage);
  if (next === undefined) {
    throw new TerminalStageTransitionError(requestedStage);
  }

  return {
    ...state,
    currentStage: next,
    updatedAt: advancedAt,
    overrides: override === undefined ? state.overrides : [...state.overrides, override],
  };
}
