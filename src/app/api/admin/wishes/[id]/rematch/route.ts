import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { runMatchingForWish } from "@/lib/services/match-runner";
import { getAdminScope } from "@/lib/tenant-scope";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, ctx: RouteContext) {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  const { id } = await ctx.params;
  try {
    const { data: wish } = await supabase
      .from("wishes")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", scope.tenantId)
      .maybeSingle();
    if (!wish) {
      return NextResponse.json({ error: "Desejo não encontrado" }, { status: 404 });
    }
    const matches = await runMatchingForWish(id);
    return NextResponse.json({
      wishId: id,
      matchesFound: matches.length,
      matches: matches.slice(0, 10).map((m) => ({
        score: Math.round(m.score),
        offer: {
          source: m.offer.source,
          brand: m.offer.brand,
          model: m.offer.model,
          year: m.offer.year,
          km: m.offer.km,
          price: m.offer.price,
          city: m.offer.city,
          state: m.offer.state,
          externalStatus: m.offer.externalStatus,
          externalDealershipName: m.offer.externalDealershipName,
        },
      })),
    });
  } catch (err) {
    console.error("[API] rematch failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
