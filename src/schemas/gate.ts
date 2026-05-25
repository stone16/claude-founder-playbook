import { z } from "zod";

import { ArtifactStatusSchema } from "./artifacts.js";

const GateCriterionSchema = z.object({
  answer: z.boolean().nullable(),
  evidence: z.array(z.string()),
});

export const GateSchema = z.object({
  status: ArtifactStatusSchema,
  override: z.string().min(1).nullable(),
  criteria: z.object({
    problem_real_specific: GateCriterionSchema,
    solution_addresses_actual_problem: GateCriterionSchema,
    enough_signal_to_build: GateCriterionSchema,
  }),
});

export type Gate = z.infer<typeof GateSchema>;
