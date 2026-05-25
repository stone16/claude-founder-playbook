import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SURFACES_REFERENCE = `# Founder Journey Surfaces

Use Chat for founder interviews and synthesis, Cowork for structured artifact writing, and Code for deterministic validation through the founder CLI.
`;

async function writeSeedFile(filePath: string, body: string): Promise<void> {
  try {
    await writeFile(filePath, body, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
      return;
    }

    throw error;
  }
}

export async function initWorkspace(workspaceRoot: string): Promise<void> {
  const referenceDir = path.join(workspaceRoot, "_reference");

  await mkdir(referenceDir, { recursive: true });
  await writeSeedFile(path.join(referenceDir, "surfaces.md"), SURFACES_REFERENCE);
}
