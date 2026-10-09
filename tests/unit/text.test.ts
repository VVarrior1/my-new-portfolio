import { describe, expect, it } from "vitest";
import { plainText } from "@/lib/text";

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
