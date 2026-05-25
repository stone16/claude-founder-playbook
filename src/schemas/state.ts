import { z } from "zod";

export const StageSchema = z.enum(["idea", "mvp", "launch", "scale"]);

const IsoDateTimeSchema = z.string().refine(
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
      return false;
    }

    return !Number.isNaN(Date.parse(value));
  },
  { message: "Expected an ISO-8601 UTC datetime" },
);

export const OverrideSchema = z.object({
  stage: StageSchema,
  reason: z.string().min(1),
  date: IsoDateTimeSchema,
  artifact: z.string().min(1),
});

export const StateSchema = z.object({
  ideaName: z.string().min(1),
  slug: z.string().min(1),
  currentStage: StageSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  overrides: z.array(OverrideSchema),
});

export type Stage = z.infer<typeof StageSchema>;
export type FounderState = z.infer<typeof StateSchema>;
