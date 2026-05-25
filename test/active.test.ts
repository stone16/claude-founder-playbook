import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { activePointerPath, ideaExists, readActiveIdea, setActiveIdea } from "../src/lib/active.js";

describe("active idea helper", () => {
  it("reports existing idea directories and missing slugs", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-active-"));
    await mkdir(path.join(workspace, "contract-review-tool"));

    await expect(ideaExists(workspace, "contract-review-tool")).resolves.toBe(true);
    await expect(ideaExists(workspace, "missing")).resolves.toBe(false);
  });

  it("writes, reads, and trims the active pointer", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-active-"));
    await mkdir(path.join(workspace, "contract-review-tool"));

    await setActiveIdea(workspace, "contract-review-tool");

    await expect(readActiveIdea(workspace)).resolves.toBe("contract-review-tool");
  });

  it("returns undefined for absent or blank active pointers", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "founder-active-"));

    await expect(readActiveIdea(workspace)).resolves.toBeUndefined();
    await writeFile(activePointerPath(workspace), "\n", "utf8");
    await expect(readActiveIdea(workspace)).resolves.toBeUndefined();
  });
});
