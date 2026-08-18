import { creditService } from "@/lib/credits/service";
import { createAuditLog } from "@/lib/audit/service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { isPostgresEnabled } from "@/lib/db/config";
import { CreditsError } from "@/lib/credits/errors";
import type { CreditTransactionType } from "@/lib/credits/types";

export interface AdminCreditRequest {
  actorUserId: string;
  targetUserId: string;
  amount: number;
  reason: string;
  ipAddress?: string | null;
  requestId?: string | null;
}

function validateReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3 || trimmed.length > 500) {
    throw new CreditsError(
      "Reason must be between 3 and 500 characters.",
      "invalid_reason",
    );
  }
  return trimmed;
}

function validateAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new CreditsError("Amount must be a positive integer.", "invalid_amount");
  }
}

async function applyAdminCreditChange(input: {
  actorUserId: string;
  targetUserId: string;
  amount: number;
  reason: string;
  type: CreditTransactionType;
  auditAction: string;
  referenceSuffix: string;
  ipAddress?: string | null;
  requestId?: string | null;
}): Promise<{ newBalance: number }> {
  if (!isPostgresEnabled()) {
    throw new CreditsError(
      "Credit adjustments require PostgreSQL.",
      "postgres_required",
    );
  }

  const reason = validateReason(input.reason);
  validateAmount(input.amount);

  const referenceId = `admin:${input.referenceSuffix}:${input.actorUserId}:${Date.now()}`;

  if (input.type === "admin_deduct") {
    await creditService.deductManual({
      userId: input.targetUserId,
      amount: input.amount,
      referenceType: "admin_adjustment",
      referenceId,
      description: reason,
      metadata: { actorUserId: input.actorUserId, adminType: input.type },
      transactionType: input.type,
    });
  } else {
    await creditService.grant({
      userId: input.targetUserId,
      amount: input.amount,
      type: input.type,
      referenceType: "admin_adjustment",
      referenceId,
      description: reason,
      metadata: { actorUserId: input.actorUserId, adminType: input.type },
    });
  }

  const balance = await creditService.getBalance(input.targetUserId);

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    action: input.auditAction,
    targetType: "credit_account",
    targetId: input.targetUserId,
    metadata: { amount: input.amount, reason, newBalance: balance.balance },
    ipAddress: input.ipAddress ?? null,
    requestId: input.requestId ?? null,
  });

  return { newBalance: balance.balance };
}

export async function adminGrantCredits(input: AdminCreditRequest) {
  return applyAdminCreditChange({
    ...input,
    type: "admin_grant",
    auditAction: AUDIT_ACTIONS.ADMIN_CREDIT_GRANT,
    referenceSuffix: "grant",
  });
}

export async function adminDeductCredits(input: AdminCreditRequest) {
  return applyAdminCreditChange({
    ...input,
    type: "admin_deduct",
    auditAction: AUDIT_ACTIONS.ADMIN_CREDIT_DEDUCT,
    referenceSuffix: "deduct",
  });
}

export async function adminRefundCredits(input: AdminCreditRequest) {
  return applyAdminCreditChange({
    ...input,
    type: "admin_refund",
    auditAction: AUDIT_ACTIONS.ADMIN_CREDIT_REFUND,
    referenceSuffix: "refund",
  });
}

/** Legacy combined adjustment — positive grant, negative deduct */
export async function adminAdjustCredits(
  input: AdminCreditRequest & { amount: number },
): Promise<{ newBalance: number }> {
  if (input.amount > 0) {
    return adminGrantCredits({ ...input, amount: input.amount });
  }
  if (input.amount < 0) {
    return adminDeductCredits({ ...input, amount: Math.abs(input.amount) });
  }
  throw new CreditsError("Adjustment amount must be non-zero.", "invalid_amount");
}
