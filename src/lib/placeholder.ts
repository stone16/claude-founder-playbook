const PLACEHOLDER_LINES = new Set(["tbd", "todo", "placeholder", "fill me in", "n/a"]);
const PLACEHOLDER_PREFIX = /^(tbd|todo|fixme|placeholder|fill me in|n\/a)\b(?:\s*[:-].*)?$/;

function contentLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line !== "" && !line.startsWith("#") && line !== "---");
}

function isPlaceholderLine(line: string): boolean {
  return PLACEHOLDER_LINES.has(line) || PLACEHOLDER_PREFIX.test(line) || line.includes("lorem ipsum");
}

export function isPlaceholderBody(body: string): boolean {
  const lines = contentLines(body);

  if (lines.length === 0) {
    return true;
  }

  return lines.every(isPlaceholderLine);
}

/**
 * True when SOME but NOT ALL content lines are placeholder. An empty body
 * (no content lines) and a fully placeholder body are NOT partial — those are
 * the blocking `isPlaceholderBody` case. A body with zero placeholder lines is
 * not partial either.
 */
export function hasPartialPlaceholderBody(body: string): boolean {
  const lines = contentLines(body);

  if (lines.length === 0) {
    return false;
  }

  const placeholderCount = lines.filter(isPlaceholderLine).length;
  return placeholderCount > 0 && placeholderCount < lines.length;
}
