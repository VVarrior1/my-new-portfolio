import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";

const mediaProto = (globalThis.HTMLMediaElement || class {}).prototype as HTMLMediaElement;

if (mediaProto) {
  Object.defineProperty(mediaProto, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(mediaProto, "pause", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(mediaProto, "load", {
    configurable: true,
    value: vi.fn(),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});
