import { type IdeaArtifactName } from "../schemas/artifacts.js";

type IdeaStageManifest = {
  required: IdeaArtifactName[];
  recommended: IdeaArtifactName[];
};

export const stageManifest: { idea: IdeaStageManifest } = {
  idea: {
    required: ["problem-hypothesis", "interview-synthesis", "solution-concept"],
    recommended: [
      "competitive-landscape",
      "market-sizing",
      "trend-analysis",
      "customer-discovery-plan",
      "prototype-learnings",
    ],
  },
};
