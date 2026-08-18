import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getWorkerHeartbeats } from "@/lib/admin/service";
import { runReadinessChecks } from "@/lib/health/checks";

export async function GET() {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const [workers, health] = await Promise.all([
    getWorkerHeartbeats(),
    runReadinessChecks(),
  ]);

  return NextResponse.json({
    workers,
    health,
    timestamp: new Date().toISOString(),
  });
}
