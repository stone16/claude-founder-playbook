import { afterEach, describe, expect, it, vi } from "vitest";

import { main, usage } from "../src/cli.js";

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
});
