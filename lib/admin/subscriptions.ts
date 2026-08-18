import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import type { Prisma } from "@/lib/generated/prisma";

export async function listAdminSubscriptions(options: {
  page?: number;
  limit?: number;
  status?: string;
  plan?: string;
}) {
  if (!isPostgresEnabled()) {
    return { items: [], total: 0, page: 1, limit: options.limit ?? 25 };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const skip = (page - 1) * limit;

  const where: Prisma.SubscriptionWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.plan ? { plan: options.plan } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    items: records.map((row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      userName: row.user.name,
      plan: row.plan,
      status: row.status,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
