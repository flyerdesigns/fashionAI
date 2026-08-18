import { describe, expect, it } from "vitest";
import { buildVideoPrompt, buildVideoNegativePrompt } from "@/lib/video/prompt-builder";
import { DEFAULT_VIDEO_CONFIGURATION } from "@/lib/video/presets";

describe("video prompt builder", () => {
  it("includes clothing preservation instructions", () => {
    const prompt = buildVideoPrompt(DEFAULT_VIDEO_CONFIGURATION);
    expect(prompt.toLowerCase()).toContain("preserve");
    expect(prompt.toLowerCase()).toContain("garment");
  });

  it("includes negative prompt defaults", () => {
    const negative = buildVideoNegativePrompt(DEFAULT_VIDEO_CONFIGURATION);
    expect(negative).toContain("distorted garment");
    expect(negative).toContain("watermark");
  });
});
