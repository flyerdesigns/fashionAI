import { NextResponse } from "next/server";
import { getLivenessCheck } from "@/lib/health/checks";

export async function GET() {
  return NextResponse.json(getLivenessCheck());
}
