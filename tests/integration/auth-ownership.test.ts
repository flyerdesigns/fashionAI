import { describeIntegration } from "./setup";
import { createTestUser } from "./helpers/factories";
import { canUserAccessAsset } from "@/lib/assets/authorization";
import {
  buildGeneratedImageKey,
  buildGeneratedVideoKey,
  buildProductImageKey,
} from "@/lib/storage/keys";

describeIntegration("authorization and storage ownership", () => {
  it("denies cross-user asset access by storage key path", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const productKey = buildProductImageKey(userA.id, "product-1", "shirt.png");
    const imageKey = buildGeneratedImageKey(userA.id, "shoot-1", "img-1");
    const videoKey = buildGeneratedVideoKey(userA.id, "video-1");

    expect(await canUserAccessAsset(productKey, userA.id)).toBe(true);
    expect(await canUserAccessAsset(productKey, userB.id)).toBe(false);
    expect(await canUserAccessAsset(imageKey, userB.id)).toBe(false);
    expect(await canUserAccessAsset(videoKey, userB.id)).toBe(false);
  });

  it("validates storage key formats", () => {
    const key = buildProductImageKey("user-1", "prod-1", "file.png");
    expect(key).toBe("users/user-1/products/prod-1/original/file.png");
  });
});
