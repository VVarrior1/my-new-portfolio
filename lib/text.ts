/** Strips common Markdown syntax so an excerpt reads as plain text. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/^\s*[-*+>]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Below this many characters an excerpt is a stub ("W o"), and showing nothing reads better. */
const MIN_EXCERPT = 24;

/**
 * A list excerpt: plain text without bare URLs or a repeat of the post's own title,
 * cut at a word boundary. Returns "" when what's left is too short to be worth showing.
 */
export function excerpt(markdown: string, title = "", max = 160): string {
  let text = plainText(markdown)
    .replace(/\bhttps?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const heading = title.trim();
  if (heading && text.toLowerCase().startsWith(heading.toLowerCase())) {
    text = text.slice(heading.length).replace(/^[\s:.,–—-]+/, "");
  }
  if (text.length < MIN_EXCERPT) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[\s,;:.–—-]+$/, "")}…`;
}
