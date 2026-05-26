import { z } from "zod";

export const StageSchema = z.enum(["idea", "mvp", "launch", "scale"]);

const ISO_UTC_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

const IsoDateTimeSchema = z.string().refine(
  (value) => {
    const match = ISO_UTC_DATETIME_PATTERN.exec(value);
    if (match === null) {
      return false;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return false;
    }

    const [, year, month, day, hour, minute, second, millisecond = "000"] = match;

    return (
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() + 1 === Number(month) &&
      parsedDate.getUTCDate() === Number(day) &&
      parsedDate.getUTCHours() === Number(hour) &&
      parsedDate.getUTCMinutes() === Number(minute) &&
      parsedDate.getUTCSeconds() === Number(second) &&
      parsedDate.getUTCMilliseconds() === Number(millisecond)
    );
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
