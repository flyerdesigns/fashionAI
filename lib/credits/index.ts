export { creditService, createCreditAccountForUser } from "./service";
export type {
  CreditBalanceView,
  CreditTransactionView,
  UsageRecordView,
  PaginatedResult,
  CreditOperation,
  CreditTransactionType,
} from "./types";
export {
  calculateGenerationCost,
  getCostPerImage,
  getImageGenerationCost,
  getSignupBonusCredits,
  getVideoGenerationCost,
  mapJobTypeToOperation,
} from "./config";
export {
  CreditsError,
  InsufficientCreditsError,
  userFacingCreditsMessage,
} from "./errors";
export { CREDIT_AMOUNT_CONVENTION } from "./types";

/** @deprecated Use creditService.getBalance().available */
export interface CreditBalance {
  remaining: number;
  used: number;
  total: number;
}

import { creditService } from "./service";
import { isPostgresEnabled } from "@/lib/db/config";

/** Legacy-compatible credits accessor for auth/dashboard */
export const credits = {
  async getBalance(userId: string): Promise<CreditBalance> {
    if (!isPostgresEnabled()) {
      return { remaining: 0, used: 0, total: 0 };
    }
    const view = await creditService.getBalance(userId);
    return {
      remaining: view.available,
      used: view.lifetimeConsumed,
      total: view.lifetimeGranted,
    };
  },
  async deduct(): Promise<CreditBalance> {
    throw new Error("Use creditService.reserve/settle instead of deduct.");
  },
};
