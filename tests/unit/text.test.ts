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
  it("drops a leading copy of the title and the separator after it", () => {
    expect(
      excerpt("Writing a Simple Shell in C — A Quick Reflection I recently followed a classic tutorial.", "Writing a Simple Shell in C"),
    ).toBe("A Quick Reflection I recently followed a classic tutorial.");
  });

  it("drops a close variant of the title before a dash", () => {
    expect(excerpt("Writing a Simple Shell in C \u2014 A Quick Reflection I recently followed a tutorial on shells.", "Writing a Shell in C")).toBe(
      "A Quick Reflection I recently followed a tutorial on shells.",
    );
  });

  it("drops a leading Markdown heading", () => {
    expect(excerpt("# Money 101\n\nImagine placing 100 people in a straight line.", "Money 101")).toBe(
      "Imagine placing 100 people in a straight line.",
    );
  });

  it("removes bare URLs", () => {
    expect(excerpt("I followed the tutorial at https://brennan.io/2015/01/16/write-a-shell-in-c/ and it was good.")).toBe(
      "I followed the tutorial at and it was good.",
    );
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    const text = "Imagine placing 100 people in a straight line and giving the first person one dollar to pass along";
    const out = excerpt(text, "", 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
  });

  it("ends on a full sentence without an ellipsis", () => {
    expect(excerpt("One sentence ends here. And another one keeps going for a long while after it", "", 30)).toBe("One sentence ends here.");
  });

  it("returns nothing for an excerpt too short to read", () => {
    expect(excerpt("W o", "Prompt Engineering")).toBe("");
  });

  it("keeps short complete excerpts whole", () => {
    expect(excerpt("You can lose 50% of the time and still make a fortune.")).toBe("You can lose 50% of the time and still make a fortune.");
  });
});
