import { type Stage } from "../schemas/state.js";

export const stageOrder = ["idea", "mvp", "launch", "scale"] as const satisfies readonly Stage[];

export function nextStage(stage: Stage): Stage | undefined {
  const currentIndex = stageOrder.indexOf(stage);
  return stageOrder[currentIndex + 1];
}
