import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canUserAccessAsset } from "@/lib/assets/authorization";
import { storage } from "@/lib/storage";
import { isS3Enabled } from "@/lib/db/config";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

function resolveContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { path: pathSegments } = await params;
    const key = pathSegments.map(decodeURIComponent).join("/");

    if (!key || key.includes("..")) {
      return NextResponse.json({ error: "Invalid asset path." }, { status: 400 });
    }

    const allowed = await canUserAccessAsset(key, authResult.user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const contentType = resolveContentType(key);

    // Redirect large video assets to S3 presigned URLs to avoid buffering in Next.js.
    if (isS3Enabled() && isVideoContentType(contentType)) {
      const signedUrl = await storage.getSignedUrl(key, 3600);
      return NextResponse.redirect(signedUrl, { status: 302 });
    }

    const buffer = await storage.readFile(key);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
