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
  it("drops stubs that aren't worth showing", () => {
    expect(excerpt("W o")).toBe("");
  });

  it("removes raw URLs and a repeated title", () => {
    expect(excerpt("Writing a Shell in C. I followed https://brennan.io/2015/01/16/write-a-shell-in-c/ and then built my own.", "Writing a Shell in C")).toBe(
      "I followed and then built my own.",
    );
  });

  it("clamps at a word boundary", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    expect(excerpt(text, "", 30)).toBe("one two three four five six…");
  });
});
