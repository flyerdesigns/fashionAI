import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/generated/prisma";
import { LOG_EVENTS } from "@/lib/logging/events";
import { logger } from "@/lib/logging/logger";
import { metrics } from "@/lib/metrics";
import { getSignupBonusCredits } from "./config";
import { InsufficientCreditsError, CreditsError } from "./errors";
import type {
  CreditBalanceView,
  CreditTransactionView,
  CreditTransactionType,
  GrantCreditsInput,
  JobSettlementInput,
  PaginatedResult,
  UsageRecordView,
  VideoSettlementInput,
} from "./types";

export class CreditService {
  async ensureAccount(userId: string, grantSignupBonus = false): Promise<void> {
    const existing = await prisma.creditAccount.findUnique({ where: { userId } });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
      const duplicate = await tx.creditAccount.findUnique({ where: { userId } });
      if (duplicate) return;

      const account = await tx.creditAccount.create({
        data: { userId },
      });

      if (!grantSignupBonus) return;

      const bonus = getSignupBonusCredits();
      if (bonus <= 0) return;

      const referenceId = `signup:${userId}`;
      const priorGrant = await tx.creditTransaction.findFirst({
        where: { referenceType: "signup_bonus", referenceId },
      });
      if (priorGrant) return;

      await tx.creditAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: bonus },
          lifetimeGranted: { increment: bonus },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          creditAccountId: account.id,
          type: "signup_bonus",
          amount: bonus,
          balanceBefore: 0,
          balanceAfter: bonus,
          referenceType: "signup_bonus",
          referenceId,
          description: "Welcome signup credits",
        },
      });
    });
  }

  async getBalance(userId: string): Promise<CreditBalanceView> {
    await this.ensureAccount(userId);
    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId } });
    return {
      balance: account.balance,
      reserved: account.reserved,
      available: account.balance,
      lifetimeGranted: account.lifetimeGranted,
      lifetimeConsumed: account.lifetimeConsumed,
    };
  }

  async grant(input: GrantCreditsInput): Promise<void> {
    if (input.amount <= 0) {
      throw new CreditsError("Grant amount must be positive.", "invalid_amount");
    }

    await this.ensureAccount(input.userId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          type: input.type,
        },
      });
      if (existing) return;

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: { userId: input.userId },
      });

      const balanceBefore = account.balance;
      const balanceAfter = balanceBefore + input.amount;

      await tx.creditAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: input.amount },
          lifetimeGranted: { increment: input.amount },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: input.userId,
          creditAccountId: account.id,
          type: input.type,
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    });
  }

  async deductManual(input: {
    userId: string;
    amount: number;
    referenceType: string;
    referenceId: string;
    description: string;
    metadata?: Record<string, unknown>;
    transactionType?: CreditTransactionType;
  }): Promise<void> {
    if (input.amount <= 0) {
      throw new CreditsError("Deduction amount must be positive.", "invalid_amount");
    }

    const txType = input.transactionType ?? "manual_adjustment";

    await this.ensureAccount(input.userId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          type: txType,
        },
      });
      if (existing) return;

      const updated = await tx.creditAccount.updateMany({
        where: { userId: input.userId, balance: { gte: input.amount } },
        data: { balance: { decrement: input.amount } },
      });

      if (updated.count === 0) {
        const account = await tx.creditAccount.findUnique({ where: { userId: input.userId } });
        throw new InsufficientCreditsError(input.amount, account?.balance ?? 0);
      }

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: { userId: input.userId },
      });

      await tx.creditTransaction.create({
        data: {
          userId: input.userId,
          creditAccountId: account.id,
          type: txType,
          amount: -input.amount,
          balanceBefore: account.balance + input.amount,
          balanceAfter: account.balance,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    });
  }

  async reserve(userId: string, generationJobId: string, credits: number): Promise<void> {
    return this.reserveForJob({ userId, credits, generationJobId });
  }

  async reserveForVideoJob(
    userId: string,
    videoGenerationJobId: string,
    credits: number,
  ): Promise<void> {
    return this.reserveForJob({ userId, credits, videoGenerationJobId });
  }

  private async reserveForJob(input: {
    userId: string;
    credits: number;
    generationJobId?: string;
    videoGenerationJobId?: string;
  }): Promise<void> {
    const { userId, credits, generationJobId, videoGenerationJobId } = input;
    if (credits <= 0) return;

    await this.ensureAccount(userId);

    await prisma.$transaction(async (tx) => {
      const existing = generationJobId
        ? await tx.creditReservation.findUnique({ where: { generationJobId } })
        : await tx.creditReservation.findUnique({ where: { videoGenerationJobId } });
      if (existing) return;

      const updated = await tx.creditAccount.updateMany({
        where: { userId, balance: { gte: credits } },
        data: {
          balance: { decrement: credits },
          reserved: { increment: credits },
        },
      });

      if (updated.count === 0) {
        const account = await tx.creditAccount.findUnique({ where: { userId } });
        throw new InsufficientCreditsError(credits, account?.balance ?? 0);
      }

      const account = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });
      const balanceAfter = account.balance;
      const referenceId = generationJobId ?? videoGenerationJobId!;
      const referenceType = generationJobId ? "generation_job" : "video_generation_job";

      await tx.creditReservation.create({
        data: {
          userId,
          creditAccountId: account.id,
          generationJobId: generationJobId ?? null,
          videoGenerationJobId: videoGenerationJobId ?? null,
          credits,
          status: "reserved",
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          creditAccountId: account.id,
          type: "generation_reservation",
          amount: -credits,
          balanceBefore: balanceAfter + credits,
          balanceAfter,
          referenceType,
          referenceId,
          description: `Reserved ${credits} credits for generation`,
        },
      });
    });

    metrics.creditReservationTotal.inc({
      operation: generationJobId ? "generation" : "video",
    });
    logger.info(LOG_EVENTS.CREDIT_RESERVED, {
      userId,
      jobId: generationJobId ?? videoGenerationJobId,
      credits,
    });
  }

  async releaseRemainingForJob(generationJobId: string): Promise<void> {
    return this.releaseRemaining({ generationJobId });
  }

  async releaseRemainingForVideoJob(videoGenerationJobId: string): Promise<void> {
    return this.releaseRemaining({ videoGenerationJobId });
  }

  private async releaseRemaining(input: {
    generationJobId?: string;
    videoGenerationJobId?: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const reservation = input.generationJobId
        ? await tx.creditReservation.findUnique({ where: { generationJobId: input.generationJobId } })
        : await tx.creditReservation.findUnique({
            where: { videoGenerationJobId: input.videoGenerationJobId },
          });
      if (!reservation || reservation.status !== "reserved") return;

      const referenceId = input.generationJobId ?? input.videoGenerationJobId!;
      const referenceType = input.generationJobId ? "generation_job" : "video_generation_job";

      const remaining =
        reservation.credits - reservation.consumedCredits - reservation.releasedCredits;
      if (remaining <= 0) {
        await tx.creditReservation.update({
          where: { id: reservation.id },
          data: { status: "released", releasedAt: new Date() },
        });
        return;
      }

      await tx.creditAccount.update({
        where: { id: reservation.creditAccountId },
        data: {
          reserved: { decrement: remaining },
          balance: { increment: remaining },
        },
      });

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: { id: reservation.creditAccountId },
      });

      await tx.creditReservation.update({
        where: { id: reservation.id },
        data: {
          releasedCredits: { increment: remaining },
          status: "released",
          releasedAt: new Date(),
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: reservation.userId,
          creditAccountId: reservation.creditAccountId,
          type: "generation_refund",
          amount: remaining,
          balanceBefore: account.balance - remaining,
          balanceAfter: account.balance,
          referenceType,
          referenceId,
          description: `Released ${remaining} unused credits`,
        },
      });
    });
  }

  async settleVideoJob(input: VideoSettlementInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { videoGenerationJobId: input.videoGenerationJobId },
      });
      if (!reservation || reservation.status !== "reserved") return;

      const toConsume = input.success ? input.credits : 0;
      const toRelease = input.success ? 0 : input.credits;
      if (toConsume + toRelease === 0) return;

      await tx.creditAccount.update({
        where: { id: reservation.creditAccountId },
        data: {
          reserved: { decrement: toConsume + toRelease },
          lifetimeConsumed: { increment: toConsume },
          balance: { increment: toRelease },
        },
      });

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: { id: reservation.creditAccountId },
      });

      await tx.creditReservation.update({
        where: { id: reservation.id },
        data: {
          consumedCredits: { increment: toConsume },
          releasedCredits: { increment: toRelease },
          status: input.success ? "consumed" : "released",
          consumedAt: input.success ? new Date() : undefined,
          releasedAt: input.success ? undefined : new Date(),
        },
      });

      if (toConsume > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            creditAccountId: reservation.creditAccountId,
            type: "generation_consumed",
            amount: -toConsume,
            balanceBefore: account.balance,
            balanceAfter: account.balance,
            referenceType: "video_generation_job",
            referenceId: input.videoGenerationJobId,
            description: `Consumed ${toConsume} credits for video generation`,
          },
        });
      }

      if (toRelease > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            creditAccountId: reservation.creditAccountId,
            type: "generation_refund",
            amount: toRelease,
            balanceBefore: account.balance,
            balanceAfter: account.balance + toRelease,
            referenceType: "video_generation_job",
            referenceId: input.videoGenerationJobId,
            description: `Refunded ${toRelease} credits for failed video generation`,
          },
        });
      }

      await tx.usageRecord.create({
        data: {
          userId: input.userId,
          videoId: input.videoId,
          videoGenerationJobId: input.videoGenerationJobId,
          provider: input.provider,
          model: input.model ?? null,
          operation: "video_generation",
          credits: toConsume > 0 ? toConsume : toRelease,
          status: input.success ? "completed" : "refunded",
        },
      });
    });
  }

  async settleGenerationJob(input: JobSettlementInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { generationJobId: input.generationJobId },
      });
      if (!reservation || reservation.status !== "reserved") return;

      const toConsume = input.completedImages * input.costPerImage;
      const toRelease = (input.failedImages + input.cancelledImages) * input.costPerImage;
      const unsettled =
        reservation.credits - reservation.consumedCredits - reservation.releasedCredits;

      if (toConsume + toRelease > unsettled) {
        throw new CreditsError(
          "Credit settlement exceeds reserved amount.",
          "settlement_overflow",
          500,
        );
      }

      if (toConsume + toRelease === 0) return;

      await tx.creditAccount.update({
        where: { id: reservation.creditAccountId },
        data: {
          reserved: { decrement: toConsume + toRelease },
          lifetimeConsumed: { increment: toConsume },
          balance: { increment: toRelease },
        },
      });

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: { id: reservation.creditAccountId },
      });

      await tx.creditReservation.update({
        where: { id: reservation.id },
        data: {
          consumedCredits: { increment: toConsume },
          releasedCredits: { increment: toRelease },
          status: toRelease > 0 && toConsume === 0 ? "released" : "consumed",
          consumedAt: toConsume > 0 ? new Date() : undefined,
          releasedAt: toRelease > 0 ? new Date() : undefined,
        },
      });

      if (toConsume > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            creditAccountId: reservation.creditAccountId,
            type: "generation_consumed",
            amount: -toConsume,
            balanceBefore: account.balance + toRelease,
            balanceAfter: account.balance + toRelease,
            referenceType: "generation_job",
            referenceId: input.generationJobId,
            description: `Consumed ${toConsume} credits for ${input.completedImages} image(s)`,
          },
        });
      }

      if (toRelease > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            creditAccountId: reservation.creditAccountId,
            type: "generation_refund",
            amount: toRelease,
            balanceBefore: account.balance,
            balanceAfter: account.balance + toRelease,
            referenceType: "generation_job",
            referenceId: input.generationJobId,
            description: `Refunded ${toRelease} credits for failed/cancelled images`,
          },
        });
      }

      if (input.completedImages > 0) {
        await tx.usageRecord.create({
          data: {
            userId: input.userId,
            generationJobId: input.generationJobId,
            photoshootId: input.photoshootId,
            provider: input.provider,
            model: input.model ?? null,
            operation: input.operation,
            credits: toConsume,
            status: input.failedImages > 0 ? "partial" : "completed",
          },
        });
      }

      if (toRelease > 0) {
        await tx.usageRecord.create({
          data: {
            userId: input.userId,
            generationJobId: input.generationJobId,
            photoshootId: input.photoshootId,
            provider: input.provider,
            model: input.model ?? null,
            operation: `${input.operation}_refund`,
            credits: toRelease,
            status: "refunded",
          },
        });
      }
    });
  }

  async listTransactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CreditTransactionView>> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * safeLimit;

    const [items, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.creditTransaction.count({ where: { userId } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type as CreditTransactionView["type"],
        amount: item.amount,
        balanceBefore: item.balanceBefore,
        balanceAfter: item.balanceAfter,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        description: item.description,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      limit: safeLimit,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async listUsage(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<UsageRecordView>> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * safeLimit;

    const [items, total] = await Promise.all([
      prisma.usageRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.usageRecord.count({ where: { userId } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        operation: item.operation,
        credits: item.credits,
        status: item.status,
        provider: item.provider,
        model: item.model,
        generationJobId: item.generationJobId,
        photoshootId: item.photoshootId,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      limit: safeLimit,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async recoverStaleReservations(options: {
    dryRun: boolean;
    olderThanMs: number;
  }): Promise<{ found: number; recovered: number }> {
    const cutoff = new Date(Date.now() - options.olderThanMs);
    const stale = await prisma.creditReservation.findMany({
      where: { status: "reserved", createdAt: { lt: cutoff } },
    });

    if (options.dryRun) {
      return { found: stale.length, recovered: 0 };
    }

    let recovered = 0;
    for (const reservation of stale) {
      if (reservation.generationJobId) {
        await this.releaseRemainingForJob(reservation.generationJobId);
      } else if (reservation.videoGenerationJobId) {
        await this.releaseRemainingForVideoJob(reservation.videoGenerationJobId);
      }
      recovered += 1;
      metrics.creditRecoveredTotal.inc();
      logger.info(LOG_EVENTS.CREDIT_RECOVERED, {
        reservationId: reservation.id,
        userId: reservation.userId,
      });
    }

    return { found: stale.length, recovered };
  }
}

export const creditService = new CreditService();

export async function createCreditAccountForUser(userId: string): Promise<void> {
  await creditService.ensureAccount(userId, true);
}
