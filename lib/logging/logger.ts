export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  jobId?: string;
  videoId?: string;
  photoshootId?: string;
  provider?: string;
  attempt?: number;
  status?: string;
  durationMs?: number;
  errorCategory?: string;
  event?: string;
  [key: string]: unknown;
}

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /authorization/i,
  /stripe/i,
  /bearer\s+/i,
];

function sanitizeValue(key: string, value: unknown): unknown {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(key))) {
    return "[REDACTED]";
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  return value;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeValue(key, value);
  }
  return sanitized;
}

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[getLogLevel()];
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(context),
  };

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

export function getRequestIdFromHeaders(headers: Headers): string | null {
  const value = headers.get("x-request-id")?.trim();
  if (!value || value.length > 128) return null;
  return value;
}

export function createRequestId(): string {
  return crypto.randomUUID();
}
