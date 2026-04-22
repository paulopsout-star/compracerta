import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";

const ROLES = ["vendedor", "gestor", "lojista", "admin"] as const;

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  if (noDdi.length !== 10 && noDdi.length !== 11) return null;
  return `+55${noDdi}`;
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(ROLES).optional(),
  dealershipId: z.string().nullable().optional(),
  dealerStoreId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  return { session, userId: session.user.id as string };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    // Conflito de e-mail (só se email sendo alterado)
    if (d.email) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", d.email)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "E-mail já usado por outro usuário" }, { status: 409 });
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
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  if (id === gate.userId) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta" }, { status: 400 });
  }

  try {
    // Soft delete: apenas desativa. Exclusão hard causaria problemas com wishes/notifications FK.
    const { error } = await supabase.from("users").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] Error deactivating user:", err);
    return NextResponse.json({ error: "Erro ao desativar usuário" }, { status: 500 });
  }
}
