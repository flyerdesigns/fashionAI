export type CreditOperation =
  | "photoshoot_image"
  | "regenerate_image"
  | "retry_failed_image"
  | "video_generation"
  | "upscale"
  | "background_removal";

export type CreditTransactionType =
  | "signup_bonus"
  | "subscription_credit"
  | "credit_purchase"
  | "generation_reservation"
  | "generation_consumed"
  | "generation_refund"
  | "manual_adjustment"
  | "admin_grant"
  | "admin_deduct"
  | "admin_refund"
  | "expiration";

export type CreditReservationStatus = "reserved" | "consumed" | "released";

/**
 * Amount convention:
 * - Grants (signup, subscription, purchase): positive amount on balance
 * - Reservation: negative amount on balance (available decreases)
 * - Consumption: recorded separately; moves value from reserved → consumed
 * - Refund/release: positive amount on balance (available increases)
 */
export const CREDIT_AMOUNT_CONVENTION =
  "Positive amounts increase available balance; negative amounts decrease it.";

export interface CreditBalanceView {
  balance: number;
  reserved: number;
  available: number;
  lifetimeGranted: number;
  lifetimeConsumed: number;
}

export interface CreditTransactionView {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface UsageRecordView {
  id: string;
  operation: string;
  credits: number;
  status: string;
  provider: string;
  model: string | null;
  generationJobId: string | null;
  photoshootId: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface VideoSettlementInput {
  videoGenerationJobId: string;
  userId: string;
  videoId: string;
  provider: string;
  model?: string;
  credits: number;
  success: boolean;
}

export interface JobSettlementInput {
  generationJobId: string;
  userId: string;
  photoshootId: string;
  provider: string;
  operation: CreditOperation;
  costPerImage: number;
  completedImages: number;
  failedImages: number;
  cancelledImages: number;
  model?: string;
}

export interface GrantCreditsInput {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  referenceType: string;
  referenceId: string;
  description: string;
  metadata?: Record<string, unknown>;
}
