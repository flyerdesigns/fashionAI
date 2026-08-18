import type { GenerationErrorCategory } from "@/types/generation-job";

interface GenerationLogContext {
  jobId?: string;
  photoshootId?: string;
  imageJobId?: string;
  provider?: string;
  pose?: string;
  status?: string;
  durationMs?: number;
  errorCategory?: GenerationErrorCategory;
  message?: string;
}

function formatContext(ctx: GenerationLogContext): string {
  const parts: string[] = [];
  if (ctx.jobId) parts.push(`jobId=${ctx.jobId}`);
  if (ctx.photoshootId) parts.push(`photoshootId=${ctx.photoshootId}`);
  if (ctx.imageJobId) parts.push(`imageJobId=${ctx.imageJobId}`);
  if (ctx.provider) parts.push(`provider=${ctx.provider}`);
  if (ctx.pose) parts.push(`pose=${ctx.pose}`);
  if (ctx.status) parts.push(`status=${ctx.status}`);
  if (ctx.durationMs !== undefined) parts.push(`durationMs=${ctx.durationMs}`);
  if (ctx.errorCategory) parts.push(`errorCategory=${ctx.errorCategory}`);
  return parts.join(" ");
}

export const generationLogger = {
  info(message: string, ctx: GenerationLogContext = {}) {
    console.info(`[generation] ${message} ${formatContext(ctx)}`.trim());
  },
  warn(message: string, ctx: GenerationLogContext = {}) {
    console.warn(`[generation] ${message} ${formatContext(ctx)}`.trim());
  },
  error(message: string, ctx: GenerationLogContext = {}, error?: unknown) {
    const errMsg = error instanceof Error ? error.message : error ? String(error) : "";
    console.error(`[generation] ${message} ${formatContext(ctx)} ${errMsg}`.trim());
  },
};
