import type { BlogContentBlock } from "@/lib/blogs";

/**
 * Turns a post body written in /admin into blocks: `## ` starts a headed block, a line that is only
 * `![alt](url)` is an image, a fenced block (```lang ... ```) is a code block with its whitespace
 * kept, and everything else is Markdown paragraphs. An unclosed fence runs to the end of the body.
 */
export function parseBodyToBlocks(body: string): BlogContentBlock[] {
  const lines = body.split(/\r?\n/);
  const blocks: BlogContentBlock[] = [];
  let current: { heading?: string; paragraph: string[] } | null = null;
  let fence: { marker: string; language?: string; lines: string[] } | null = null;

  const pushCurrent = () => {
    if (current) {
      blocks.push({ ...current });
      current = null;
    }
  };

  for (const rawLine of lines) {
    if (fence) {
      if (rawLine.trim().startsWith(fence.marker) && rawLine.trim().replace(/`|~/g, "") === "") {
        blocks.push({ code: dedent(fence.lines), ...(fence.language ? { language: fence.language } : {}) });
        fence = null;
      } else {
        fence.lines.push(rawLine.replace(/\s+$/, ""));
      }
      continue;
    }

    const line = rawLine.trim();
    const open = line.match(/^(`{3,}|~{3,})\s*([\w#+.-]*)/);
    if (open) {
      pushCurrent();
      fence = { marker: open[1], language: open[2] || undefined, lines: [] };
      continue;
    }

    if (!line) {
      if (current && current.paragraph.length) current.paragraph.push("");
      continue;
    }

    const imageMatch = line.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (imageMatch) {
      pushCurrent();
      blocks.push({ image: imageMatch[1] });
      continue;
    }

    if (line.startsWith("## ")) {
      pushCurrent();
      current = { heading: line.replace(/^##\s+/, ""), paragraph: [] };
      continue;
    }

    if (!current) current = { paragraph: [] };
    current.paragraph.push(line);
  }

  if (fence) blocks.push({ code: dedent(fence.lines), ...(fence.language ? { language: fence.language } : {}) });
  pushCurrent();

  return blocks
    .map((block) => (block.paragraph ? { ...block, paragraph: block.paragraph.filter((p) => p.trim().length) } : block))
    .filter((block) => block.heading || block.paragraph?.length || block.image || block.code);
}

/** Strips blank lines at either end and the indent every line shares (a fence inside a list, say). */
function dedent(lines: string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;
  const body = lines.slice(start, end);
  const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length));
  return body.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
}
