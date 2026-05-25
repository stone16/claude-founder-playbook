import { z } from "zod";

export const IdeaArtifactNameSchema = z.enum([
  "problem-hypothesis",
  "competitive-landscape",
  "market-sizing",
  "trend-analysis",
  "customer-discovery-plan",
  "interview-synthesis",
  "solution-concept",
  "prototype-learnings",
]);

export const ArtifactStatusSchema = z.enum(["draft", "complete"]);

const ISO_UTC_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

export const ArtifactUpdatedSchema = z.string().refine(
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

export const ArtifactFrontmatterSchema = z.object({
  artifact: IdeaArtifactNameSchema,
  stage: z.literal("idea"),
  status: ArtifactStatusSchema,
  updated: ArtifactUpdatedSchema,
  evidence: z.array(z.string()),
});

export type IdeaArtifactName = z.infer<typeof IdeaArtifactNameSchema>;
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;
export type ArtifactFrontmatter = z.infer<typeof ArtifactFrontmatterSchema>;
