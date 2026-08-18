export type InfrastructureErrorCode =
  | "database_unavailable"
  | "storage_unavailable"
  | "storage_permission_denied"
  | "storage_object_missing"
  | "storage_upload_failed"
  | "database_constraint_violation"
  | "database_transaction_failed";

export class InfrastructureError extends Error {
  constructor(
    message: string,
    public code: InfrastructureErrorCode,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}

export function normalizeInfrastructureError(error: unknown): InfrastructureError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("p1001") || lower.includes("can't reach database")) {
    return new InfrastructureError("Database is unavailable.", "database_unavailable", error);
  }

  if (lower.includes("p2002") || lower.includes("unique constraint")) {
    return new InfrastructureError(
      "A database constraint was violated.",
      "database_constraint_violation",
      error,
    );
  }

  if (lower.includes("transaction") || lower.includes("p2034")) {
    return new InfrastructureError(
      "Database transaction failed.",
      "database_transaction_failed",
      error,
    );
  }

  if (lower.includes("accessdenied") || lower.includes("403")) {
    return new InfrastructureError(
      "Storage permission denied.",
      "storage_permission_denied",
      error,
    );
  }

  if (lower.includes("nosuchkey") || lower.includes("not found") || lower.includes("404")) {
    return new InfrastructureError("Storage object not found.", "storage_object_missing", error);
  }

  if (lower.includes("upload") || lower.includes("putobject")) {
    return new InfrastructureError("Storage upload failed.", "storage_upload_failed", error);
  }

  if (
    lower.includes("s3") ||
    lower.includes("aws") ||
    lower.includes("storage") ||
    lower.includes("enoent")
  ) {
    return new InfrastructureError("Storage is unavailable.", "storage_unavailable", error);
  }

  return new InfrastructureError("An infrastructure error occurred.", "database_unavailable", error);
}

export function userFacingInfrastructureMessage(error: InfrastructureError): string {
  switch (error.code) {
    case "database_unavailable":
    case "database_transaction_failed":
      return "The service is temporarily unavailable. Please try again.";
    case "database_constraint_violation":
      return "This action could not be completed because of conflicting data.";
    case "storage_permission_denied":
    case "storage_unavailable":
    case "storage_upload_failed":
    case "storage_object_missing":
      return "Unable to access stored files. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
