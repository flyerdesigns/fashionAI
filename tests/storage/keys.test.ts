import { describe, expect, it } from "vitest";
import { parseUserIdFromStorageKey, buildGeneratedVideoKey } from "@/lib/storage/keys";

describe("storage keys", () => {
  it("parses user id from storage path", () => {
    expect(parseUserIdFromStorageKey("users/abc-123/videos/vid/video.mp4")).toBe("abc-123");
    expect(parseUserIdFromStorageKey("products/legacy.png")).toBeNull();
  });

  it("builds video storage keys", () => {
    expect(buildGeneratedVideoKey("user-1", "video-1")).toBe(
      "users/user-1/videos/video-1/video.mp4",
    );
  });
});
