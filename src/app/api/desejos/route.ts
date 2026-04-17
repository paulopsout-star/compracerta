import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, insert } from "@/lib/db";
import { wishSchema } from "@/lib/validators/wish";

// POST /api/desejos — Create a new wish
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = wishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.validityDays);

    const wish = await insert("wishes", {
      seller_id: session.user.id,
      dealership_id: (session.user as Record<string, unknown>).dealershipId ?? null,
      client_name: data.clientName,
      client_phone: data.clientPhone,
      client_cpf: data.clientCpf || null,
      client_email: data.clientEmail || null,
      brand: data.brand,
      model: data.model,
      version: data.version || null,
      year_min: data.yearMin || null,
      year_max: data.yearMax || null,
      km_max: data.kmMax || null,
      price_min: data.priceMin || null,
      price_max: data.priceMax || null,
      colors: data.colors,
      transmission: data.transmission,
      fuel: data.fuel,
      city_ref: data.cityRef || null,
      state_ref: data.stateRef || null,
      radius_km: data.radiusKm,
      urgency: data.urgency,
      validity_days: data.validityDays,
      notes: data.notes || null,
      lgpd_consent: data.lgpdConsent,
      status: "procurando",
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json(
      { message: "Desejo cadastrado com sucesso", wish },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Error creating wish:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// GET /api/desejos — List wishes (with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const sellerId = searchParams.get("sellerId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("wishes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Role-based filtering
    const role = (session.user as Record<string, unknown>).role as string;
    if (role === "vendedor") {
      query = query.eq("seller_id", session.user.id);
    } else if (role === "gestor") {
      const dealershipId = (session.user as Record<string, unknown>).dealershipId;
      if (dealershipId) query = query.eq("dealership_id", dealershipId);
    }

    if (status) query = query.eq("status", status);
    if (sellerId && role !== "vendedor") query = query.eq("seller_id", sellerId);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("[API] Error listing wishes:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
