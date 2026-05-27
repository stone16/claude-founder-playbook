#!/usr/bin/env node
import { plannedCommands, routeArgv } from "./router.js";
import { initWorkspace } from "./commands/init.js";
import { createIdea } from "./commands/new.js";
import { useIdea } from "./commands/use.js";
import { checkIdea } from "./commands/check.js";
import { statusIdea } from "./commands/status.js";
import { listIdeas } from "./commands/list.js";
import { advanceIdea } from "./commands/advance.js";
import { positionalArgs } from "./lib/args.js";
import {
  resolveWorkspaceRoot,
  WorkspacePathError,
  type WorkspaceResolutionInput,
} from "./lib/paths.js";

export function usage(): string {
  const commandList = plannedCommands.join(", ");

  return [
    "Usage: founder <command> [options]",
    "",
    `Commands: ${commandList}`,
    "",
    "Run founder --help to print this message.",
  ].join("\n");
}

type CommandError = Error & { code?: string };

function commandMessage(error: CommandError): string {
  return error.code === undefined ? error.message : `${error.code}: ${error.message}`;
}

type GlobalWorkspace = {
  argv: string[];
  workspace?: string;
};

// Pulls the global --workspace flag from anywhere in argv so the verb is found
// whether the flag precedes or follows it. Only --workspace is removed; every
// other flag (e.g. --override) is left in place for the command to parse.
function extractGlobalWorkspace(argv: readonly string[]): GlobalWorkspace {
  const remaining: string[] = [];
  let workspace: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (workspace === undefined && arg === "--workspace") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new WorkspacePathError("--workspace requires a value");
      }
      workspace = value;
      index += 1;
      continue;
    }

    if (workspace === undefined && arg.startsWith("--workspace=")) {
      workspace = arg.slice("--workspace=".length);
      continue;
    }

    remaining.push(arg);
  }

  return { argv: remaining, workspace };
}

export async function main(
  argv = process.argv.slice(2),
  resolution: WorkspaceResolutionInput = {},
): Promise<number> {
  let global: GlobalWorkspace;
  try {
    global = extractGlobalWorkspace(argv);
  } catch (error) {
    console.error(commandMessage(error as CommandError));
    return 1;
  }

  const result = routeArgv(global.argv);

  if (result.ok && result.command === "help") {
    console.log(usage());
    return 0;
  }

  // Precedence: an explicit global --workspace beats the injected resolution,
  // which in turn beats process env/cwd defaults.
  const resolutionInput: WorkspaceResolutionInput =
    global.workspace === undefined
      ? resolution
      : { ...resolution, argv: ["--workspace", global.workspace] };

  if (result.ok) {
    try {
      const workspaceRoot = resolveWorkspaceRoot(resolutionInput);

      if (result.command === "init") {
        await initWorkspace(workspaceRoot);
        console.log(`Initialized founder workspace at ${workspaceRoot}`);
        return 0;
      }

      if (result.command === "new") {
        const [ideaName] = positionalArgs(result.args);
        if (ideaName === undefined) {
          console.error("Missing idea name");
          return 1;
        }

        const slug = await createIdea(workspaceRoot, ideaName);
        console.log(`Created founder idea ${slug}`);
        return 0;
      }

      if (result.command === "use") {
        const [slug] = positionalArgs(result.args);
        if (slug === undefined) {
          console.error("Missing idea slug");
          return 1;
        }

        await useIdea(workspaceRoot, slug);
        console.log(`Using founder idea ${slug}`);
        return 0;
      }

      if (result.command === "check") {
        return await checkIdea(workspaceRoot, result.args);
      }

      if (result.command === "status") {
        return await statusIdea(workspaceRoot, result.args);
      }

      if (result.command === "list") {
        return await listIdeas(workspaceRoot);
      }

      if (result.command === "advance") {
        return await advanceIdea(workspaceRoot, result.args);
      }
    } catch (error) {
      console.error(commandMessage(error as CommandError));
      return 1;
    }

    console.log(usage());
    return 0;
  }

  console.error(`Unknown command: ${result.command}`);
  console.error(usage());
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
