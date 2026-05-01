import "server-only";

import { headers } from "next/headers";
import { supabase } from "@/lib/db";

export const TENANT_HEADERS = {
  id: "x-tenant-id",
  slug: "x-tenant-slug",
  host: "x-tenant-host",
} as const;

export const DEFAULT_TENANT_SLUG = "compra-certa";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface CacheEntry {
  tenant: ResolvedTenant;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
let defaultTenant: ResolvedTenant | null = null;

/**
 * Normaliza um host removendo porta. Aceita "localhost:3000" -> "localhost".
 */
export function normalizeHost(rawHost: string): string {
  return rawHost.split(":")[0].trim().toLowerCase();
}

async function fetchTenant(host: string): Promise<ResolvedTenant | null> {
  const { data, error } = await supabase.rpc("resolve_tenant_by_host", { host_name: host });
  if (error) {
    console.error("[tenant] resolve_tenant_by_host error:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.tenant_id,
    slug: row.tenant_slug,
    name: row.tenant_name,
    appName: row.app_name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
  };
}

async function fetchDefaultTenant(): Promise<ResolvedTenant | null> {
  if (defaultTenant) return defaultTenant;
  const { data, error } = await supabase
    .from("tenant_public_config")
    .select("id, slug, name, app_name, primary_color, secondary_color, accent_color")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .maybeSingle();
  if (error || !data) {
    console.error("[tenant] failed loading default tenant:", error?.message);
    return null;
  }
  defaultTenant = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    appName: data.app_name ?? data.name,
    primaryColor: data.primary_color ?? "#2563EB",
    secondaryColor: data.secondary_color ?? "#111827",
    accentColor: data.accent_color ?? "#10B981",
  };
  return defaultTenant;
}

/**
 * Resolve tenant pelo host. Hits cacheados expiram em 60s. Se host não casar
 * com nenhum tenant ativo, cai para o tenant default `compra-certa`.
 */
export async function resolveTenantByHost(rawHost: string): Promise<ResolvedTenant | null> {
  const host = normalizeHost(rawHost);
  const now = Date.now();

  const cached = cache.get(host);
  if (cached && cached.expiresAt > now) return cached.tenant;

  let tenant = await fetchTenant(host);
  if (!tenant) tenant = await fetchDefaultTenant();
  if (!tenant) return null;

  cache.set(host, { tenant, expiresAt: now + TTL_MS });
  return tenant;
}

/**
 * Limpa cache (testes e quando branding muda em runtime).
 */
export function invalidateTenantCache(host?: string) {
  if (host) cache.delete(normalizeHost(host));
  else cache.clear();
  defaultTenant = null;
}

/**
 * Lê tenant resolvido pelo proxy a partir dos headers da requisição.
 * Usar dentro de Server Components / Route Handlers.
 */
export async function getTenantFromHeaders(): Promise<ResolvedTenant | null> {
  const h = await headers();
  const id = h.get(TENANT_HEADERS.id);
  const slug = h.get(TENANT_HEADERS.slug);
  const host = h.get(TENANT_HEADERS.host);
  if (!id || !slug) return null;

  // Tenta refrescar config pública via cache (cheap se quente).
  if (host) {
    const cached = cache.get(normalizeHost(host));
    if (cached && cached.expiresAt > Date.now()) return cached.tenant;
  }

  // Fallback: dados mínimos vindos do header. Branding completo é carregado
  // sob demanda via getTenantConfig().
  return {
    id,
    slug,
    name: slug,
    appName: slug,
    primaryColor: "#2563EB",
    secondaryColor: "#111827",
    accentColor: "#10B981",
  };
}

export interface TenantPublicConfig {
  id: string;
  slug: string;
  name: string;
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginBackgroundUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarPrimaryColor: string;
  fontFamily: string;
  termsUrl: string | null;
  privacyUrl: string | null;
}

const configCache = new Map<string, { config: TenantPublicConfig; expiresAt: number }>();

/**
 * Config pública completa do tenant (branding). Cacheada em memória por 60s.
 * Para uso em layouts/login.
 */
export async function getTenantConfig(tenantId: string): Promise<TenantPublicConfig | null> {
  const now = Date.now();
  const cached = configCache.get(tenantId);
  if (cached && cached.expiresAt > now) return cached.config;

  const { data, error } = await supabase
    .from("tenant_public_config")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error || !data) return null;

  const config: TenantPublicConfig = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    appName: data.app_name ?? data.name,
    tagline: data.tagline,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    loginBackgroundUrl: data.login_background_url,
    primaryColor: data.primary_color ?? "#2563EB",
    secondaryColor: data.secondary_color ?? "#111827",
    accentColor: data.accent_color ?? "#10B981",
    sidebarPrimaryColor: data.sidebar_primary_color ?? "#2563EB",
    fontFamily: data.font_family ?? "Inter",
    termsUrl: data.terms_url,
    privacyUrl: data.privacy_url,
  };
  configCache.set(tenantId, { config, expiresAt: now + TTL_MS });
  return config;
}

/**
 * Lança se nenhum tenant estiver resolvido. Use em rotas/handlers que exigem tenant.
 */
export async function requireTenant(): Promise<ResolvedTenant> {
  const t = await getTenantFromHeaders();
  if (!t) throw new Error("Tenant não resolvido — proxy não setou headers x-tenant-*");
  return t;
}

/**
 * Resolve tenant pelo Z-API instance ID. Usado em webhooks WhatsApp inbound
 * (1 instance ID por tenant). Faz lookup em `tenant_feature_flags` (key
 * `whatsapp.zapi.instance_id`) via função SQL `resolve_tenant_by_zapi_instance`.
 */
export async function resolveTenantByZapiInstanceId(instanceId: string): Promise<string | null> {
  if (!instanceId) return null;
  const { data, error } = await supabase.rpc("resolve_tenant_by_zapi_instance", {
    instance_id_input: instanceId,
  });
  if (error) {
    console.error("[tenant] resolve_tenant_by_zapi_instance error:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row?.tenant_id as string | undefined) ?? null;
}
