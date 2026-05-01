import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { invalidateTenantCache } from "@/lib/tenant";
import { getSuperadminScope } from "@/lib/tenant-scope";

export const runtime = "nodejs";

const addSchema = z.object({
  domain: z.string().min(3).max(253),
  isPrimary: z.boolean().optional().default(false),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/tenants/[id]/domains — adiciona dominio
export async function POST(req: NextRequest, ctx: RouteContext) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const domain = parsed.data.domain.trim().toLowerCase();
    const isPrimary = !!parsed.data.isPrimary;

    // Se for primary, demove os outros primary do mesmo tenant
    if (isPrimary) {
      await supabase.from("tenant_domains").update({ is_primary: false }).eq("tenant_id", id).eq("is_primary", true);
    }

    const { data, error } = await supabase
      .from("tenant_domains")
      .insert({ tenant_id: id, domain, is_primary: isPrimary, verified: false })
      .select("id, domain, is_primary, verified, created_at")
      .single();
    if (error) {
      const msg = error.message?.includes("duplicate") ? "Domínio já cadastrado" : error.message;
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (isPrimary) {
      await supabase.from("tenants").update({ primary_domain: domain }).eq("id", id);
    }
    invalidateTenantCache();
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[API] tenants/[id]/domains POST error:", err);
    return NextResponse.json({ error: "Erro ao adicionar dominio" }, { status: 500 });
  }
}

// DELETE /api/admin/tenants/[id]/domains?domain=... — remove dominio
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const scopeRes = await getSuperadminScope();
  if (!scopeRes.ok) return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });

  const { id } = await ctx.params;
  const domainId = req.nextUrl.searchParams.get("domainId");
  if (!domainId) return NextResponse.json({ error: "domainId obrigatorio" }, { status: 400 });

  try {
    const { data: row } = await supabase
      .from("tenant_domains")
      .select("domain, is_primary, tenant_id")
      .eq("id", domainId)
      .maybeSingle();
    if (!row || row.tenant_id !== id) {
      return NextResponse.json({ error: "Dominio não encontrado" }, { status: 404 });
    }
    const { error } = await supabase.from("tenant_domains").delete().eq("id", domainId);
    if (error) throw error;
    if (row.is_primary) {
      // Remove primary_domain do tenant para refletir
      await supabase.from("tenants").update({ primary_domain: null }).eq("id", id);
    }
    invalidateTenantCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] tenants/[id]/domains DELETE error:", err);
    return NextResponse.json({ error: "Erro ao remover dominio" }, { status: 500 });
  }
}
