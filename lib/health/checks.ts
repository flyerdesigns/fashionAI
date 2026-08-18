import { isPostgresEnabled } from "@/lib/db/config";
import { isVideoProviderConfigured } from "@/lib/video/config";
import { getImageProviderConfig } from "@/lib/ai/config";
import { isStripeConfigured } from "@/lib/billing/config";
import { getRateLimitProviderId } from "@/lib/rate-limit";

export type ServiceStatus = "ok" | "degraded" | "unavailable" | "not_configured";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "unavailable";
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
    gemini: ServiceStatus;
    video: ServiceStatus;
    stripe: ServiceStatus;
    rateLimit: ServiceStatus;
  };
  version: string;
}

export async function checkDatabase(): Promise<ServiceStatus> {
  if (!isPostgresEnabled()) return "not_configured";
  try {
    const { prisma } = await import("@/lib/db/client");
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return latency > 2000 ? "degraded" : "ok";
  } catch {
    return "unavailable";
  }
}

export async function checkStorage(): Promise<ServiceStatus> {
  try {
    const { storage } = await import("@/lib/storage");
    const provider = process.env.STORAGE_PROVIDER?.trim() ?? "local";
    if (provider === "s3" && !process.env.AWS_S3_BUCKET?.trim()) {
      return "not_configured";
    }
    // Lightweight existence check via storage interface
    await storage.exists("__health_check_nonexistent__");
    return "ok";
  } catch {
    return "unavailable";
  }
}

export function checkGemini(): ServiceStatus {
  try {
    getImageProviderConfig();
    return "ok";
  } catch {
    return process.env.GEMINI_API_KEY?.trim() ? "degraded" : "not_configured";
  }
}

export function checkVideoProvider(): ServiceStatus {
  return isVideoProviderConfigured() ? "ok" : "not_configured";
}

export function checkStripe(): ServiceStatus {
  return isStripeConfigured() ? "ok" : "not_configured";
}

export function checkRateLimit(): ServiceStatus {
  const provider = getRateLimitProviderId();
  if (provider === "redis") {
    return process.env.REDIS_URL?.trim() ? "ok" : "not_configured";
  }
  return "ok";
}

export async function getReadinessCheck(): Promise<HealthCheckResult> {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  const gemini = checkGemini();
  const video = checkVideoProvider();
  const stripe = checkStripe();
  const rateLimit = checkRateLimit();

  const services = { database, storage, gemini, video, stripe, rateLimit };
  const critical = [database, storage];
  const hasUnavailable = critical.some((status) => status === "unavailable");
  const hasDegraded = Object.values(services).some(
    (status) => status === "degraded" || status === "unavailable",
  );

  return {
    status: hasUnavailable ? "unavailable" : hasDegraded ? "degraded" : "ok",
    services,
    version: "0.1.0",
  };
}

export function getLivenessCheck(): { status: "ok" } {
  return { status: "ok" };
}

export async function runReadinessChecks(): Promise<HealthCheckResult> {
  return getReadinessCheck();
}
