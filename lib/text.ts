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

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * A one-line teaser for a post list: plain text, with bare URLs removed, the post's own title
 * dropped when the excerpt repeats it, and the result cut at a word boundary. Returns "" when
 * what is left is too short to say anything (an excerpt like "W o").
 */
export function excerpt(markdown: string, title = "", max = 160): string {
  // A heading at the very top is the post's own title (or a variant of it), not the teaser.
  const body = markdown.replace(/^(\s*#{1,6}\s[^\n]*\n)+/, "");
  let text = plainText(body)
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  const wanted = normalize(title);
  if (wanted) {
    // An exact copy of the title at the start, plus any separator after it.
    const words = text.split(" ");
    for (let n = 1; n <= Math.min(words.length, 24); n++) {
      const head = normalize(words.slice(0, n).join(" "));
      if (head.length > wanted.length) break;
      if (head === wanted) {
        text = words.slice(n).join(" ").replace(/^[\s:\u2014\u2013-]+/, "");
        break;
      }
    }
    // A close variant of the title followed by a dash ("Writing a Simple Shell in C — ...").
    const dash = text.search(/\s[\u2014\u2013]\s/);
    if (dash > 0 && dash < 90) {
      const lead = new Set(normalize(text.slice(0, dash)).split(" "));
      const titleWords = wanted.split(" ");
      const shared = titleWords.filter((word) => lead.has(word)).length;
      if (shared / titleWords.length >= 0.75) text = text.slice(dash).replace(/^[\s\u2014\u2013]+/, "");
    }
  }

  if (text.split(" ").filter((word) => word.length > 1).length < 4) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  // Prefer ending on a sentence when one finishes late enough in the window.
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  const clipped = cut.slice(0, space > max * 0.6 ? space : max).replace(/[\s,;:\u2014\u2013-]+$/, "");
  // Ending on a full sentence reads better without an ellipsis after the period.
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}\u2026`;
}
