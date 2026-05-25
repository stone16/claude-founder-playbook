import path from "node:path";

const DEFAULT_WORKSPACE = "founder-journey";

export type WorkspaceResolutionInput = {
  argv?: readonly string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
};

function workspaceFlagValue(argv: readonly string[] = []): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--workspace") {
      return argv[index + 1];
    }

    if (arg.startsWith("--workspace=")) {
      return arg.slice("--workspace=".length);
    }
  }

  return undefined;
}

function resolveFromCwd(workspacePath: string, cwd: string): string {
  return path.isAbsolute(workspacePath) ? path.normalize(workspacePath) : path.resolve(cwd, workspacePath);
}

export function resolveWorkspaceRoot(input: WorkspaceResolutionInput = {}): string {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const configuredPath = workspaceFlagValue(input.argv) ?? env.FOUNDER_JOURNEY ?? DEFAULT_WORKSPACE;

  return resolveFromCwd(configuredPath, cwd);
}
