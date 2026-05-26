import { buildIdeaList, renderIdeaList } from "../lib/report.js";

export async function listIdeas(workspaceRoot: string): Promise<number> {
  console.log(renderIdeaList(await buildIdeaList(workspaceRoot)));
  return 0;
}
