import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { main, usage } from "../src/cli.js";
import { WorkspacePathError } from "../src/lib/paths.js";

async function createWorkspace(prefix: string): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), prefix));
}

describe("usage", () => {
  it("prints planned commands", () => {
    expect(usage()).toContain("init, new, use, list, status, check, advance");
  });
});

describe("main", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints usage and returns zero for help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["--help"])).toBe(0);
    expect(log).toHaveBeenCalledWith(usage());
  });

  it("prints an error, usage, and returns non-zero for unknown commands", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["unknown"])).toBe(1);
    expect(error).toHaveBeenCalledWith("Unknown command: unknown");
    expect(error).toHaveBeenCalledWith(usage());
  });

  it("returns non-zero when new or use are missing required arguments", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["new"])).toBe(1);
    expect(await main(["use"])).toBe(1);

    expect(error).toHaveBeenCalledWith("Missing idea name");
    expect(error).toHaveBeenCalledWith("Missing idea slug");
  });

  it("returns non-zero when advance has no idea selection", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const workspace = await createWorkspace("founder-cli-advance-");

    expect(await main(["advance"], { argv: ["--workspace", workspace] })).toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("MISSING_IDEA_SELECTION"));
  });

  it("returns non-zero when --workspace is missing a value", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["init", "--workspace"])).toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("MISSING_WORKSPACE_VALUE"));
  });
});

describe("main global --workspace flag", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves to the same workspace whether --workspace precedes or follows the verb", async () => {
    const workspace = await createWorkspace("founder-cli-global-");

    expect(await main(["--workspace", workspace, "init"])).toBe(0);

    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["status", "--workspace", workspace])).toBe(1);
    expect(await main(["--workspace", workspace, "status"])).toBe(1);

    log.mockRestore();

    const before = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await main(["new", "--workspace", workspace, "Same Workspace Idea"])).toBe(0);
    expect(before).toHaveBeenCalledWith(expect.stringContaining("same-workspace-idea"));
    before.mockRestore();

    const after = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await main(["status", "same-workspace-idea", "--workspace", workspace])).toBe(0);
    after.mockRestore();
  });

  it("routes the verb correctly when a global --workspace precedes it", async () => {
    const workspace = await createWorkspace("founder-cli-route-");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["--workspace", workspace, "init"])).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Initialized founder workspace"));
  });

  it("still errors on an unknown verb that follows a global --workspace", async () => {
    const workspace = await createWorkspace("founder-cli-unknown-");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["--workspace", workspace, "bogus"])).toBe(1);
    expect(error).toHaveBeenCalledWith("Unknown command: bogus");
  });

  it("does not consume a non-workspace flag that follows the verb", async () => {
    const workspace = await createWorkspace("founder-cli-override-");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["new", "Contract Review Tool", "--workspace", workspace])).toBe(0);

    // The Idea gate is unmet, so advance is blocked unless --override reaches the command.
    expect(await main(["advance", "contract-review-tool", "--override", "forced reason", "--workspace", workspace])).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("ADVANCED: contract-review-tool"));
  });

  it("throws WorkspacePathError when --workspace has no value before the verb", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    // The next token is another flag, so --workspace has no value of its own.
    expect(await main(["--workspace", "--help"])).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("MISSING_WORKSPACE_VALUE"));
  });

  it("throws WorkspacePathError when --workspace has no value after the verb", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await main(["status", "--workspace"])).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("MISSING_WORKSPACE_VALUE"));
  });
});

describe("main injectable resolution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses an injected workspace resolution without reading the repo default", async () => {
    const workspace = await createWorkspace("founder-cli-inject-");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["init"], { cwd: workspace, env: {} })).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(path.join(workspace, "founder-journey")));
  });

  it("lets an explicit global --workspace override the injected resolution", async () => {
    const explicit = await createWorkspace("founder-cli-explicit-");
    const injected = await createWorkspace("founder-cli-injected-");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["--workspace", explicit, "init"], { cwd: injected, env: {} })).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(explicit));
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining(path.join(injected, "founder-journey")));
  });

  it("keeps the back-compat main(argv)-only call form working", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await main(["--help"])).toBe(0);
    expect(log).toHaveBeenCalledWith(usage());
  });
});

describe("WorkspacePathError export", () => {
  it("is re-exported for callers extracting the global flag", () => {
    expect(new WorkspacePathError("x")).toBeInstanceOf(Error);
  });
});
