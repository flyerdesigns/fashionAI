import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { buildAssetUrl } from "@/lib/storage/keys";
import type { Prisma } from "@/lib/generated/prisma";

export async function listAdminVideos(options: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
}) {
  if (!isPostgresEnabled()) {
    return { items: [], total: 0, page: 1, limit: options.limit ?? 25 };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const skip = (page - 1) * limit;

  const where: Prisma.VideoWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.video.count({ where }),
  ]);

  return {
    items: records.map((row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      userName: row.user.name,
      title: row.title,
      status: row.status,
      duration: row.duration,
      provider: row.provider,
      creditsUsed: row.creditsUsed,
      createdAt: row.createdAt.toISOString(),
      thumbnailUrl: row.thumbnailStorageKey
        ? buildAssetUrl(row.thumbnailStorageKey)
        : null,
    })),
    total,
    page,
    limit,
  };
}

export async function getAdminVideoDetail(id: string) {
  if (!isPostgresEnabled()) return null;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      product: { select: { id: true, name: true } },
      photoshoot: { select: { id: true, productNameSnapshot: true } },
      generationJobs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!video) return null;

  return {
    ...video,
    videoUrl: video.storageKey ? buildAssetUrl(video.storageKey) : null,
    thumbnailUrl: video.thumbnailStorageKey
      ? buildAssetUrl(video.thumbnailStorageKey)
      : null,
  };
}
