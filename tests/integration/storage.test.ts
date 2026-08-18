import { describeIntegration } from "./setup";
import { createTestUser } from "./helpers/factories";
import { seedStorageFile, testImageBuffer } from "./helpers/storage-seed";
import { storage } from "@/lib/storage";
import {
  buildGeneratedImageKey,
  buildGeneratedVideoKey,
  buildProductImageKey,
  buildVideoThumbnailKey,
} from "@/lib/storage/keys";
import { canUserAccessAsset } from "@/lib/assets/authorization";
import type { StorageService, UploadOptions, StorageResult } from "@/lib/storage/types";

class MockS3Storage implements StorageService {
  private files = new Map<string, Buffer>();

  async upload(file: Buffer | Blob, filename: string, options: UploadOptions): Promise<StorageResult> {
    const key = options.key ?? `mock/${filename}`;
    const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());
    this.files.set(key, buffer);
    return { key, url: `/mock/${key}` };
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    if (!this.files.has(key)) throw new Error("Not found");
    return `https://signed.example/${key}?exp=9999999999`;
  }

  async readFile(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error("Not found");
    return file;
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }
}

describeIntegration("storage integration", () => {
  it("uploads, reads, deletes via local storage abstraction", async () => {
    const user = await createTestUser();
    const productId = "prod-1";
    const key = buildProductImageKey(user.id, productId, "shirt.png");
    await seedStorageFile(key, testImageBuffer("local"));

    expect(await storage.exists(key)).toBe(true);
    const data = await storage.readFile(key);
    expect(data.length).toBeGreaterThan(0);

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("generates expected key formats", () => {
    expect(buildProductImageKey("u1", "p1", "file.png")).toBe(
      "users/u1/products/p1/original/file.png",
    );
    expect(buildGeneratedImageKey("u1", "s1", "i1")).toBe(
      "users/u1/photoshoots/s1/generated/i1.png",
    );
    expect(buildGeneratedVideoKey("u1", "v1")).toBe("users/u1/videos/v1/video.mp4");
    expect(buildVideoThumbnailKey("u1", "v1")).toBe("users/u1/videos/v1/thumbnail.jpg");
  });

  it("enforces ownership on storage keys", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const key = buildGeneratedImageKey(userA.id, "shoot-1", "img-1");

    expect(await canUserAccessAsset(key, userA.id)).toBe(true);
    expect(await canUserAccessAsset(key, userB.id)).toBe(false);
    expect(await canUserAccessAsset(key, "")).toBe(false);
  });

  it("supports mock S3 provider upload/read/delete/signed URL", async () => {
    const mockS3 = new MockS3Storage();
    const key = buildGeneratedVideoKey("user-1", "video-1");
    await mockS3.upload(testImageBuffer(), "video.mp4", { key, contentType: "video/mp4" });

    expect(await mockS3.exists(key)).toBe(true);
    expect(await mockS3.getSignedUrl(key)).toContain("signed.example");
    await mockS3.delete(key);
    expect(await mockS3.exists(key)).toBe(false);
  });
});
