export class CreditsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "CreditsError";
  }
}

export class InsufficientCreditsError extends CreditsError {
  constructor(required: number, available: number) {
    super(
      `Insufficient credits. You need ${required} credits but only have ${available}.`,
      "insufficient_credits",
      402,
    );
    this.name = "InsufficientCreditsError";
  }
}

export function userFacingCreditsMessage(error: unknown): string {
  if (error instanceof InsufficientCreditsError) {
    return error.message;
  }
  if (error instanceof CreditsError) {
    return error.message;
  }
  return "Unable to process credits. Please try again.";
}
