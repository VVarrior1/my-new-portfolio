import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ""} />,
}));

import { GalleryImage } from "@/components/gallery-image";

describe("GalleryImage", () => {
  it("applies accessible labels and forwards clicks", () => {
    const handleClick = vi.fn();
    render(
      <GalleryImage
        src="https://example.com/test.jpg"
        alt="Test image"
        width={800}
        height={600}
        title="Test title"
        description="A descriptive caption"
        onClick={handleClick}
      />
    );

    const container = screen.getByLabelText("A descriptive caption");
    fireEvent.click(container);

    expect(handleClick).toHaveBeenCalled();
    const img = screen.getByRole("img", { name: "Test image" }) as HTMLImageElement;
    expect(img.title).toBe("Test title");
  });
});
