import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import type { Prisma } from "@/lib/generated/prisma";

export async function listAdminPhotoshoots(options: {
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

  const where: Prisma.PhotoshootWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.photoshoot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { email: true, name: true } },
        product: { select: { name: true } },
        _count: { select: { generationImages: true } },
      },
    }),
    prisma.photoshoot.count({ where }),
  ]);

  return {
    items: records.map((row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      userName: row.user.name,
      productName: row.productNameSnapshot || row.product?.name || "—",
      status: row.status,
      totalImages: row.totalImages,
      completedImages: row.completedImages,
      imageCount: row._count.generationImages,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getAdminPhotoshootDetail(id: string) {
  if (!isPostgresEnabled()) return null;

  return prisma.photoshoot.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      product: { select: { id: true, name: true } },
      generationJobs: { orderBy: { createdAt: "desc" }, take: 10 },
      generationImages: { orderBy: { index: "asc" } },
    },
  });
}
