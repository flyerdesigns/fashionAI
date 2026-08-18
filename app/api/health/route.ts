import { NextResponse } from "next/server";
import { getReadinessCheck } from "@/lib/health/checks";

export async function GET() {
  const readiness = await getReadinessCheck();
  const statusCode =
    readiness.status === "ok" ? 200 : readiness.status === "degraded" ? 200 : 503;

  return NextResponse.json(
    {
      status: readiness.status,
      service: "atelier-ai",
      version: readiness.version,
      services: readiness.services,
    },
    { status: statusCode },
  );
}
