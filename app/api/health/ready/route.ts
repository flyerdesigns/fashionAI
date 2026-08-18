import { NextResponse } from "next/server";
import { getReadinessCheck } from "@/lib/health/checks";

export async function GET() {
  const readiness = await getReadinessCheck();
  const statusCode =
    readiness.status === "unavailable" ? 503 : readiness.status === "degraded" ? 200 : 200;

  return NextResponse.json(readiness, { status: statusCode });
}
