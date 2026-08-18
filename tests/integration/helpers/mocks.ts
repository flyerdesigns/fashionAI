import { vi } from "vitest";
import { testImageBuffer } from "./storage-seed";

export function createMockImageProvider(options?: {
  failOnCalls?: number[];
}) {
  let callIndex = 0;
  return {
    id: "mock-gemini",
    generateImage: vi.fn(async () => {
      callIndex += 1;
      if (options?.failOnCalls?.includes(callIndex)) {
        throw new Error("Mock provider failure");
      }
      return {
        imageBuffer: testImageBuffer(`img-${callIndex}`),
        mimeType: "image/png",
      };
    }),
  };
}

export function createMockVideoProvider(options?: { shouldFail?: boolean; shouldTimeout?: boolean }) {
  return {
    id: "mock_veo",
    model: "mock-veo",
    generateAndWait: vi.fn(async () => {
      if (options?.shouldTimeout) {
        throw new Error("Video generation timed out");
      }
      if (options?.shouldFail) {
        return { error: "Mock video provider failure", videoBuffer: null };
      }
      return {
        videoBuffer: Buffer.from("mock-video-bytes"),
        videoMimeType: "video/mp4",
        error: null,
      };
    }),
  };
}

vi.mock("@/lib/ai/provider-factory", () => ({
  getImageProvider: vi.fn(),
}));

vi.mock("@/lib/video/provider-factory", () => ({
  getVideoProvider: vi.fn(),
}));
