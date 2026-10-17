import { describe, expect, it } from "vitest";
import { excerpt, plainText } from "@/lib/text";

describe("plainText", () => {
  it("removes headings, emphasis, links and images", () => {
    expect(plainText("# Writing a Shell in C\n\nI **really** liked [this](https://x.com) ![pic](a.png)")).toBe(
      "Writing a Shell in C I really liked this",
    );
  });

  it("leaves plain prose alone", () => {
    expect(plainText("You can lose 50% of the time - and still win.")).toBe("You can lose 50% of the time - and still win.");
  });
});

describe("excerpt", () => {
  it("drops a stub excerpt instead of showing it", () => {
    expect(excerpt("W o", "Prompt Engineering")).toBe("");
  });

  it("strips bare URLs and a leading repeat of the title", () => {
    expect(excerpt("Writing a Shell in C: notes from https://brennan.io/2015/01/16/write-a-shell-in-c/ and my own shell", "Writing a Shell in C")).toBe(
      "notes from and my own shell",
    );
  });

  it("cuts long text at a word boundary", () => {
    const text = "Imagine placing 100 people in a straight line and passing a dollar along it for a hug each time.";
    const out = excerpt(text, "", 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(out.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("returns short-enough prose unchanged", () => {
    expect(excerpt("You can lose 50% of the time and still make a fortune.")).toBe("You can lose 50% of the time and still make a fortune.");
  });
});
