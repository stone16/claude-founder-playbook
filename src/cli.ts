#!/usr/bin/env node
import { plannedCommands, routeArgv } from "./router.js";

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

export function main(argv = process.argv.slice(2)): number {
  const result = routeArgv(argv);

  if (result.ok) {
    console.log(usage());
    return 0;
  }

  console.error(`Unknown command: ${result.command}`);
  console.error(usage());
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
