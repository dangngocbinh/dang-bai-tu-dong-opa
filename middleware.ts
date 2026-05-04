import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_PAGES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/setup",
];

// API routes that skip JWT auth (use their own auth method)
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/setup",
  "/api/posts/callback",
  "/api/telegram/webhook",
  "/api/cron",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public API routes
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public pages — but redirect already-logged-in users away from auth pages
  if (PUBLIC_PAGES.includes(pathname)) {
    if (req.auth && pathname !== "/setup") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Not authenticated → redirect to login with callbackUrl
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    if (req.auth.user.role !== "admin") {
      return NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "Không có quyền truy cập" } },
        { status: 403 }
      );
    }
  }

  // Admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (req.auth.user.role !== "admin") {
      return NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "Không có quyền truy cập" } },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
