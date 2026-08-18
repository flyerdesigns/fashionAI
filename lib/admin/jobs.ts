import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { generationService } from "@/lib/generation/service";
import { videoService } from "@/lib/video/service";
import { createAuditLog } from "@/lib/audit/service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import type { Prisma } from "@/lib/generated/prisma";

export type AdminJobType = "image" | "video";

export interface AdminJobListItem {
  id: string;
  type: AdminJobType;
  userId: string;
  userEmail: string;
  status: string;
  provider: string;
  progress: number;
  attempts: number | null;
  jobType: string | null;
  credits: number | null;
  error: string | null;
  errorCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminJobs(options: {
  page?: number;
  limit?: number;
  type?: AdminJobType;
  status?: string;
  userId?: string;
  provider?: string;
}): Promise<{ items: AdminJobListItem[]; total: number; page: number; limit: number }> {
  if (!isPostgresEnabled()) {
    return { items: [], total: 0, page: 1, limit: options.limit ?? 25 };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));

  if (options.type === "video") {
    return listVideoJobsInternal(options, page, limit);
  }
  if (options.type === "image") {
    return listImageJobsInternal(options, page, limit);
  }

  const half = Math.ceil(limit / 2);
  const [images, videos] = await Promise.all([
    listImageJobsInternal(options, page, half),
    listVideoJobsInternal(options, page, half),
  ]);

  const items = [...images.items, ...videos.items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    items: items.slice(0, limit),
    total: images.total + videos.total,
    page,
    limit,
  };
}

async function listImageJobsInternal(
  options: {
    status?: string;
    userId?: string;
    provider?: string;
  },
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.GenerationJobWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.provider ? { provider: options.provider } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.generationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { email: true } },
        creditReservation: { select: { credits: true } },
      },
    }),
    prisma.generationJob.count({ where }),
  ]);

  return {
    items: records.map((job) => ({
      id: job.id,
      type: "image" as const,
      userId: job.userId,
      userEmail: job.user.email,
      status: job.status,
      provider: job.provider,
      progress: job.progress,
      attempts: null,
      jobType: job.type,
      credits: job.creditReservation?.credits ?? null,
      error: job.error,
      errorCategory: job.errorCategory,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

async function listVideoJobsInternal(
  options: {
    status?: string;
    userId?: string;
    provider?: string;
  },
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.VideoGenerationJobWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.provider ? { provider: options.provider } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.videoGenerationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { email: true } },
        creditReservation: { select: { credits: true } },
        video: { select: { creditsUsed: true } },
      },
    }),
    prisma.videoGenerationJob.count({ where }),
  ]);

  return {
    items: records.map((job) => ({
      id: job.id,
      type: "video" as const,
      userId: job.userId,
      userEmail: job.user.email,
      status: job.status,
      provider: job.provider,
      progress: job.progress,
      attempts: job.attempts,
      jobType: null,
      credits: job.creditReservation?.credits ?? job.video.creditsUsed ?? null,
      error: job.errorMessage,
      errorCategory: job.errorCode,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getAdminJobDetail(jobId: string, type: AdminJobType) {
  if (!isPostgresEnabled()) return null;

  if (type === "image") {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        generationImages: { orderBy: { index: "asc" } },
        creditReservation: true,
        usageRecords: true,
        photoshoot: { select: { id: true, productNameSnapshot: true, status: true } },
      },
    });
    if (!job) return null;
    return { type: "image" as const, job };
  }

  const job = await prisma.videoGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      creditReservation: true,
      video: true,
    },
  });
  if (!job) return null;
  return { type: "video" as const, job };
}

export async function adminRetryJob(input: {
  jobId: string;
  type: AdminJobType;
  actorUserId: string;
  ipAddress?: string | null;
  requestId?: string | null;
}) {
  const detail = await getAdminJobDetail(input.jobId, input.type);
  if (!detail) {
    throw new Error("Job not found.");
  }

  if (detail.type === "image") {
    const job = detail.job;
    if (job.status !== "failed" && job.status !== "partially_failed" && job.status !== "cancelled") {
      throw new Error("Only failed or partially failed image jobs can be retried.");
    }
    const result = await generationService.createRetryFailedJob(
      job.userId,
      job.photoshootId,
      randomUUID(),
    );
    await createAuditLog({
      actorUserId: input.actorUserId,
      targetUserId: job.userId,
      action: AUDIT_ACTIONS.ADMIN_JOB_RETRY,
      targetType: "generation_job",
      targetId: input.jobId,
      metadata: { newJobId: result.jobId, photoshootId: result.photoshootId },
      ipAddress: input.ipAddress,
      requestId: input.requestId,
    });
    return { ...result, type: "image" as const };
  }

  const job = detail.job;
  const result = await videoService.retryJob(job.id, job.userId);
  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: job.userId,
    action: AUDIT_ACTIONS.ADMIN_JOB_RETRY,
    targetType: "video_generation_job",
    targetId: input.jobId,
    metadata: { newJobId: result.jobId, videoId: result.videoId },
    ipAddress: input.ipAddress,
    requestId: input.requestId,
  });
  return { ...result, type: "video" as const };
}

export async function adminCancelJob(input: {
  jobId: string;
  type: AdminJobType;
  actorUserId: string;
  ipAddress?: string | null;
  requestId?: string | null;
}) {
  const detail = await getAdminJobDetail(input.jobId, input.type);
  if (!detail) {
    throw new Error("Job not found.");
  }

  if (detail.type === "image") {
    const job = detail.job;
    const result = await generationService.cancelJob(job.id, job.userId);
    await createAuditLog({
      actorUserId: input.actorUserId,
      targetUserId: job.userId,
      action: AUDIT_ACTIONS.ADMIN_JOB_CANCEL,
      targetType: "generation_job",
      targetId: input.jobId,
      metadata: { status: result.status },
      ipAddress: input.ipAddress,
      requestId: input.requestId,
    });
    return { jobId: result.id, status: result.status, type: "image" as const };
  }

  const job = detail.job;
  const result = await videoService.cancelJob(job.id, job.userId);
  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: job.userId,
    action: AUDIT_ACTIONS.ADMIN_JOB_CANCEL,
    targetType: "video_generation_job",
    targetId: input.jobId,
    metadata: { status: result.status },
    ipAddress: input.ipAddress,
    requestId: input.requestId,
  });
  return { jobId: result.jobId, status: result.status, type: "video" as const };
}
