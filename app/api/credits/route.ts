import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { creditService } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";

export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  if (!isPostgresEnabled()) {
    return NextResponse.json({
      balance: 0,
      reserved: 0,
      available: 0,
    });
  }

  const balance = await creditService.getBalance(authResult.user.id);
  return NextResponse.json({
    balance: balance.balance,
    reserved: balance.reserved,
    available: balance.available,
  });
}
