import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { mapGenerationJob } from "@/lib/db/mappers";
import type { GenerationImageJob, GenerationJob } from "@/types/generation-job";
import type {
  GenerationJobRepository,
  IdempotencyRecord,
} from "./repository";

const ACTIVE_JOB_STATUSES = ["queued", "processing"] as const;
const STALE_LOCK_MS = 10 * 60 * 1000;

export class PostgresGenerationJobRepository implements GenerationJobRepository {
  async create(
    data: Omit<GenerationJob, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<GenerationJob> {
    const jobId = options?.id ?? randomUUID();

    return prisma.$transaction(async (tx) => {
      const job = await tx.generationJob.create({
        data: {
          id: jobId,
          userId: data.userId,
          photoshootId: data.photoshootId,
          productId: data.productId,
          provider: data.provider,
          type: data.type,
          status: data.status,
          requestId: data.requestId,
          totalImages: data.totalImages,
          completedImages: data.completedImages,
          failedImages: data.failedImages,
          currentImage: data.currentImage,
          progress: data.progress,
          error: data.error,
          errorCategory: data.errorCategory,
          targetImageId: data.targetImageId,
          startedAt: data.startedAt ? new Date(data.startedAt) : null,
          completedAt: data.completedAt ? new Date(data.completedAt) : null,
        },
      });

      if (data.images.length > 0) {
        await tx.generationImage.createMany({
          data: data.images.map((image) => mapImageCreate(image, jobId, data.photoshootId)),
        });
      }

      const images = await tx.generationImage.findMany({
        where: { generationJobId: jobId },
        orderBy: { index: "asc" },
      });

      return mapGenerationJob(job, images);
    });
  }

  async findById(id: string): Promise<GenerationJob | null> {
    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: { generationImages: { orderBy: { index: "asc" } } },
    });
    return job ? mapGenerationJob(job, job.generationImages) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<GenerationJob | null> {
    const job = await prisma.generationJob.findFirst({
      where: { id, userId },
      include: { generationImages: { orderBy: { index: "asc" } } },
    });
    return job ? mapGenerationJob(job, job.generationImages) : null;
  }

  async findAllByPhotoshootId(photoshootId: string): Promise<GenerationJob[]> {
    const jobs = await prisma.generationJob.findMany({
      where: { photoshootId },
      orderBy: { createdAt: "desc" },
      include: { generationImages: { orderBy: { index: "asc" } } },
    });
    return jobs.map((job) => mapGenerationJob(job, job.generationImages));
  }

  async findByPhotoshootId(photoshootId: string): Promise<GenerationJob | null> {
    const jobs = await this.findAllByPhotoshootId(photoshootId);
    return jobs[0] ?? null;
  }

  async update(id: string, data: Partial<GenerationJob>): Promise<GenerationJob | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const job = await tx.generationJob.update({
          where: { id },
          data: {
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.requestId !== undefined ? { requestId: data.requestId } : {}),
            ...(data.totalImages !== undefined ? { totalImages: data.totalImages } : {}),
            ...(data.completedImages !== undefined
              ? { completedImages: data.completedImages }
              : {}),
            ...(data.failedImages !== undefined ? { failedImages: data.failedImages } : {}),
            ...(data.currentImage !== undefined ? { currentImage: data.currentImage } : {}),
            ...(data.progress !== undefined ? { progress: data.progress } : {}),
            ...(data.error !== undefined ? { error: data.error } : {}),
            ...(data.errorCategory !== undefined ? { errorCategory: data.errorCategory } : {}),
            ...(data.targetImageId !== undefined ? { targetImageId: data.targetImageId } : {}),
            ...(data.startedAt !== undefined
              ? { startedAt: data.startedAt ? new Date(data.startedAt) : null }
              : {}),
            ...(data.completedAt !== undefined
              ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
              : {}),
            ...(data.status === "completed" ||
            data.status === "failed" ||
            data.status === "partially_failed" ||
            data.status === "cancelled"
              ? { lockedAt: null, lockedBy: null }
              : {}),
          },
        });

        if (data.images) {
          for (const image of data.images) {
            await tx.generationImage.upsert({
              where: { id: image.id },
              create: mapImageCreate(image, id, job.photoshootId),
              update: mapImageUpdate(image),
            });
          }
        }

        const images = await tx.generationImage.findMany({
          where: { generationJobId: id },
          orderBy: { index: "asc" },
        });

        return mapGenerationJob(job, images);
      });
    } catch {
      return null;
    }
  }

  async list(): Promise<GenerationJob[]> {
    const jobs = await prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { generationImages: { orderBy: { index: "asc" } } },
    });
    return jobs.map((job) => mapGenerationJob(job, job.generationImages));
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.generationJob.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async findActiveByRequestId(requestId: string): Promise<GenerationJob | null> {
    const job = await prisma.generationJob.findFirst({
      where: {
        requestId,
        status: { in: [...ACTIVE_JOB_STATUSES] },
      },
      include: { generationImages: { orderBy: { index: "asc" } } },
    });
    return job ? mapGenerationJob(job, job.generationImages) : null;
  }

  async saveIdempotency(_record: IdempotencyRecord): Promise<void> {
    // Idempotency is enforced via the unique requestId column on GenerationJob.
  }

  async claimNextJob(workerId: string): Promise<GenerationJob | null> {
    const staleBefore = new Date(Date.now() - STALE_LOCK_MS);

    return prisma.$transaction(async (tx) => {
      const candidates = await tx.generationJob.findMany({
        where: {
          OR: [
            { status: "queued" },
            {
              status: "processing",
              lockedAt: { lt: staleBefore },
            },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 5,
        include: { generationImages: { orderBy: { index: "asc" } } },
      });

      for (const candidate of candidates) {
        const hasGenerating = candidate.generationImages.some(
          (img) => img.status === "generating",
        );
        if (candidate.status === "processing" && hasGenerating) continue;

        const claimed = await tx.generationJob.updateMany({
          where: {
            id: candidate.id,
            OR: [
              { status: "queued", lockedAt: null },
              { status: "processing", lockedAt: { lt: staleBefore } },
            ],
          },
          data: {
            status: "processing",
            lockedAt: new Date(),
            lockedBy: workerId,
            startedAt: candidate.startedAt ?? new Date(),
          },
        });

        if (claimed.count === 0) continue;

        const job = await tx.generationJob.findUniqueOrThrow({
          where: { id: candidate.id },
          include: { generationImages: { orderBy: { index: "asc" } } },
        });

        return mapGenerationJob(job, job.generationImages);
      }

      return null;
    });
  }
}

function mapImageCreate(
  image: GenerationImageJob,
  generationJobId: string,
  photoshootId: string,
) {
  return {
    id: image.id,
    generationJobId,
    photoshootId,
    imageAssetId: image.imageAssetId,
    poseId: image.poseId,
    poseName: image.poseName,
    index: image.index,
    status: image.status,
    storageKey: image.storageKey,
    mimeType: image.storageKey ? "image/png" : null,
    error: image.error,
    errorCategory: image.errorCategory,
    startedAt: image.startedAt ? new Date(image.startedAt) : null,
    completedAt: image.completedAt ? new Date(image.completedAt) : null,
  };
}

function mapImageUpdate(image: GenerationImageJob) {
  return {
    status: image.status,
    storageKey: image.storageKey,
    mimeType: image.storageKey ? "image/png" : null,
    error: image.error,
    errorCategory: image.errorCategory,
    imageAssetId: image.imageAssetId,
    startedAt: image.startedAt ? new Date(image.startedAt) : null,
    completedAt: image.completedAt ? new Date(image.completedAt) : null,
  };
}
