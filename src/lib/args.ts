export function positionalArgs(args: readonly string[]): string[] {
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace") {
      index += 1;
      continue;
    }

    if (arg.startsWith("--workspace=")) {
      continue;
    }

    positionals.push(arg);
  }

  return positionals;
}
