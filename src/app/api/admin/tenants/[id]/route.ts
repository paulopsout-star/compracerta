import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { invalidateTenantCache } from "@/lib/tenant";
import { getSuperadminScope } from "@/lib/tenant-scope";

export const runtime = "nodejs";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  legalName: z.string().max(120).nullable().optional(),
  cnpj: z.string().nullable().optional(),
  primaryDomain: z.string().nullable().optional(),
  supportEmail: z.string().email().nullable().optional().or(z.literal("")),
  supportPhone: z.string().nullable().optional(),
  active: z.boolean().optional(),
  appName: z.string().min(1).max(120).optional(),
  tagline: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal("")),
  logoDarkUrl: z.string().url().nullable().optional().or(z.literal("")),
  faviconUrl: z.string().url().nullable().optional().or(z.literal("")),
  loginBackgroundUrl: z.string().url().nullable().optional().or(z.literal("")),
  primaryColor: z.string().regex(HEX_COLOR).optional(),
  secondaryColor: z.string().regex(HEX_COLOR).optional(),
  accentColor: z.string().regex(HEX_COLOR).optional(),
  sidebarPrimaryColor: z.string().regex(HEX_COLOR).optional(),
  termsUrl: z.string().url().nullable().optional().or(z.literal("")),
  privacyUrl: z.string().url().nullable().optional().or(z.literal("")),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/tenants/[id] — detalhe completo (tenant + branding + dominios)
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  const { id } = await ctx.params;
  try {
    const [tenantRes, brandingRes, domainsRes] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", id).maybeSingle(),
      supabase.from("tenant_branding").select("*").eq("tenant_id", id).maybeSingle(),
      supabase.from("tenant_domains").select("id, domain, verified, is_primary, created_at, verified_at").eq("tenant_id", id).order("is_primary", { ascending: false }),
    ]);

    if (!tenantRes.data) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });

    const t = tenantRes.data;
    const b = brandingRes.data;
    return NextResponse.json({
      data: {
        id: t.id,
        name: t.name,
        legalName: t.legal_name,
        cnpj: t.cnpj,
        slug: t.slug,
        primaryDomain: t.primary_domain,
        supportEmail: t.support_email,
        supportPhone: t.support_phone,
        active: t.active,
        createdAt: t.created_at,
        branding: b
          ? {
              appName: b.app_name,
              tagline: b.tagline,
              logoUrl: b.logo_url,
              logoDarkUrl: b.logo_dark_url,
              faviconUrl: b.favicon_url,
              loginBackgroundUrl: b.login_background_url,
              primaryColor: b.primary_color,
              secondaryColor: b.secondary_color,
              accentColor: b.accent_color,
              sidebarPrimaryColor: b.sidebar_primary_color,
              fontFamily: b.font_family,
              termsUrl: b.terms_url,
              privacyUrl: b.privacy_url,
            }
          : null,
        domains: (domainsRes.data ?? []).map((d) => ({
          id: d.id,
          domain: d.domain,
          verified: d.verified,
          isPrimary: d.is_primary,
          createdAt: d.created_at,
          verifiedAt: d.verified_at,
        })),
      },
    });
  } catch (err) {
    console.error("[API] admin/tenants/[id] GET error:", err);
    return NextResponse.json({ error: "Erro ao carregar tenant" }, { status: 500 });
  }
}

// PUT /api/admin/tenants/[id] — atualiza tenant + branding numa unica chamada.
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    // Tenant fields
    const tenantUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.name !== undefined)          tenantUpdate.name = d.name;
    if (d.legalName !== undefined)     tenantUpdate.legal_name = d.legalName || null;
    if (d.cnpj !== undefined)          tenantUpdate.cnpj = d.cnpj?.replace(/\D/g, "") || null;
    if (d.primaryDomain !== undefined) tenantUpdate.primary_domain = d.primaryDomain?.trim().toLowerCase() || null;
    if (d.supportEmail !== undefined)  tenantUpdate.support_email = d.supportEmail || null;
    if (d.supportPhone !== undefined)  tenantUpdate.support_phone = d.supportPhone || null;
    if (d.active !== undefined)        tenantUpdate.active = d.active;

    if (Object.keys(tenantUpdate).length > 1) {
      const { error } = await supabase.from("tenants").update(tenantUpdate).eq("id", id);
      if (error) {
        return NextResponse.json({ error: `Erro ao atualizar tenant: ${error.message}` }, { status: 400 });
      }
    }

    // Branding fields
    const brandingUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.appName !== undefined)             brandingUpdate.app_name = d.appName;
    if (d.tagline !== undefined)             brandingUpdate.tagline = d.tagline || null;
    if (d.logoUrl !== undefined)             brandingUpdate.logo_url = d.logoUrl || null;
    if (d.logoDarkUrl !== undefined)         brandingUpdate.logo_dark_url = d.logoDarkUrl || null;
    if (d.faviconUrl !== undefined)          brandingUpdate.favicon_url = d.faviconUrl || null;
    if (d.loginBackgroundUrl !== undefined)  brandingUpdate.login_background_url = d.loginBackgroundUrl || null;
    if (d.primaryColor !== undefined)        brandingUpdate.primary_color = d.primaryColor.toUpperCase();
    if (d.secondaryColor !== undefined)      brandingUpdate.secondary_color = d.secondaryColor.toUpperCase();
    if (d.accentColor !== undefined)         brandingUpdate.accent_color = d.accentColor.toUpperCase();
    if (d.sidebarPrimaryColor !== undefined) brandingUpdate.sidebar_primary_color = d.sidebarPrimaryColor.toUpperCase();
    if (d.termsUrl !== undefined)            brandingUpdate.terms_url = d.termsUrl || null;
    if (d.privacyUrl !== undefined)          brandingUpdate.privacy_url = d.privacyUrl || null;

    if (Object.keys(brandingUpdate).length > 1) {
      const { error } = await supabase
        .from("tenant_branding")
        .upsert({ tenant_id: id, ...brandingUpdate }, { onConflict: "tenant_id" });
      if (error) {
        return NextResponse.json({ error: `Erro ao atualizar branding: ${error.message}` }, { status: 400 });
      }
    }

    invalidateTenantCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] admin/tenants/[id] PUT error:", err);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE /api/admin/tenants/[id] — soft delete via active=false. Bloqueia o
// tenant default `compra-certa` para evitar derrubar a aplicacao.
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  const { id } = await ctx.params;
  try {
    const { data: tenant } = await supabase.from("tenants").select("slug").eq("id", id).maybeSingle();
    if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    if (tenant.slug === "compra-certa") {
      return NextResponse.json({ error: "Tenant default não pode ser desativado" }, { status: 400 });
    }
    const { error } = await supabase
      .from("tenants")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    invalidateTenantCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] admin/tenants/[id] DELETE error:", err);
    return NextResponse.json({ error: "Erro ao desativar tenant" }, { status: 500 });
  }
}
