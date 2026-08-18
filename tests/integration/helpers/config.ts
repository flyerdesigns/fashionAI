import type { PhotoshootConfiguration, PoseId } from "@/types/photoshoot-config";

export function testPhotoshootConfiguration(
  poses: PoseId[] = ["standing", "full-body", "half-body", "close-up"],
): PhotoshootConfiguration {
  return {
    model: {
      presetId: "ecommerce",
      gender: "female",
      ageRange: "adult",
      appearance: {
        skinTone: "medium",
        hairColor: "black",
        hairStyle: "long",
        bodyType: "average",
      },
    },
    poses,
    styleId: "clean-white-studio",
    backgroundId: "white-studio",
    lightingId: "soft-studio",
    cameraStyleId: "ecommerce",
    framing: "full-body",
    aspectRatio: "4:5",
  };
}
