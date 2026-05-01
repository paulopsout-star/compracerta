import { NextRequest, NextResponse } from "next/server";
import { supabase, insert } from "@/lib/db";
import { getRequestScope } from "@/lib/tenant-scope";

// GET /api/ofertas — List offers
export async function GET(request: NextRequest) {
  try {
    const scopeRes = await getRequestScope();
    if (!scopeRes.ok) {
      return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
    }
    const { scope } = scopeRes;

    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source");
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("offers")
      .select("*", { count: "exact" })
      .eq("tenant_id", scope.tenantId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) query = query.eq("source", source);
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (model) query = query.ilike("model", `%${model}%`);

    // Lojistas see only their own stock (dentro do tenant)
    if (scope.role === "lojista" && scope.dealerStoreId) {
      query = query.eq("dealer_store_id", scope.dealerStoreId);
    }

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
    console.error("[API] Error listing offers:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/ofertas — Create offer (from stock upload or manual)
export async function POST(request: NextRequest) {
  try {
    const scopeRes = await getRequestScope();
    if (!scopeRes.ok) {
      return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
    }
    const { scope } = scopeRes;

    const body = await request.json();

    const offer = await insert("offers", {
      tenant_id: scope.tenantId,
      source: body.source ?? "estoque_lojista",
      source_id: body.sourceId ?? `manual-${Date.now()}`,
      plate: body.plate || null,
      brand: body.brand,
      model: body.model,
      version: body.version || null,
      year: body.year,
      km: body.km,
      color: body.color || null,
      price: body.price,
      city: body.city,
      state: body.state,
      dealer_store_id: scope.dealerStoreId ?? null,
    });

    return NextResponse.json({ message: "Oferta criada", offer }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating offer:", error);
    return NextResponse.json({ error: "Erro ao criar oferta" }, { status: 500 });
  }
}
