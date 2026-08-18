import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { checkRateLimit, resolveRateLimitScope } from "@/lib/rate-limit";
import { createRequestId, getRequestIdFromHeaders } from "@/lib/logging/logger";
import { isAdminRole } from "@/lib/admin/config";
import {
  isSuspendedApiPathAllowed,
  isSuspendedPageAllowed,
  USER_ACCOUNT_STATUS,
} from "@/lib/auth/account-status";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/create",
  "/products",
  "/photoshoots",
  "/generation",
  "/video-generation",
  "/videos",
  "/templates",
  "/credits",
  "/settings",
  "/admin",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/stripe/webhook",
];

function isProtectedAppRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const requestId = getRequestIdFromHeaders(req.headers) ?? createRequestId();
  const isSuspended =
    isLoggedIn && req.auth?.user?.status === USER_ACCOUNT_STATUS.SUSPENDED;

  const attachRequestId = (response: NextResponse) => {
    response.headers.set("X-Request-ID", requestId);
    return response;
  };

  if (pathname.startsWith("/api/")) {
    if (isPublicApiRoute(pathname)) {
      return attachRequestId(NextResponse.next());
    }

    const scope = resolveRateLimitScope(pathname);
    if (scope) {
      const identifier =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "anonymous";
      try {
        const rate = await checkRateLimit(scope, identifier);
        if (!rate.allowed) {
          return attachRequestId(
            NextResponse.json(
              { error: "Too many requests. Please try again shortly." },
              { status: 429, headers: rate.headers },
            ),
          );
        }
      } catch {
        if (process.env.NODE_ENV === "production" && process.env.RATE_LIMIT_PROVIDER === "redis") {
          return attachRequestId(
            NextResponse.json(
              { error: "Rate limiting unavailable. Please try again shortly." },
              { status: 503 },
            ),
          );
        }
      }
    }

    if (!isLoggedIn) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (
      isSuspended &&
      !isSuspendedApiPathAllowed(pathname, req.method) &&
      !pathname.startsWith("/api/admin/")
    ) {
      return attachRequestId(
        NextResponse.json({ error: "Account suspended." }, { status: 403 }),
      );
    }

    return attachRequestId(NextResponse.next());
  }

  if (pathname === "/account-suspended") {
    if (!isLoggedIn) {
      return attachRequestId(NextResponse.redirect(new URL("/login", req.url)));
    }
    return attachRequestId(NextResponse.next());
  }

  if (isSuspended && isProtectedAppRoute(pathname) && !isSuspendedPageAllowed(pathname)) {
    return attachRequestId(NextResponse.redirect(new URL("/account-suspended", req.url)));
  }

  if (pathname === "/login" || pathname === "/signup") {
    if (isLoggedIn) {
      return attachRequestId(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
    return attachRequestId(NextResponse.next());
  }

  if (isProtectedAppRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return attachRequestId(NextResponse.redirect(loginUrl));
  }

  if (
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    isLoggedIn &&
    !isAdminRole(req.auth?.user?.role)
  ) {
    return attachRequestId(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  if (pathname.startsWith("/api/admin/") && isLoggedIn && !isAdminRole(req.auth?.user?.role)) {
    return attachRequestId(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  return attachRequestId(NextResponse.next());
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/create/:path*",
    "/products/:path*",
    "/photoshoots/:path*",
    "/generation/:path*",
    "/video-generation/:path*",
    "/videos/:path*",
    "/templates/:path*",
    "/credits/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/account-suspended",
    "/api/:path*",
  ],
};
