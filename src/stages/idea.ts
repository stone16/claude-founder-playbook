import { type IdeaArtifactName } from "../schemas/artifacts.js";
import { stageRegistry } from "./registry.js";

type IdeaStageManifest = {
  required: IdeaArtifactName[];
  recommended: IdeaArtifactName[];
};

// Derived alias: the per-stage registry is the canonical source. This keeps the
// existing `stageManifest.idea.{required,recommended}` shape and type so all
// current importers compile unchanged while consumers are migrated later.
export const stageManifest: { idea: IdeaStageManifest } = {
  idea: {
    required: [...stageRegistry.idea.required],
    recommended: [...stageRegistry.idea.recommended],
  },
};
