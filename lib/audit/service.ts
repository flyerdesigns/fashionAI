import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { Prisma } from "@/lib/generated/prisma";
import { logger } from "@/lib/logging/logger";
import type { AuditAction } from "./actions";
import { sanitizeAuditMetadata } from "./sanitize";

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  action: AuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

/** @deprecated Use CreateAuditLogInput */
export interface AuditLogInput {
  userId?: string | null;
  targetUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
  actorEmail?: string | null;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  return writeAuditLog({
    userId: input.actorUserId,
    targetUserId: input.targetUserId,
    action: input.action,
    resourceType: input.targetType,
    resourceId: input.targetId,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
    requestId: input.requestId,
  });
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const sanitized = sanitizeAuditMetadata(input.metadata ?? undefined);

  if (!isPostgresEnabled()) {
    logger.info("audit.log", {
      event: input.action,
      userId: input.userId ?? undefined,
      targetUserId: input.targetUserId ?? undefined,
      resourceType: input.resourceType ?? undefined,
      resourceId: input.resourceId ?? undefined,
      requestId: input.requestId ?? undefined,
    });
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: sanitized as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        requestId: input.requestId ?? null,
      },
    });
  } catch (error) {
    logger.error("audit.write.failed", {
      event: input.action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  actorUserId?: string;
  targetUserId?: string;
  targetType?: string;
  search?: string;
  from?: string;
  to?: string;
}): Promise<{ items: AuditLogView[]; total: number; page: number; limit: number }> {
  if (!isPostgresEnabled()) {
    return { items: [], total: 0, page: 1, limit: options.limit ?? 50 };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const skip = (page - 1) * limit;

  const createdAt: Prisma.DateTimeFilter | undefined =
    options.from || options.to
      ? {
          ...(options.from ? { gte: new Date(options.from) } : {}),
          ...(options.to ? { lte: new Date(options.to) } : {}),
        }
      : undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(options.action ? { action: options.action } : {}),
    ...(options.actorUserId ? { userId: options.actorUserId } : {}),
    ...(options.targetUserId ? { targetUserId: options.targetUserId } : {}),
    ...(options.targetType ? { resourceType: options.targetType } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(options.search
      ? {
          OR: [
            { action: { contains: options.search, mode: "insensitive" } },
            { resourceId: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { actor: { select: { email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: records.map(mapAuditLog),
    total,
    page,
    limit,
  };
}

function mapAuditLog(record: {
  id: string;
  userId: string | null;
  targetUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: Date;
  actor?: { email: string } | null;
}): AuditLogView {
  return {
    id: record.id,
    actorUserId: record.userId,
    targetUserId: record.targetUserId,
    action: record.action,
    targetType: record.resourceType,
    targetId: record.resourceId,
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    ipAddress: record.ipAddress,
    requestId: record.requestId,
    createdAt: record.createdAt.toISOString(),
    actorEmail: record.actor?.email ?? null,
  };
}
