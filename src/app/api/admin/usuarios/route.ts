import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";

const ROLES = ["vendedor", "gestor", "lojista", "admin"] as const;

const createSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  email: z.string().email("E-mail inválido").toLowerCase(),
  phone: z.string().optional().nullable(),
  role: z.enum(ROLES),
  dealershipId: z.string().nullable().optional(),
  dealerStoreId: z.string().nullable().optional(),
  active: z.boolean().default(true),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [usersRes, dealershipsRes, storesRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, phone, role, dealership_id, dealer_store_id, active, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("dealerships").select("id, name, city, state, active").order("name"),
      supabase.from("dealer_stores").select("id, name, city, state, active").order("name"),
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
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    const { data: existing } = await supabase.from("users").select("id").eq("email", d.email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const passwordHash = await hash(d.password, 12);

    const { data: created, error: dbError } = await supabase
      .from("users")
      .insert({
        name: d.name,
        email: d.email,
        phone: d.phone || null,
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
