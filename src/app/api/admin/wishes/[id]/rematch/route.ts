import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runMatchingForWish } from "@/lib/services/match-runner";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await ctx.params;
  try {
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
