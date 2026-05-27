import { z } from "zod";

import { ArtifactStatusSchema } from "./artifacts.js";

export const GateCriterionSchema = z.object({
  answer: z.boolean().nullable(),
  evidence: z.array(z.string()),
});

export const GateSchema = z.object({
  status: ArtifactStatusSchema,
  override: z.string().min(1).nullable(),
  criteria: z.record(z.string(), GateCriterionSchema),
});

export type Gate = z.infer<typeof GateSchema>;
