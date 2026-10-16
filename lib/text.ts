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

/**
 * A one-line excerpt for a post list: plain text without raw URLs or a repeated title, clamped at a
 * word boundary. Returns "" when there's too little to be worth showing (a stub like "W o").
 */
export function excerpt(markdown: string, title = "", max = 160): string {
  let text = plainText(markdown)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const heading = title.trim();
  if (heading && text.toLowerCase().startsWith(heading.toLowerCase())) text = text.slice(heading.length).replace(/^[\s:.,-]+/, "");
  if (text.split(" ").filter((word) => word.length > 1).length < 4) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${cut.slice(0, end > max * 0.6 ? end : max).replace(/[\s,;:.–—-]+$/, "")}…`;
}
