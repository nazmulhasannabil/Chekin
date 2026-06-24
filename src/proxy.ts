import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

interface Session {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    role?: string;
    isActive?: boolean;
  };
}

const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
];

const ADMIN_ROUTES = ["/admin"];
const EMPLOYEE_ROUTES = ["/app"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

const ADMIN_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "BRANCH_ADMIN", "AUDITOR"];
const MANAGER_ROLES = [...ADMIN_ROLES, "MANAGER"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  if (
    isPublicRoute(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline"
  ) {
    return NextResponse.next();
  }

  // Fetch session from Better Auth
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  // Not authenticated — redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user;

  // Deactivated account
  if (user.isActive === false) {
    return NextResponse.redirect(new URL("/login?error=account_disabled", request.url));
  }

  // Root redirect: send to appropriate home
  if (pathname === "/") {
    const role = user.role ?? "EMPLOYEE";
    if (ADMIN_ROLES.includes(role) || MANAGER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/app/attendance", request.url));
  }

  // Guard admin routes
  if (isAdminRoute(pathname)) {
    const role = user.role ?? "EMPLOYEE";
    if (!MANAGER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/app/attendance", request.url));
    }
  }

  // Guard employee routes — all authenticated users allowed
  if (isAdminRoute(pathname) || EMPLOYEE_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user.organizationId) {
      return NextResponse.redirect(new URL("/login?error=no_org", request.url));
    }
  }

  // Pass org and role in request headers for Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-org-id", user.organizationId ?? "");
  requestHeaders.set("x-user-role", user.role ?? "EMPLOYEE");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.json|offline).*)",
  ],
};
