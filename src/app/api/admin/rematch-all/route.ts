import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import { fetchExternalOffersForWish } from "@/lib/services/avaliador-api";
import type { Wish, Offer } from "@/types";

/**
 * ONE-OFF admin utility — re-executes matching for ALL active wishes.
 * Useful after matching rules change (e.g. including "Comprado" status).
 *
 * Security: requires X-Rematch-Secret header matching env var (or public
 * in absence of env var for one-time ops). Rate-limited to 1 call/5min.
 */

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-rematch-secret");
  const expectedSecret = process.env.REMATCH_SECRET?.trim();

  // If REMATCH_SECRET is set, require it. Otherwise allow (one-off).
  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load active wishes
  const { data: wishRows, error } = await supabase
    .from("wishes")
    .select("*")
    .in("status", ["procurando", "match_encontrado"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wishes: Wish[] = (wishRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    sellerId: r.seller_id as string,
    clientName: r.client_name as string,
    clientPhone: r.client_phone as string,
    brand: r.brand as string,
    model: r.model as string,
    version: r.version as string | undefined,
    yearMin: r.year_min as number | undefined,
    yearMax: r.year_max as number | undefined,
    kmMax: r.km_max as number | undefined,
    priceMin: r.price_min as number | undefined,
    priceMax: r.price_max as number | undefined,
    colors: (r.colors as string[]) ?? [],
    transmission: r.transmission as Wish["transmission"],
    fuel: r.fuel as Wish["fuel"],
    cityRef: r.city_ref as string | undefined,
    stateRef: r.state_ref as string | undefined,
    radiusKm: r.radius_km as number,
    urgency: r.urgency as Wish["urgency"],
    validityDays: r.validity_days as number,
    lgpdConsent: r.lgpd_consent as boolean,
    status: r.status as Wish["status"],
    createdAt: new Date(r.created_at as string),
    expiresAt: new Date(r.expires_at as string),
  }));

  const report: { wishId: string; brand: string; model: string; matches: number }[] = [];

  for (const wish of wishes) {
    try {
      const external = await fetchExternalOffersForWish(wish);
      const { data: localOffers } = await supabase.from("offers").select("*").eq("active", true);

      const allOffers: Offer[] = [
        ...((localOffers ?? []).map((r: Record<string, unknown>): Offer => ({
          id: r.id as string,
          source: r.source as Offer["source"],
          sourceId: r.source_id as string,
          plate: r.plate as string | undefined,
          brand: r.brand as string,
          model: r.model as string,
          version: r.version as string | undefined,
          year: r.year as number,
          km: r.km as number,
          color: r.color as string | undefined,
          price: r.price as number,
          city: r.city as string,
          state: r.state as string,
          active: r.active as boolean,
          syncedAt: new Date(r.synced_at as string),
        }))),
        ...external,
      ];

      let matchCount = 0;
      for (const offer of allOffers) {
        const result = calculateMatchScore(wish, offer);
        if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

        let offerId = offer.id;
        if (offer.source !== "estoque_lojista") {
          const { data: upserted } = await supabase.from("offers").upsert({
            source: offer.source,
            source_id: offer.sourceId,
            plate: offer.plate ?? null,
            brand: offer.brand,
            model: offer.model,
            version: offer.version ?? null,
            year: offer.year,
            km: offer.km,
            color: offer.color ?? null,
            price: offer.price,
            city: offer.city,
            state: offer.state,
            active: true,
            synced_at: new Date(offer.syncedAt).toISOString(),
          }, { onConflict: "source,source_id" }).select("id").single();
          if (upserted) offerId = upserted.id as string;
        }

        const matchStatus = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
        await supabase.from("matches").upsert(
          { wish_id: wish.id, offer_id: offerId, score: result.score, status: matchStatus },
          { onConflict: "wish_id,offer_id" }
        );
        matchCount++;
      }

      if (matchCount > 0) {
        await supabase.from("wishes").update({ status: "match_encontrado", updated_at: new Date().toISOString() }).eq("id", wish.id);
      }

      report.push({ wishId: wish.id, brand: wish.brand, model: wish.model, matches: matchCount });
    } catch (e) {
      console.error(`[rematch-all] Failed for wish ${wish.id}:`, e);
      report.push({ wishId: wish.id, brand: wish.brand, model: wish.model, matches: -1 });
    }
  }

  return NextResponse.json({
    processed: report.length,
    totalMatches: report.reduce((a, b) => a + Math.max(0, b.matches), 0),
    report,
  });
}
