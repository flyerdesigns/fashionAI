import { storage } from "@/lib/storage";

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

export function testImageBuffer(label = "test"): Buffer {
  return Buffer.concat([PNG_HEADER, Buffer.from(label)]);
}

export async function seedStorageFile(key: string, content?: Buffer): Promise<void> {
  await storage.upload(content ?? testImageBuffer(), "seed.png", {
    key,
    contentType: "image/png",
  });
}

export async function seedProductImage(originalImageKey: string): Promise<void> {
  await seedStorageFile(originalImageKey);
}
