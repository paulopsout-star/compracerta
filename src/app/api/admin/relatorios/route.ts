import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getAdminScope } from "@/lib/tenant-scope";

export const runtime = "nodejs";

const ALL_STATUSES = [
  "procurando",
  "match_encontrado",
  "em_negociacao",
  "convertido",
  "perdido",
  "expirado",
] as const;
type WishStatus = (typeof ALL_STATUSES)[number];

interface SummaryStatus {
  status: WishStatus;
  count: number;
}

interface MatchRow {
  id: string;
  score: number | null;
  status: string | null;
  created_at: string | null;
}

interface SellerRow { id: string; name: string | null; email: string | null }
interface DealershipRow { id: string; name: string | null; city: string | null; state: string | null }

interface WishRow {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year_min: number | null;
  year_max: number | null;
  status: WishStatus;
  client_name: string;
  client_phone: string;
  notes: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string | null;
  seller: SellerRow | null;
  dealership: DealershipRow | null;
  matches: MatchRow[] | null;
}

export async function GET() {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  try {
    const [statusCounts, wishesRes] = await Promise.all([
      Promise.all(
        ALL_STATUSES.map(async (s) => {
          const { count } = await supabase
            .from("wishes")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", scope.tenantId)
            .eq("status", s);
          return { status: s, count: count ?? 0 } satisfies SummaryStatus;
        })
      ),
      supabase
        .from("wishes")
        .select(
          `id, brand, model, version, year_min, year_max, status, client_name, client_phone, notes, created_at, expires_at, updated_at,
           seller:users!wishes_seller_id_fkey(id, name, email),
           dealership:dealerships!wishes_dealership_id_fkey(id, name, city, state),
           matches(id, score, status, created_at)`
        )
        .eq("tenant_id", scope.tenantId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (wishesRes.error) throw wishesRes.error;

    const rawWishes = (wishesRes.data ?? []) as unknown as WishRow[];
    const total = statusCounts.reduce((acc, s) => acc + s.count, 0);
    const get = (s: WishStatus) => statusCounts.find((x) => x.status === s)?.count ?? 0;

    const convertido = get("convertido");
    const perdido = get("perdido");
    const expirado = get("expirado");
    const closed = convertido + perdido + expirado;
    const conversionRate = closed > 0 ? Math.round((convertido / closed) * 1000) / 10 : 0;

    const wishesWithMatch = rawWishes.filter((w) => (w.matches?.length ?? 0) > 0).length;
    const matchRate = rawWishes.length > 0
      ? Math.round((wishesWithMatch / rawWishes.length) * 1000) / 10
      : 0;

    const wishes = rawWishes.map((w) => {
      const matches = w.matches ?? [];
      const matchesCount = matches.length;
      const topScore = matches.reduce<number | null>((best, m) => {
        if (m.score == null) return best;
        if (best == null || m.score > best) return m.score;
        return best;
      }, null);
      return {
        id: w.id,
        brand: w.brand,
        model: w.model,
        version: w.version,
        yearMin: w.year_min,
        yearMax: w.year_max,
        status: w.status,
        clientName: w.client_name,
        clientPhone: w.client_phone,
        sellerName: w.seller?.name ?? null,
        sellerEmail: w.seller?.email ?? null,
        dealershipName: w.dealership?.name ?? null,
        dealershipCity: w.dealership?.city ?? null,
        dealershipState: w.dealership?.state ?? null,
        matchesCount,
        topScore,
        createdAt: w.created_at,
        expiresAt: w.expires_at,
        updatedAt: w.updated_at,
      };
    });

    return NextResponse.json({
      summary: {
        total,
        byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
        conversionRate,
        matchRate,
        wishesWithMatch,
      },
      wishes,
    });
  } catch (err) {
    console.error("[API] admin/relatorios error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
