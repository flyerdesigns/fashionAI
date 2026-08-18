import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/generated/prisma";
import { mapVideo, mapVideoJob } from "@/lib/video/mappers";
import type {
  VideoGenerationJobRecord,
  VideoListFilters,
  VideoRecord,
} from "@/types/video";
import type { VideoRepository } from "./repository";

const STALE_LOCK_MS = 15 * 60 * 1000;

export class PostgresVideoRepository implements VideoRepository {
  async createVideo(
    data: Omit<
      VideoRecord,
      "id" | "createdAt" | "updatedAt" | "videoUrl" | "thumbnailUrl" | "sourceImageUrl"
    >,
    options?: { id?: string },
  ): Promise<VideoRecord> {
    const id = options?.id ?? randomUUID();
    const record = await prisma.video.create({
      data: {
        id,
        userId: data.userId,
        productId: data.productId,
        photoshootId: data.photoshootId,
        sourceImageId: data.sourceImageId,
        sourceType: data.sourceType,
        sourceStorageKey: data.sourceStorageKey,
        title: data.title,
        status: data.status,
        videoType: data.videoType,
        provider: data.provider,
        providerJobId: data.providerJobId,
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        duration: data.duration,
        aspectRatio: data.aspectRatio,
        resolution: data.resolution,
        motionPreset: data.motionPreset,
        cameraMovement: data.cameraMovement,
        videoStyle: data.videoStyle,
        configuration: data.configuration as unknown as Prisma.InputJsonValue,
        storageKey: data.storageKey,
        thumbnailStorageKey: data.thumbnailStorageKey,
        creditsUsed: data.creditsUsed,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
      },
    });
    return mapVideo(record);
  }

  async updateVideo(id: string, data: Partial<VideoRecord>): Promise<VideoRecord | null> {
    try {
      const record = await prisma.video.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.providerJobId !== undefined ? { providerJobId: data.providerJobId } : {}),
          ...(data.storageKey !== undefined ? { storageKey: data.storageKey } : {}),
          ...(data.thumbnailStorageKey !== undefined
            ? { thumbnailStorageKey: data.thumbnailStorageKey }
            : {}),
          ...(data.creditsUsed !== undefined ? { creditsUsed: data.creditsUsed } : {}),
          ...(data.errorCode !== undefined ? { errorCode: data.errorCode } : {}),
          ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
          ...(data.completedAt !== undefined
            ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
            : {}),
        },
      });
      return mapVideo(record);
    } catch {
      return null;
    }
  }

  async findVideoById(id: string): Promise<VideoRecord | null> {
    const record = await prisma.video.findUnique({ where: { id } });
    return record ? mapVideo(record) : null;
  }

  async findVideoByIdForUser(id: string, userId: string): Promise<VideoRecord | null> {
    const record = await prisma.video.findFirst({ where: { id, userId } });
    return record ? mapVideo(record) : null;
  }

  async listVideosForUser(
    userId: string,
    filters: VideoListFilters = {},
  ): Promise<{ items: VideoRecord[]; total: number }> {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 24, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.VideoWhereInput = { userId };
    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters.search?.trim()) {
      where.title = { contains: filters.search.trim(), mode: "insensitive" };
    }

    const orderBy: Prisma.VideoOrderByWithRelationInput =
      filters.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

    const [records, total] = await Promise.all([
      prisma.video.findMany({ where, orderBy, skip, take: limit }),
      prisma.video.count({ where }),
    ]);

    return { items: records.map(mapVideo), total };
  }

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.video.deleteMany({ where: { id, userId } });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  async findVideoByStorageKey(storageKey: string): Promise<VideoRecord | null> {
    const record = await prisma.video.findFirst({
      where: {
        OR: [{ storageKey }, { thumbnailStorageKey: storageKey }, { sourceStorageKey: storageKey }],
      },
    });
    return record ? mapVideo(record) : null;
  }

  async createJob(
    data: Omit<VideoGenerationJobRecord, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<VideoGenerationJobRecord> {
    const record = await prisma.videoGenerationJob.create({
      data: {
        id: options?.id ?? randomUUID(),
        userId: data.userId,
        videoId: data.videoId,
        status: data.status,
        provider: data.provider,
        providerJobId: data.providerJobId,
        progress: data.progress,
        requestId: data.requestId,
        attempts: data.attempts,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
      },
    });
    return mapVideoJob(record);
  }

  async updateJob(
    id: string,
    data: Partial<VideoGenerationJobRecord>,
  ): Promise<VideoGenerationJobRecord | null> {
    try {
      const record = await prisma.videoGenerationJob.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.providerJobId !== undefined ? { providerJobId: data.providerJobId } : {}),
          ...(data.progress !== undefined ? { progress: data.progress } : {}),
          ...(data.attempts !== undefined ? { attempts: data.attempts } : {}),
          ...(data.errorCode !== undefined ? { errorCode: data.errorCode } : {}),
          ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
          ...(data.startedAt !== undefined
            ? { startedAt: data.startedAt ? new Date(data.startedAt) : null }
            : {}),
          ...(data.completedAt !== undefined
            ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
            : {}),
          ...(data.status === "queued" ? { lockedAt: null, lockedBy: null } : {}),
          ...(data.status === "completed" ||
          data.status === "failed" ||
          data.status === "cancelled"
            ? { lockedAt: null, lockedBy: null }
            : {}),
        },
      });
      return mapVideoJob(record);
    } catch {
      return null;
    }
  }

  async findJobById(id: string): Promise<VideoGenerationJobRecord | null> {
    const record = await prisma.videoGenerationJob.findUnique({ where: { id } });
    return record ? mapVideoJob(record) : null;
  }

  async findJobByIdForUser(id: string, userId: string): Promise<VideoGenerationJobRecord | null> {
    const record = await prisma.videoGenerationJob.findFirst({ where: { id, userId } });
    return record ? mapVideoJob(record) : null;
  }

  async findActiveJobByRequestId(
    requestId: string,
  ): Promise<(VideoGenerationJobRecord & { videoId: string }) | null> {
    const record = await prisma.videoGenerationJob.findFirst({
      where: {
        requestId,
        status: { in: ["queued", "processing"] },
      },
    });
    if (!record) return null;
    return { ...mapVideoJob(record), videoId: record.videoId };
  }

  async claimNextJob(workerId: string): Promise<VideoGenerationJobRecord | null> {
    const staleBefore = new Date(Date.now() - STALE_LOCK_MS);

    return prisma.$transaction(async (tx) => {
      const candidates = await tx.videoGenerationJob.findMany({
        where: {
          OR: [{ status: "queued" }, { status: "processing", lockedAt: { lt: staleBefore } }],
        },
        orderBy: { createdAt: "asc" },
        take: 5,
      });

      for (const candidate of candidates) {
        const claimed = await tx.videoGenerationJob.updateMany({
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

        const job = await tx.videoGenerationJob.findUniqueOrThrow({ where: { id: candidate.id } });
        await tx.video.update({
          where: { id: job.videoId },
          data: { status: "processing" },
        });
        return mapVideoJob(job);
      }

      return null;
    });
  }

  async countVideosForUser(userId: string): Promise<number> {
    return prisma.video.count({ where: { userId } });
  }
}

export const postgresVideoRepository = new PostgresVideoRepository();
