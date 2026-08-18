import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { userRepository } from "@/lib/users/repository";
import { creditService } from "@/lib/credits/service";
import { getActiveSubscription } from "@/lib/billing/subscription";
import { listAuditLogs } from "@/lib/audit/service";
import type { Prisma } from "@/lib/generated/prisma";

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: string;
  createdAt: string;
  creditBalance: number | null;
  creditReserved: number | null;
  subscriptionPlan: string;
  generationCount: number;
  videoCount: number;
}

export interface AdminUserDetail {
  profile: AdminUserListItem;
  subscription: Awaited<ReturnType<typeof getActiveSubscription>>;
  creditTransactions: Awaited<ReturnType<typeof creditService.listTransactions>>["items"];
  usage: Awaited<ReturnType<typeof creditService.listUsage>>["items"];
  products: Array<{ id: string; name: string; status: string; createdAt: string }>;
  photoshoots: Array<{ id: string; status: string; totalImages: number; createdAt: string }>;
  videos: Array<{ id: string; title: string; status: string; duration: number; createdAt: string }>;
  generationJobs: Array<{ id: string; status: string; type: string; createdAt: string }>;
  videoJobs: Array<{ id: string; status: string; createdAt: string }>;
  recentAudit: Awaited<ReturnType<typeof listAuditLogs>>["items"];
}

export async function listAdminUsers(options: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  plan?: string;
  sort?: "newest" | "oldest";
}): Promise<{ items: AdminUserListItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const skip = (page - 1) * limit;

  if (!isPostgresEnabled()) {
    const users = await userRepository.list();
    let filtered = users;
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      );
    }
    if (options.role) filtered = filtered.filter((u) => u.role === options.role);
    filtered.sort((a, b) =>
      options.sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
    return {
      items: filtered.slice(skip, skip + limit).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status ?? "active",
        provider: u.provider,
        createdAt: u.createdAt,
        creditBalance: null,
        creditReserved: null,
        subscriptionPlan: "free",
        generationCount: 0,
        videoCount: 0,
      })),
      total: filtered.length,
      page,
      limit,
    };
  }

  const where: Prisma.UserWhereInput = {
    ...(options.search
      ? {
          OR: [
            { email: { contains: options.search, mode: "insensitive" } },
            { name: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(options.role ? { role: options.role } : {}),
    ...(options.plan && options.plan !== "free"
      ? {
          subscriptions: {
            some: {
              plan: options.plan,
              status: { in: ["active", "trialing", "past_due"] },
            },
          },
        }
      : {}),
    ...(options.plan === "free"
      ? {
          NOT: {
            subscriptions: {
              some: { status: { in: ["active", "trialing", "past_due"] } },
            },
          },
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: options.sort === "oldest" ? "asc" : "desc" },
      skip,
      take: limit,
      include: {
        creditAccount: true,
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { generationJobs: true, videos: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: records.map((record) => ({
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      provider: record.provider,
      createdAt: record.createdAt.toISOString(),
      creditBalance: record.creditAccount?.balance ?? null,
      creditReserved: record.creditAccount?.reserved ?? null,
      subscriptionPlan: record.subscriptions[0]?.plan ?? "free",
      generationCount: record._count.generationJobs,
      videoCount: record._count.videos,
    })),
    total,
    page,
    limit,
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!isPostgresEnabled()) {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status ?? "active",
        provider: user.provider,
        createdAt: user.createdAt,
        creditBalance: null,
        creditReserved: null,
        subscriptionPlan: "free",
        generationCount: 0,
        videoCount: 0,
      },
      subscription: null,
      creditTransactions: [],
      usage: [],
      products: [],
      photoshoots: [],
      videos: [],
      generationJobs: [],
      videoJobs: [],
      recentAudit: [],
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creditAccount: true,
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { generationJobs: true, videos: true } },
    },
  });
  if (!user) return null;

  const [subscription, transactions, usage, products, photoshoots, videos, generationJobs, videoJobs, audit] =
    await Promise.all([
      getActiveSubscription(userId),
      creditService.listTransactions(userId, 1, 20),
      creditService.listUsage(userId, 1, 20),
      prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.photoshoot.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, totalImages: true, createdAt: true },
      }),
      prisma.video.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, status: true, duration: true, createdAt: true },
      }),
      prisma.generationJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, type: true, createdAt: true },
      }),
      prisma.videoGenerationJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, createdAt: true },
      }),
      listAuditLogs({ targetUserId: userId, limit: 20, page: 1 }),
    ]);

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
      creditBalance: user.creditAccount?.balance ?? null,
      creditReserved: user.creditAccount?.reserved ?? null,
      subscriptionPlan: user.subscriptions[0]?.plan ?? "free",
      generationCount: user._count.generationJobs,
      videoCount: user._count.videos,
    },
    subscription,
    creditTransactions: transactions.items,
    usage: usage.items,
    products: products.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    photoshoots: photoshoots.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    videos: videos.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    generationJobs: generationJobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
    videoJobs: videoJobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
    recentAudit: audit.items,
  };
}

export async function updateUserRole(
  userId: string,
  role: "user" | "admin",
  previousRole?: string,
): Promise<AdminUserListItem | null> {
  if (!isPostgresEnabled()) {
    const updated = await userRepository.update(userId, { role });
    if (!updated) return null;
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      provider: updated.provider,
      createdAt: updated.createdAt,
      creditBalance: null,
      creditReserved: null,
      subscriptionPlan: "free",
      generationCount: 0,
      videoCount: 0,
    };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return null;

    const record = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: {
        creditAccount: true,
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          take: 1,
        },
        _count: { select: { generationJobs: true, videos: true } },
      },
    });

    void previousRole;

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      provider: record.provider,
      createdAt: record.createdAt.toISOString(),
      creditBalance: record.creditAccount?.balance ?? null,
      creditReserved: record.creditAccount?.reserved ?? null,
      subscriptionPlan: record.subscriptions[0]?.plan ?? "free",
      generationCount: record._count.generationJobs,
      videoCount: record._count.videos,
    };
  } catch {
    return null;
  }
}

export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<AdminUserListItem | null> {
  if (!isPostgresEnabled()) {
    const updated = await userRepository.update(userId, { status });
    if (!updated) return null;
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      provider: updated.provider,
      createdAt: updated.createdAt,
      creditBalance: null,
      creditReserved: null,
      subscriptionPlan: "free",
      generationCount: 0,
      videoCount: 0,
    };
  }

  try {
    const record = await prisma.user.update({
      where: { id: userId },
      data: { status },
      include: {
        creditAccount: true,
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          take: 1,
        },
        _count: { select: { generationJobs: true, videos: true } },
      },
    });

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      provider: record.provider,
      createdAt: record.createdAt.toISOString(),
      creditBalance: record.creditAccount?.balance ?? null,
      creditReserved: record.creditAccount?.reserved ?? null,
      subscriptionPlan: record.subscriptions[0]?.plan ?? "free",
      generationCount: record._count.generationJobs,
      videoCount: record._count.videos,
    };
  } catch {
    return null;
  }
}
