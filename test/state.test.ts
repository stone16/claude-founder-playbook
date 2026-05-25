import { describe, expect, it } from "vitest";

import { StateSchema } from "../src/schemas/state.js";
import { StateFileError, readStateJson, writeStateJson } from "../src/lib/state.js";

describe("StateSchema", () => {
  const validState = {
    ideaName: "Contract Review Tool",
    slug: "contract-review-tool",
    currentStage: "idea",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    overrides: [],
  };

  it("accepts a well-formed per-idea state object", () => {
    expect(StateSchema.parse(validState)).toEqual(validState);
  });

  it("rejects state missing currentStage", () => {
    const { currentStage: _currentStage, ...missingCurrentStage } = validState;

    expect(StateSchema.safeParse(missingCurrentStage).success).toBe(false);
  });

  it("rejects an unknown stage enum", () => {
    expect(StateSchema.safeParse({ ...validState, currentStage: "growth" }).success).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(StateSchema.safeParse({ ...validState, updatedAt: "May 25, 2026" }).success).toBe(false);
  });
});

describe("state.json helpers", () => {
  const state = {
    ideaName: "Contract Review Tool",
    slug: "contract-review-tool",
    currentStage: "idea",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    overrides: [],
  };

  it("reads schema-valid JSON through an injected reader", async () => {
    const readFile = async () => JSON.stringify(state);

    await expect(readStateJson("/workspace/idea/state.json", { readFile })).resolves.toEqual(state);
  });

  it("returns a typed error for invalid JSON instead of crashing", async () => {
    const readFile = async () => "{not json";

    await expect(readStateJson("/workspace/idea/state.json", { readFile })).rejects.toMatchObject({
      code: "INVALID_JSON",
    });
    await expect(readStateJson("/workspace/idea/state.json", { readFile })).rejects.toBeInstanceOf(
      StateFileError,
    );
  });

  it("returns a typed error for schema-invalid state.json", async () => {
    const readFile = async () => JSON.stringify({ ...state, currentStage: "growth" });

    await expect(readStateJson("/workspace/idea/state.json", { readFile })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("serializes schema-valid state through an injected writer", async () => {
    let writtenPath = "";
    let writtenBody = "";
    const writeFile = async (filePath: string, body: string) => {
      writtenPath = filePath;
      writtenBody = body;
    };

    await writeStateJson("/workspace/idea/state.json", state, { writeFile });

    expect(writtenPath).toBe("/workspace/idea/state.json");
    expect(JSON.parse(writtenBody)).toEqual(state);
    expect(writtenBody.endsWith("\n")).toBe(true);
  });
});
