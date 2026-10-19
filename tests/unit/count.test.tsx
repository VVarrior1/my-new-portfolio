import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Count, InlineLetters } from "@/components/section";

describe("Count", () => {
  it("renders the final value for readers without JavaScript, with the parts to count", () => {
    const { container } = render(<Count value="~300" />);
    const el = container.querySelector("[data-count]") as HTMLElement;
    expect(el.dataset.count).toBe("300");
    expect(el.dataset.prefix).toBe("~");
    expect(container.querySelector(".count-run")?.textContent).toBe("~300");
  });
  it("keeps a suffix", () => {
    const { container } = render(<Count value="180K" />);
    const el = container.querySelector("[data-count]") as HTMLElement;
    expect(el.dataset.count).toBe("180");
    expect(el.dataset.suffix).toBe("K");
  });
  it("leaves text without a number alone", () => {
    const { container } = render(<Count value="Open" />);
    expect(container.querySelector("[data-count]")).toBeNull();
    expect(container.textContent).toBe("Open");
  });
});

describe("InlineLetters", () => {
  it("reads as one word and shows one letter per span", () => {
    const { container } = render(<InlineLetters text="Work" mark="tl" />);
    expect(container.querySelector(".sr-only")?.textContent).toBe("Work");
    expect(container.querySelectorAll("[data-tl]")).toHaveLength(4);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
