import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { TENANT_HEADERS, normalizeHost, resolveTenantByHost } from "@/lib/tenant";

const PUBLIC_PATHS = ["/", "/login", "/api/auth", "/api/webhooks", "/api/cron"];

const ROLE_PATHS: Record<string, string[]> = {
  vendedor: ["/vendedor", "/desejos"],
  gestor: ["/gestor"],
  lojista: ["/lojista"],
  admin: ["/admin"],
};

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Resolve tenant pelo host antes de qualquer roteamento. Cache em memória
  // (60s) limita custo. Falha cai no tenant default `compra-certa`.
  const rawHost = req.headers.get("host") ?? req.nextUrl.host ?? "";
  const host = normalizeHost(rawHost);
  const tenant = await resolveTenantByHost(host);

  const requestHeaders = new Headers(req.headers);
  if (tenant) {
    requestHeaders.set(TENANT_HEADERS.id, tenant.id);
    requestHeaders.set(TENANT_HEADERS.slug, tenant.slug);
    requestHeaders.set(TENANT_HEADERS.host, host);
  }

  function next() {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return next();
  }

  // Allow static assets and API routes that don't need auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return next();
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

  return next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
