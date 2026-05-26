import { setActiveIdea } from "../lib/active.js";

export async function useIdea(workspaceRoot: string, slug: string): Promise<string> {
  await setActiveIdea(workspaceRoot, slug);
  return slug;
}
