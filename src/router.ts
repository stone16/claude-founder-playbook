export const plannedCommands = ["init", "new", "use", "list", "status", "check", "advance"] as const;

export type PlannedCommand = (typeof plannedCommands)[number];
export type Command = PlannedCommand | "help";

export type RouteResult =
  | {
      ok: true;
      command: Command;
      args: string[];
    }
  | {
      ok: false;
      error: "UNKNOWN_COMMAND";
      command: string;
      args: string[];
    };

const helpFlags = new Set(["", "--help", "-h", "help"]);
const plannedCommandSet = new Set<string>(plannedCommands);

export function routeArgv(argv: string[]): RouteResult {
  const [verb = "", ...args] = argv;

  if (helpFlags.has(verb)) {
    return { ok: true, command: "help", args };
  }

  if (plannedCommandSet.has(verb)) {
    return { ok: true, command: verb as PlannedCommand, args };
  }

  return {
    ok: false,
    error: "UNKNOWN_COMMAND",
    command: verb,
    args,
  };
}
