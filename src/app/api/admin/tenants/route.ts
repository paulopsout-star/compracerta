import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { invalidateTenantCache } from "@/lib/tenant";
import { getSuperadminScope } from "@/lib/tenant-scope";

export const runtime = "nodejs";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  legalName: z.string().max(120).optional(),
  cnpj: z.string().optional(),
  primaryDomain: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().optional(),
  appName: z.string().min(1).max(120).optional(),
  tagline: z.string().max(120).optional(),
  primaryColor: z.string().regex(HEX_COLOR).default("#2563EB"),
  secondaryColor: z.string().regex(HEX_COLOR).default("#111827"),
  accentColor: z.string().regex(HEX_COLOR).default("#10B981"),
});

// GET /api/admin/tenants — lista tenants (com KPIs basicos). Apenas superadmin.
export async function GET() {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  try {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, slug, primary_domain, support_email, active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    // KPIs por tenant (consultas paralelas — barato com indices em tenant_id)
    const ids = (tenants ?? []).map((t) => t.id as string);
    const kpis = await Promise.all(
      ids.map(async (id) => {
        const [users, wishes, offers] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", id).eq("active", true),
          supabase.from("wishes").select("*", { count: "exact", head: true }).eq("tenant_id", id),
          supabase.from("offers").select("*", { count: "exact", head: true }).eq("tenant_id", id).eq("active", true),
        ]);
        return {
          id,
          users: users.count ?? 0,
          wishes: wishes.count ?? 0,
          offers: offers.count ?? 0,
        };
      })
    );
    const kpiMap = new Map(kpis.map((k) => [k.id, k]));

    const data = (tenants ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      primaryDomain: t.primary_domain,
      supportEmail: t.support_email,
      active: t.active,
      createdAt: t.created_at,
      kpis: kpiMap.get(t.id as string) ?? { users: 0, wishes: 0, offers: 0 },
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API] admin/tenants GET error:", err);
    return NextResponse.json({ error: "Erro ao listar tenants" }, { status: 500 });
  }
}

// POST /api/admin/tenants — cria tenant + branding + dominio inicial (opcional)
export async function POST(req: NextRequest) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const slug = d.slug?.trim() || slugify(d.name);
    const primaryDomain = d.primaryDomain?.trim().toLowerCase() || null;

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({
        name: d.name,
        legal_name: d.legalName ?? null,
        cnpj: d.cnpj?.replace(/\D/g, "") || null,
        slug,
        primary_domain: primaryDomain,
        support_email: d.supportEmail || null,
        support_phone: d.supportPhone ?? null,
        active: true,
        metadata: { source: "ui:superadmin" },
      })
      .select("id, name, slug")
      .single();

    if (tenantErr) {
      const msg = tenantErr.message?.includes("duplicate") ? "Slug, CNPJ ou domínio já em uso" : tenantErr.message;
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const { error: brandingErr } = await supabase.from("tenant_branding").insert({
      tenant_id: tenant.id,
      app_name: d.appName ?? d.name,
      tagline: d.tagline ?? null,
      primary_color: d.primaryColor.toUpperCase(),
      secondary_color: d.secondaryColor.toUpperCase(),
      accent_color: d.accentColor.toUpperCase(),
      sidebar_primary_color: d.primaryColor.toUpperCase(),
    });
    if (brandingErr) {
      // Tentar limpar tenant criado — senão fica em estado inconsistente
      await supabase.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json({ error: `Erro ao criar branding: ${brandingErr.message}` }, { status: 500 });
    }

    if (primaryDomain) {
      await supabase.from("tenant_domains").insert({
        tenant_id: tenant.id,
        domain: primaryDomain,
        is_primary: true,
        verified: false,
      });
    }

    invalidateTenantCache();
    return NextResponse.json({ data: { id: tenant.id, slug: tenant.slug, name: tenant.name } }, { status: 201 });
  } catch (err) {
    console.error("[API] admin/tenants POST error:", err);
    return NextResponse.json({ error: "Erro ao criar tenant" }, { status: 500 });
  }
}
