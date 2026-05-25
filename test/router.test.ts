import { describe, expect, it } from "vitest";

import { routeArgv } from "../src/router.js";

describe("routeArgv", () => {
  it("routes planned verbs to commands", () => {
    const plannedVerbs = ["init", "new", "use", "list", "status", "check", "advance"] as const;

    expect(routeArgv(["--help"])).toEqual({ ok: true, command: "help", args: [] });

    for (const verb of plannedVerbs) {
      expect(routeArgv([verb, "extra"])).toEqual({ ok: true, command: verb, args: ["extra"] });
    }
  });

  it("returns an unknown-command sentinel for unrecognized verbs", () => {
    expect(routeArgv(["nope"])).toEqual({
      ok: false,
      error: "UNKNOWN_COMMAND",
      command: "nope",
      args: [],
    });
  });
});
