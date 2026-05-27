import { type IdeaArtifactName } from "../schemas/artifacts.js";
import { type Stage } from "../schemas/state.js";

/**
 * Static definition of a single stage's expectations.
 *
 * `required`/`recommended` are typed as `IdeaArtifactName` for now because the
 * only populated stage is `idea`; the non-idea stages declare empty arrays, so
 * their element type is never exercised. Widening the artifact-name typing to
 * cover later stages is deliberately deferred (owned by a later checkpoint).
 */
export type StageDefinition = {
  required: readonly IdeaArtifactName[];
  recommended: readonly IdeaArtifactName[];
  gateCriteria: readonly string[];
  templateDir?: string;
};

/**
 * Canonical per-stage data source. `idea` carries today's manifest and gate
 * criteria verbatim; `mvp`/`launch`/`scale` are defined-but-empty placeholders
 * that later checkpoints will populate. Consumers are not repointed here — this
 * registry only establishes the data source.
 */
export const stageRegistry: Record<Stage, StageDefinition> = {
  idea: {
    required: ["problem-hypothesis", "interview-synthesis", "solution-concept"],
    recommended: [
      "competitive-landscape",
      "market-sizing",
      "trend-analysis",
      "customer-discovery-plan",
      "prototype-learnings",
    ],
    gateCriteria: [
      "problem_real_specific",
      "solution_addresses_actual_problem",
      "enough_signal_to_build",
    ],
  },
  mvp: {
    required: [],
    recommended: [],
    gateCriteria: [],
  },
  launch: {
    required: [],
    recommended: [],
    gateCriteria: [],
  },
  scale: {
    required: [],
    recommended: [],
    gateCriteria: [],
  },
};
