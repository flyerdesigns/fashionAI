import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canUserAccessAsset } from "@/lib/assets/authorization";
import { storage } from "@/lib/storage";
import { isS3Enabled } from "@/lib/db/config";

export async function GET(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Invalid asset key." }, { status: 400 });
  }

  const allowed = await canUserAccessAsset(key, authResult.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (!isS3Enabled()) {
    return NextResponse.json({
      url: `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`,
      expiresAt: null,
      provider: "local",
    });
  }

  const expiresInSeconds = 3600;
  const url = await storage.getSignedUrl(key, expiresInSeconds);

  return NextResponse.json({
    url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    provider: "s3",
  });
}
