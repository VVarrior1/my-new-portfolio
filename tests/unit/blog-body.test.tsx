import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogDetail } from "@/components/blog-detail";
import { parseBodyToBlocks } from "@/lib/blog-body";

describe("parseBodyToBlocks", () => {
  it("keeps headings, paragraphs and images as before", () => {
    const blocks = parseBodyToBlocks("Intro line\n\n## Setup\nFirst\n\n![a shot](https://x.test/a.png)\nAfter");
    expect(blocks).toEqual([
      { paragraph: ["Intro line"] },
      { heading: "Setup", paragraph: ["First"] },
      { image: "https://x.test/a.png" },
      { paragraph: ["After"] },
    ]);
  });

  it("turns a fenced block into a code block, whitespace and language kept", () => {
    const body = "Before\n```ts\nfunction f() {\n  return 1;\n}\n\n  // indented\n```\nAfter";
    const blocks = parseBodyToBlocks(body);
    expect(blocks).toEqual([
      { paragraph: ["Before"] },
      { code: "function f() {\n  return 1;\n}\n\n  // indented", language: "ts" },
      { paragraph: ["After"] },
    ]);
  });

  it("doesn't read Markdown inside a fence, and closes an unclosed fence at the end", () => {
    const blocks = parseBodyToBlocks("```\n## not a heading\n![x](y)");
    expect(blocks).toEqual([{ code: "## not a heading\n![x](y)" }]);
  });

  it("strips the indent every line of a fence shares", () => {
    expect(parseBodyToBlocks("   ~~~py\n   x = 1\n     y = 2\n   ~~~")).toEqual([{ code: "x = 1\n  y = 2", language: "py" }]);
  });
});

describe("BlogDetail code blocks", () => {
  it("renders code as written, monospace in a focusable scroll box, with its language as a label", () => {
    const code = "const a = 1;\n  if (a) {\n    console.log('a <b> & c');\n  }";
    const { container } = render(
      <BlogDetail blog={{ slug: "s", title: "T", date: "2026-10-19", excerpt: "", content: [{ paragraph: ["Hi"] }, { code, language: "ts" }] }} />,
    );
    const pre = container.querySelector(".post-code pre") as HTMLElement;
    expect(pre).not.toBeNull();
    expect(pre.tabIndex).toBe(0);
    expect(pre.querySelector("code")?.textContent).toBe(code);
    expect(container.querySelector(".post-code figcaption")?.textContent).toBe("ts");
  });

  it("leaves the label out when no language is given", () => {
    const { container } = render(<BlogDetail blog={{ slug: "s", title: "T", date: "2026-10-19", excerpt: "", content: [{ code: "ls -la" }] }} />);
    expect(container.querySelector(".post-code figcaption")).toBeNull();
    expect(container.querySelector(".post-code code")?.textContent).toBe("ls -la");
  });
});
