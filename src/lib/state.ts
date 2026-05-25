import { readFile as nodeReadFile, writeFile as nodeWriteFile } from "node:fs/promises";

import { ZodError } from "zod";

import { type FounderState, StateSchema } from "../schemas/state.js";

export type StateFileErrorCode = "INVALID_JSON" | "INVALID_STATE";

export class StateFileError extends Error {
  readonly code: StateFileErrorCode;
  readonly cause: unknown;

  constructor(code: StateFileErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "StateFileError";
    this.code = code;
    this.cause = cause;
  }
}

export type StateReader = {
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string | Buffer>;
};

export type StateWriter = {
  writeFile: (filePath: string, body: string, encoding?: BufferEncoding) => Promise<void>;
};

export async function readStateJson(
  filePath: string,
  reader: StateReader = { readFile: nodeReadFile },
): Promise<FounderState> {
  const raw = await reader.readFile(filePath, "utf8");
  const body = typeof raw === "string" ? raw : raw.toString("utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new StateFileError("INVALID_JSON", `Invalid JSON in ${filePath}`, error);
  }

  try {
    return StateSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StateFileError("INVALID_STATE", `Invalid state schema in ${filePath}`, error);
    }

    throw error;
  }
}

export async function writeStateJson(
  filePath: string,
  state: unknown,
  writer: StateWriter = { writeFile: nodeWriteFile },
): Promise<void> {
  let parsed: FounderState;

  try {
    parsed = StateSchema.parse(state);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StateFileError("INVALID_STATE", `Invalid state schema for ${filePath}`, error);
    }

    throw error;
  }

  await writer.writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
