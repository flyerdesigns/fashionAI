import type { ClothingAsset } from "@/types/clothing";
import type { PhotoshootConfiguration } from "@/types/photoshoot-config";
import type { PhotoshootStatus } from "@/types/photoshoot";
import type {
  GenerationImageJob,
  GenerationJob,
  GenerationJobStatus,
  GenerationJobType,
  GenerationErrorCategory,
  GenerationImageJobStatus,
} from "@/types/generation-job";
import type {
  GeneratedImageAsset,
  PhotoshootRecord,
} from "@/lib/ai/generation-orchestrator";
import type { UserRecord, CreateUserInput, AuthProvider } from "@/types/user-record";
import type {
  Product,
  Photoshoot,
  GenerationJob as PrismaGenerationJob,
  GenerationImage,
  User,
} from "@/lib/generated/prisma";
import { buildAssetUrl } from "@/lib/storage/keys";

export function mapUser(record: User): UserRecord {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    image: record.image,
    passwordHash: record.passwordHash,
    provider: record.provider as AuthProvider,
    role: (record.role === "admin" ? "admin" : "user") as UserRecord["role"],
    status: record.status === "suspended" ? "suspended" : "active",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapProduct(record: Product): ClothingAsset {
  return {
    id: record.id,
    userId: record.userId,
    productName: record.name,
    productType: record.type as ClothingAsset["productType"],
    category: record.category as ClothingAsset["category"],
    gender: record.gender as ClothingAsset["gender"],
    color: record.color as ClothingAsset["color"],
    customColor: record.customColor ?? undefined,
    description: record.description ?? undefined,
    brandName: record.brand ?? undefined,
    originalFileName: record.originalFileName,
    mimeType: record.originalImageMimeType,
    fileSize: record.originalImageSize,
    width: record.width,
    height: record.height,
    imageUrl: buildAssetUrl(record.originalImageKey),
    storageKey: record.originalImageKey,
    status: record.status as ClothingAsset["status"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapGenerationImageToAsset(image: GenerationImage): GeneratedImageAsset | null {
  if (!image.storageKey || image.status !== "completed") return null;
  return {
    id: image.imageAssetId ?? image.id,
    poseId: image.poseId as GeneratedImageAsset["poseId"],
    poseLabel: image.poseName,
    imageUrl: buildAssetUrl(image.storageKey),
    storageKey: image.storageKey,
    createdAt: (image.completedAt ?? image.createdAt).toISOString(),
  };
}

export function mapGenerationImageToJob(image: GenerationImage): GenerationImageJob {
  return {
    id: image.id,
    jobId: image.generationJobId,
    poseId: image.poseId as GenerationImageJob["poseId"],
    poseName: image.poseName,
    index: image.index,
    status: image.status as GenerationImageJobStatus,
    imageUrl: image.storageKey ? buildAssetUrl(image.storageKey) : null,
    storageKey: image.storageKey,
    imageAssetId: image.imageAssetId,
    error: image.error,
    errorCategory: image.errorCategory as GenerationErrorCategory | null,
    startedAt: image.startedAt?.toISOString() ?? null,
    completedAt: image.completedAt?.toISOString() ?? null,
  };
}

export function mapPhotoshoot(
  record: Photoshoot,
  images: GenerationImage[] = [],
): PhotoshootRecord {
  const galleryImages = images
    .map(mapGenerationImageToAsset)
    .filter((img): img is GeneratedImageAsset => img !== null);

  return {
    id: record.id,
    userId: record.userId,
    productId: record.productId,
    productName: record.productNameSnapshot,
    clothingThumbnailUrl: record.clothingThumbnailUrl ?? "",
    configuration: record.configuration as unknown as PhotoshootConfiguration,
    generationId: record.generationId,
    generationJobId: record.generationJobId,
    status: record.status as PhotoshootStatus,
    images: galleryImages,
    provider: record.provider,
    totalImages: record.totalImages,
    completedImages: record.completedImages,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapGenerationJob(
  record: PrismaGenerationJob,
  images: GenerationImage[] = [],
): GenerationJob {
  return {
    id: record.id,
    userId: record.userId,
    photoshootId: record.photoshootId,
    productId: record.productId,
    provider: record.provider,
    type: record.type as GenerationJobType,
    status: record.status as GenerationJobStatus,
    requestId: record.requestId,
    totalImages: record.totalImages,
    completedImages: record.completedImages,
    failedImages: record.failedImages,
    currentImage: record.currentImage,
    progress: record.progress,
    error: record.error,
    errorCategory: record.errorCategory as GenerationErrorCategory | null,
    targetImageId: record.targetImageId,
    images: images.map(mapGenerationImageToJob).sort((a, b) => a.index - b.index),
    createdAt: record.createdAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapCreateUserInput(input: CreateUserInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    image: input.image ?? null,
    passwordHash: input.passwordHash ?? null,
    provider: input.provider,
    role: input.role ?? "user",
    status: "active",
  };
}
