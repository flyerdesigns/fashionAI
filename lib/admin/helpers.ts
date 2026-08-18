export function parsePagination(searchParams: URLSearchParams, defaults?: { limit?: number }) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(defaults?.limit ?? 25), 10) || (defaults?.limit ?? 25)),
  );
  return { page, limit };
}

export function getRequestMeta(request: Request): {
  ipAddress: string | null;
  requestId: string | null;
} {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    requestId: request.headers.get("x-request-id"),
  };
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
