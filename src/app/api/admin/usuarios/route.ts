import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { getAdminScope } from "@/lib/tenant-scope";

const ROLES = ["vendedor", "gestor", "lojista", "admin", "superadmin"] as const;

/**
 * Normaliza telefone para E.164 brasileiro celular ("+55479XXXXXXXX").
 * Exige 11 dígitos (DDD + 9 + 8 dígitos). Retorna null se ausente ou inválido.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  if (noDdi.length !== 11) return null;
  return `+55${noDdi}`;
}

function phoneIsValidIfPresent(raw: string | null | undefined): boolean {
  if (!raw) return true;
  return normalizePhone(raw) !== null;
}

const createSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  email: z.string().email("E-mail inválido").toLowerCase(),
  phone: z.string().nullable().optional().refine(
    phoneIsValidIfPresent,
    "Telefone deve ter 11 dígitos: DDD + 9 + número"
  ),
  role: z.enum(ROLES),
  dealershipId: z.string().nullable().optional(),
  dealerStoreId: z.string().nullable().optional(),
  active: z.boolean().default(true),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
}).refine(
  (d) => d.role !== "vendedor" || (d.phone && d.phone.replace(/\D/g, "").length >= 10),
  { message: "Vendedor precisa de telefone (acesso via WhatsApp)", path: ["phone"] }
);

export async function GET() {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;
  try {
    const [usersRes, dealershipsRes, storesRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, phone, role, dealership_id, dealer_store_id, active, created_at")
        .eq("tenant_id", scope.tenantId)
        .order("created_at", { ascending: false }),
      supabase.from("dealerships").select("id, name, city, state, active").eq("tenant_id", scope.tenantId).order("name"),
      supabase.from("dealer_stores").select("id, name, city, state, active").eq("tenant_id", scope.tenantId).order("name"),
    ]);
    if (usersRes.error) throw usersRes.error;
    return NextResponse.json({
      data: usersRes.data,
      dealerships: dealershipsRes.data ?? [],
      dealerStores: storesRes.data ?? [],
    });
  } catch (err) {
    console.error("[API] Error listing users:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    // Email único dentro do tenant (índice users_tenant_email_unique).
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .eq("email", d.email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado neste tenant" }, { status: 409 });
    }

    // Apenas superadmin pode criar outro superadmin.
    if (d.role === "superadmin" && !scope.isSuperadmin) {
      return NextResponse.json({ error: "Apenas superadmin pode criar superadmin" }, { status: 403 });
    }

    const passwordHash = await hash(d.password, 12);

    const { data: created, error: dbError } = await supabase
      .from("users")
      .insert({
        tenant_id: scope.tenantId,
        name: d.name,
        email: d.email,
        phone: normalizePhone(d.phone),
        role: d.role,
        dealership_id: d.dealershipId || null,
        dealer_store_id: d.dealerStoreId || null,
        active: d.active,
        password_hash: passwordHash,
      })
      .select("id, name, email, phone, role, dealership_id, dealer_store_id, active, created_at")
      .single();

    if (dbError) throw dbError;
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[API] Error creating user:", err);
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
