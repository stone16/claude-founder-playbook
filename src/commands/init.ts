import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..");
const surfacesTemplatePath = path.join(repoRoot, "templates", "idea", "_reference", "surfaces.md");

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
  const surfacesReference = await readFile(surfacesTemplatePath, "utf8");

  await mkdir(referenceDir, { recursive: true });
  await writeSeedFile(path.join(referenceDir, "surfaces.md"), surfacesReference);
}
