import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/auth", "/api/admin/debug-match"];

const ROLE_PATHS: Record<string, string[]> = {
  vendedor: ["/vendedor", "/desejos"],
  gestor: ["/gestor"],
  lojista: ["/lojista"],
  admin: ["/admin"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow static assets and API routes that don't need auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const user = req.auth?.user;

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (user as { role?: string }).role;

  // Check role-based access
  if (role && role !== "admin") {
    const allowedPaths = ROLE_PATHS[role] ?? [];
    const hasAccess =
      allowedPaths.some((p) => pathname.startsWith(p)) ||
      pathname === "/ajuda" ||
      pathname === "/configuracoes" ||
      pathname.startsWith("/api/");

    if (!hasAccess) {
      // Redirect to their own dashboard
      return NextResponse.redirect(new URL(`/${role}`, req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
