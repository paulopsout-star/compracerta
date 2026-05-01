import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { getAdminScope } from "@/lib/tenant-scope";

const ROLES = ["vendedor", "gestor", "lojista", "admin", "superadmin"] as const;

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  if (noDdi.length !== 11) return null; // só celular: DDD + 9 + 8 digitos
  return `+55${noDdi}`;
}

function phoneIsValidIfPresent(raw: string | null | undefined): boolean {
  if (!raw) return true;
  return normalizePhone(raw) !== null;
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().nullable().optional().refine(
    phoneIsValidIfPresent,
    "Telefone deve ter 11 dígitos: DDD + 9 + número"
  ),
  role: z.enum(ROLES).optional(),
  dealershipId: z.string().nullable().optional(),
  dealerStoreId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    // Garante que o usuário-alvo pertence ao tenant atual (admin não cruza).
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, tenant_id, role, phone")
      .eq("id", id)
      .maybeSingle();
    if (!targetUser || targetUser.tenant_id !== scope.tenantId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Apenas superadmin pode promover/rebaixar superadmin.
    if (d.role !== undefined && d.role === "superadmin" && !scope.isSuperadmin) {
      return NextResponse.json({ error: "Apenas superadmin pode atribuir superadmin" }, { status: 403 });
    }
    if (targetUser.role === "superadmin" && !scope.isSuperadmin) {
      return NextResponse.json({ error: "Apenas superadmin pode editar superadmin" }, { status: 403 });
    }

    // Conflito de e-mail dentro do mesmo tenant
    if (d.email) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("tenant_id", scope.tenantId)
        .eq("email", d.email)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "E-mail já usado por outro usuário deste tenant" }, { status: 409 });
      }
    }

    // Vendedor exige telefone no estado FINAL pós-update.
    if (d.role !== undefined || d.phone !== undefined) {
      const finalRole = d.role ?? (targetUser.role as string);
      const finalPhoneNormalized = d.phone !== undefined
        ? normalizePhone(d.phone)
        : normalizePhone(targetUser.phone as string | null | undefined);
      if (finalRole === "vendedor" && !finalPhoneNormalized) {
        return NextResponse.json(
          { error: "Vendedor precisa de telefone com 11 dígitos (acesso via WhatsApp)" },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.name !== undefined)          update.name = d.name;
    if (d.email !== undefined)         update.email = d.email;
    if (d.phone !== undefined)         update.phone = normalizePhone(d.phone);
    if (d.role !== undefined)          update.role = d.role;
    if (d.dealershipId !== undefined)  update.dealership_id = d.dealershipId || null;
    if (d.dealerStoreId !== undefined) update.dealer_store_id = d.dealerStoreId || null;
    if (d.active !== undefined)        update.active = d.active;
    if (d.password)                    update.password_hash = await hash(d.password, 12);

    const { data, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", id)
      .eq("tenant_id", scope.tenantId)
      .select("id, name, email, phone, role, dealership_id, dealer_store_id, active, created_at")
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API] Error updating user:", err);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  const { id } = await ctx.params;
  if (id === scope.userId) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta" }, { status: 400 });
  }

  try {
    // Soft delete: apenas desativa. Exclusão hard causaria problemas com wishes/notifications FK.
    const { error } = await supabase
      .from("users")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", scope.tenantId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] Error deactivating user:", err);
    return NextResponse.json({ error: "Erro ao desativar usuário" }, { status: 500 });
  }
}
