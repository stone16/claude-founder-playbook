import path from "node:path";

const DEFAULT_WORKSPACE = "founder-journey";

export type WorkspaceResolutionInput = {
  argv?: readonly string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
};

export class WorkspacePathError extends Error {
  readonly code = "MISSING_WORKSPACE_VALUE";

  constructor(message: string) {
    super(message);
  }
}

function workspaceFlagValue(argv: readonly string[] = []): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--workspace") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new WorkspacePathError("--workspace requires a value");
      }
      return value;
    }

    if (arg.startsWith("--workspace=")) {
      return arg.slice("--workspace=".length);
    }
  }

  return undefined;
}

function nonBlank(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
}

function resolveFromCwd(workspacePath: string, cwd: string): string {
  return path.isAbsolute(workspacePath) ? path.normalize(workspacePath) : path.resolve(cwd, workspacePath);
}

export function resolveWorkspaceRoot(input: WorkspaceResolutionInput = {}): string {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const configuredPath = nonBlank(workspaceFlagValue(input.argv)) ?? nonBlank(env.FOUNDER_JOURNEY) ?? DEFAULT_WORKSPACE;

  return resolveFromCwd(configuredPath, cwd);
}
