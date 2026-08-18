import * as Sentry from "@sentry/nextjs";

let initialized = false;

export function initSentryServer(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  initialized = true;
}

export function captureServerException(
  error: unknown,
  context?: {
    requestId?: string;
    userId?: string;
    route?: string;
    jobId?: string;
    photoshootId?: string;
    videoId?: string;
  },
): void {
  if (!process.env.SENTRY_DSN?.trim()) return;

  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("requestId", context.requestId);
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.route) scope.setTag("route", context.route);
    if (context?.jobId) scope.setTag("jobId", context.jobId);
    if (context?.photoshootId) scope.setTag("photoshootId", context.photoshootId);
    if (context?.videoId) scope.setTag("videoId", context.videoId);
    Sentry.captureException(error);
  });
}

export { Sentry };
