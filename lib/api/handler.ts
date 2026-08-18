import { NextResponse } from "next/server";
import { createRequestId, getRequestIdFromHeaders, logger } from "@/lib/logging/logger";
import { checkRateLimit, resolveRateLimitScope } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { captureServerException } from "@/lib/observability/sentry";
import type { User } from "@/types";

type ApiHandler = (
  request: Request,
  context: { user: User; requestId: string },
) => Promise<Response>;

export function withApiAuth(handler: ApiHandler) {
  return async (request: Request): Promise<Response> => {
    const requestId =
      getRequestIdFromHeaders(request.headers) ?? createRequestId();
    const startedAt = Date.now();
    const pathname = new URL(request.url).pathname;

    try {
      const scope = resolveRateLimitScope(pathname);
      if (scope) {
        const identifier =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip") ??
          "anonymous";
        const rate = await checkRateLimit(scope, identifier);
        if (!rate.allowed) {
          return NextResponse.json(
            { error: "Too many requests. Please try again shortly." },
            {
              status: 429,
              headers: {
                ...rate.headers,
                "X-Request-ID": requestId,
              },
            },
          );
        }
      }

      const authResult = await requireApiUser();
      if ("response" in authResult) {
        authResult.response.headers.set("X-Request-ID", requestId);
        return authResult.response;
      }

      const response = await handler(request, {
        user: authResult.user,
        requestId,
      });

      response.headers.set("X-Request-ID", requestId);
      logger.info("api.request.completed", {
        requestId,
        userId: authResult.user.id,
        event: pathname,
        status: String(response.status),
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      logger.error("api.request.failed", {
        requestId,
        event: pathname,
        durationMs: Date.now() - startedAt,
        errorCategory: "unknown_error",
        message: error instanceof Error ? error.message : String(error),
      });
      captureServerException(error, { requestId, route: pathname });
      return NextResponse.json(
        { error: "Something went wrong. Please try again.", requestId },
        { status: 500, headers: { "X-Request-ID": requestId } },
      );
    }
  };
}

export function safeApiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
