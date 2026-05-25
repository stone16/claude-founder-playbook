const PLACEHOLDER_LINES = new Set(["tbd", "todo", "placeholder", "fill me in", "n/a"]);

export function isPlaceholderBody(body: string): boolean {
  const contentLines = body
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line !== "" && !line.startsWith("#") && line !== "---");

  if (contentLines.length === 0) {
    return true;
  }

  return contentLines.every((line) => PLACEHOLDER_LINES.has(line) || line.includes("lorem ipsum"));
}
