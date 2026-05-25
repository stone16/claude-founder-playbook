const PLACEHOLDER_LINES = new Set(["tbd", "todo", "placeholder", "fill me in", "n/a"]);
const PLACEHOLDER_PREFIX = /^(tbd|todo|fixme|placeholder|fill me in|n\/a)\b(?:\s*[:-].*)?$/;

export function isPlaceholderBody(body: string): boolean {
  const contentLines = body
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line !== "" && !line.startsWith("#") && line !== "---");

  if (contentLines.length === 0) {
    return true;
  }

  return contentLines.every(
    (line) => PLACEHOLDER_LINES.has(line) || PLACEHOLDER_PREFIX.test(line) || line.includes("lorem ipsum"),
  );
}
