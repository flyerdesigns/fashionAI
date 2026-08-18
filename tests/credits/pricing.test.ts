import { describe, expect, it } from "vitest";
import {
  getImageGenerationCost,
  getVideoGenerationCost,
  calculateGenerationCost,
} from "@/lib/credits/config";

describe("credit pricing", () => {
  it("uses default image generation cost", () => {
    expect(getImageGenerationCost()).toBe(5);
    expect(calculateGenerationCost(4, "photoshoot_image")).toBe(20);
  });

  it("uses duration-based video pricing", () => {
    expect(getVideoGenerationCost(5)).toBe(25);
    expect(getVideoGenerationCost(10)).toBe(40);
    expect(getVideoGenerationCost(15)).toBe(60);
  });
});
