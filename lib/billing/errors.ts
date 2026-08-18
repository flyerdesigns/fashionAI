export class BillingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export function userFacingBillingMessage(error: unknown): string {
  if (error instanceof BillingError) {
    return error.message;
  }
  return "Unable to process billing request. Please try again.";
}
