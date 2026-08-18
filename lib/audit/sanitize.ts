const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "apikey",
  "api_key",
  "secret",
  "token",
  "stripe_secret",
  "gemini_api_key",
  "authorization",
  "cookie",
  "session",
]);

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return sanitizeValue(metadata) as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = "[REDACTED]";
        continue;
      }
      result[key] = sanitizeValue(nested);
    }
    return result;
  }
  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}…`;
  }
  return value;
}
