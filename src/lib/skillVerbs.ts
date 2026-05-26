import { plannedCommands } from "../router.js";

export const implementedFounderVerbs = new Set<string>(plannedCommands);

export function extractFounderCliVerbs(markdown: string): Set<string> {
  const verbs = new Set<string>();
  const commandPattern = /`founder\s+([a-z][a-z-]*)\b/g;

  for (const match of markdown.matchAll(commandPattern)) {
    verbs.add(match[1]);
  }

  return verbs;
}
