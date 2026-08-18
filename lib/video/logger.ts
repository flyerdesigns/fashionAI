type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? `${message} ${JSON.stringify(meta)}` : message;
  if (level === "error") console.error(`[video] ${payload}`);
  else if (level === "warn") console.warn(`[video] ${payload}`);
  else console.log(`[video] ${payload}`);
}

export const videoLogger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
