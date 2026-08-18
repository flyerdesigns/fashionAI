import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";

export interface CreditConsistencyIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  userId?: string;
  referenceId?: string;
}

export interface CreditReconciliationReport {
  issues: CreditConsistencyIssue[];
  accountsChecked: number;
  reservationsChecked: number;
}

export async function verifyCreditConsistency(): Promise<CreditReconciliationReport> {
  if (!isPostgresEnabled()) {
    return {
      issues: [
        {
          code: "postgres_required",
          severity: "warning",
          message: "Credit verification requires DATABASE_PROVIDER=postgres.",
        },
      ],
      accountsChecked: 0,
      reservationsChecked: 0,
    };
  }

  const issues: CreditConsistencyIssue[] = [];
  const accounts = await prisma.creditAccount.findMany();
  const reservations = await prisma.creditReservation.findMany();

  for (const account of accounts) {
    if (account.balance < 0) {
      issues.push({
        code: "negative_balance",
        severity: "error",
        message: `Negative balance (${account.balance})`,
        userId: account.userId,
      });
    }
    if (account.reserved < 0) {
      issues.push({
        code: "negative_reserved",
        severity: "error",
        message: `Negative reserved (${account.reserved})`,
        userId: account.userId,
      });
    }

    const activeReserved = reservations
      .filter((r) => r.creditAccountId === account.id && r.status === "reserved")
      .reduce(
        (sum, r) => sum + (r.credits - r.consumedCredits - r.releasedCredits),
        0,
      );

    if (activeReserved !== account.reserved) {
      issues.push({
        code: "reserved_mismatch",
        severity: "error",
        message: `Account reserved (${account.reserved}) != active reservations (${activeReserved})`,
        userId: account.userId,
      });
    }
  }

  for (const reservation of reservations) {
    const unsettled =
      reservation.credits - reservation.consumedCredits - reservation.releasedCredits;
    if (unsettled < 0) {
      issues.push({
        code: "reservation_over_settled",
        severity: "error",
        message: `Reservation ${reservation.id} over-settled`,
        userId: reservation.userId,
        referenceId: reservation.id,
      });
    }

    if (reservation.status === "reserved" && unsettled <= 0) {
      issues.push({
        code: "stale_reserved_status",
        severity: "warning",
        message: `Reservation ${reservation.id} marked reserved but fully settled`,
        userId: reservation.userId,
        referenceId: reservation.id,
      });
    }

    if (reservation.generationJobId) {
      const job = await prisma.generationJob.findUnique({
        where: { id: reservation.generationJobId },
      });
      if (!job) {
        issues.push({
          code: "reservation_missing_job",
          severity: "error",
          message: `Reservation ${reservation.id} references missing generation job`,
          userId: reservation.userId,
          referenceId: reservation.id,
        });
      }
    }

    if (reservation.videoGenerationJobId) {
      const job = await prisma.videoGenerationJob.findUnique({
        where: { id: reservation.videoGenerationJobId },
      });
      if (!job) {
        issues.push({
          code: "reservation_missing_video_job",
          severity: "error",
          message: `Reservation ${reservation.id} references missing video job`,
          userId: reservation.userId,
          referenceId: reservation.id,
        });
      }
    }
  }

  const grantGroups = await prisma.creditTransaction.groupBy({
    by: ["referenceType", "referenceId", "type"],
    _count: { _all: true },
    where: {
      referenceId: { not: null },
      type: { in: ["signup_bonus", "subscription_credit"] },
    },
  });

  for (const group of grantGroups) {
    if (group._count._all > 1) {
      issues.push({
        code: "duplicate_grant",
        severity: "error",
        message: `Duplicate grant detected for ${group.referenceType}:${group.referenceId} (${group._count._all})`,
        referenceId: group.referenceId ?? undefined,
      });
    }
  }

  return {
    issues,
    accountsChecked: accounts.length,
    reservationsChecked: reservations.length,
  };
}

export async function repairStaleReservedStatuses(dryRun: boolean): Promise<number> {
  const report = await verifyCreditConsistency();
  const stale = report.issues.filter((issue) => issue.code === "stale_reserved_status");
  if (dryRun || stale.length === 0) return stale.length;

  for (const issue of stale) {
    if (!issue.referenceId) continue;
    await prisma.creditReservation.updateMany({
      where: { id: issue.referenceId, status: "reserved" },
      data: {
        status: "consumed",
        consumedAt: new Date(),
      },
    });
  }

  return stale.length;
}
