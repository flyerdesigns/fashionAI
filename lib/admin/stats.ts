import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { userRepository } from "@/lib/users/repository";
import { getReadinessCheck, type ServiceStatus } from "@/lib/health/checks";
import { getWorkerHealthReport } from "@/lib/workers/heartbeat";

export interface AdminDashboardStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    activeUsers: number | null;
  };
  billing: {
    activeSubscriptions: number;
    freeUsers: number;
    starterUsers: number;
    proUsers: number;
    businessUsers: number;
  };
  credits: {
    totalGranted: number;
    totalConsumed: number;
    totalAvailable: number;
    totalReserved: number;
  };
  generation: {
    totalPhotoshoots: number;
    totalGeneratedImages: number;
    queuedJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    partiallyFailedJobs: number;
  };
  video: {
    totalVideos: number;
    queuedJobs: number;
    processingJobs: number;
    completedVideos: number;
    failedVideos: number;
  };
  system: {
    database: ServiceStatus | "unavailable";
    storage: ServiceStatus | "unavailable";
    generationWorker: "ok" | "stale" | "unavailable";
    videoWorker: "ok" | "stale" | "unavailable";
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!isPostgresEnabled()) {
    const users = await userRepository.list();
    const health = await getReadinessCheck();
    return {
      users: { total: users.length, newToday: 0, newThisWeek: 0, activeUsers: null },
      billing: {
        activeSubscriptions: 0,
        freeUsers: users.length,
        starterUsers: 0,
        proUsers: 0,
        businessUsers: 0,
      },
      credits: { totalGranted: 0, totalConsumed: 0, totalAvailable: 0, totalReserved: 0 },
      generation: {
        totalPhotoshoots: 0,
        totalGeneratedImages: 0,
        queuedJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        partiallyFailedJobs: 0,
      },
      video: {
        totalVideos: 0,
        queuedJobs: 0,
        processingJobs: 0,
        completedVideos: 0,
        failedVideos: 0,
      },
      system: {
        database: health.services.database,
        storage: health.services.storage,
        generationWorker: "unavailable",
        videoWorker: "unavailable",
      },
    };
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newToday,
    newThisWeek,
    activeUsersResult,
    activeSubscriptions,
    subscriptionsByPlan,
    creditAgg,
    totalPhotoshoots,
    totalGeneratedImages,
    genQueued,
    genProcessing,
    genCompleted,
    genFailed,
    genPartial,
    totalVideos,
    videoQueued,
    videoProcessing,
    videoCompleted,
    videoFailed,
    health,
    workers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.usageRecord.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.subscription.count({
      where: { status: { in: ["active", "trialing", "past_due"] } },
    }),
    prisma.subscription.groupBy({
      by: ["plan"],
      where: { status: { in: ["active", "trialing"] } },
      _count: { plan: true },
    }),
    prisma.creditAccount.aggregate({
      _sum: {
        balance: true,
        reserved: true,
        lifetimeGranted: true,
        lifetimeConsumed: true,
      },
    }),
    prisma.photoshoot.count(),
    prisma.generationImage.count({ where: { status: "completed" } }),
    prisma.generationJob.count({ where: { status: "queued" } }),
    prisma.generationJob.count({ where: { status: "processing" } }),
    prisma.generationJob.count({ where: { status: "completed" } }),
    prisma.generationJob.count({ where: { status: "failed" } }),
    prisma.generationJob.count({ where: { status: "partially_failed" } }),
    prisma.video.count(),
    prisma.videoGenerationJob.count({ where: { status: "queued" } }),
    prisma.videoGenerationJob.count({ where: { status: "processing" } }),
    prisma.video.count({ where: { status: "completed" } }),
    prisma.video.count({ where: { status: "failed" } }),
    getReadinessCheck(),
    getWorkerHealthReport(),
  ]);

  const planCounts = Object.fromEntries(
    subscriptionsByPlan.map((row) => [row.plan, row._count.plan]),
  ) as Record<string, number>;

  const subscribedUserCount = subscriptionsByPlan.reduce(
    (sum, row) => sum + row._count.plan,
    0,
  );

  const generationWorker = workers.find((w) => w.workerName === "generation-worker");
  const videoWorker = workers.find((w) => w.workerName === "video-worker");

  return {
    users: {
      total: totalUsers,
      newToday,
      newThisWeek,
      activeUsers: activeUsersResult.length,
    },
    billing: {
      activeSubscriptions,
      freeUsers: Math.max(0, totalUsers - subscribedUserCount),
      starterUsers: planCounts.starter ?? 0,
      proUsers: planCounts.pro ?? 0,
      businessUsers: planCounts.business ?? 0,
    },
    credits: {
      totalGranted: creditAgg._sum.lifetimeGranted ?? 0,
      totalConsumed: creditAgg._sum.lifetimeConsumed ?? 0,
      totalAvailable: creditAgg._sum.balance ?? 0,
      totalReserved: creditAgg._sum.reserved ?? 0,
    },
    generation: {
      totalPhotoshoots,
      totalGeneratedImages,
      queuedJobs: genQueued,
      processingJobs: genProcessing,
      completedJobs: genCompleted,
      failedJobs: genFailed,
      partiallyFailedJobs: genPartial,
    },
    video: {
      totalVideos,
      queuedJobs: videoQueued,
      processingJobs: videoProcessing,
      completedVideos: videoCompleted,
      failedVideos: videoFailed,
    },
    system: {
      database: health.services.database,
      storage: health.services.storage,
      generationWorker: generationWorker
        ? generationWorker.stale
          ? "stale"
          : "ok"
        : "unavailable",
      videoWorker: videoWorker
        ? videoWorker.stale
          ? "stale"
          : "ok"
        : "unavailable",
    },
  };
}

/** @deprecated Use getAdminDashboardStats */
export async function getAdminStats() {
  const stats = await getAdminDashboardStats();
  return {
    totalUsers: stats.users.total,
    totalProducts: 0,
    totalPhotoshoots: stats.generation.totalPhotoshoots,
    totalVideos: stats.video.totalVideos,
    queuedImageJobs: stats.generation.queuedJobs,
    processingImageJobs: stats.generation.processingJobs,
    failedImageJobs: stats.generation.failedJobs,
    queuedVideoJobs: stats.video.queuedJobs,
    processingVideoJobs: stats.video.processingJobs,
    failedVideoJobs: stats.video.failedVideos,
    totalCreditsGranted: stats.credits.totalGranted,
    totalCreditsConsumed: stats.credits.totalConsumed,
  };
}
