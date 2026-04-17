import { NextRequest, NextResponse } from "next/server";
import { supabase, insert } from "@/lib/db";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import type { Wish, Offer } from "@/types";

function toWish(r: Record<string, unknown>): Wish {
  return { id: r.id as string, sellerId: r.seller_id as string, clientName: r.client_name as string, clientPhone: r.client_phone as string, brand: r.brand as string, model: r.model as string, version: r.version as string | undefined, yearMin: r.year_min as number | undefined, yearMax: r.year_max as number | undefined, kmMax: r.km_max as number | undefined, priceMin: r.price_min as number | undefined, priceMax: r.price_max as number | undefined, colors: (r.colors as string[]) ?? [], transmission: r.transmission as Wish["transmission"], fuel: r.fuel as Wish["fuel"], cityRef: r.city_ref as string | undefined, stateRef: r.state_ref as string | undefined, radiusKm: r.radius_km as number, urgency: r.urgency as Wish["urgency"], validityDays: r.validity_days as number, lgpdConsent: r.lgpd_consent as boolean, status: r.status as Wish["status"], createdAt: new Date(r.created_at as string), expiresAt: new Date(r.expires_at as string) };
}
function toOffer(r: Record<string, unknown>): Offer {
  return { id: r.id as string, source: r.source as Offer["source"], sourceId: r.source_id as string, plate: r.plate as string | undefined, brand: r.brand as string, model: r.model as string, version: r.version as string | undefined, year: r.year as number, km: r.km as number, color: r.color as string | undefined, price: r.price as number, city: r.city as string, state: r.state as string, active: r.active as boolean, syncedAt: new Date(r.synced_at as string) };
}

// POST /api/matching/trigger — Run matching for a specific wish or offer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const wishId = body.wishId as string | undefined;
    const offerId = body.offerId as string | undefined;

    let wishes: Wish[] = [];
    let offers: Offer[] = [];

    if (wishId) {
      const { data } = await supabase.from("wishes").select("*").eq("id", wishId).eq("status", "procurando");
      wishes = (data ?? []).map(toWish);
      const { data: allOffers } = await supabase.from("offers").select("*").eq("active", true);
      offers = (allOffers ?? []).map(toOffer);
    } else if (offerId) {
      const { data } = await supabase.from("offers").select("*").eq("id", offerId).eq("active", true);
      offers = (data ?? []).map(toOffer);
      const { data: allWishes } = await supabase.from("wishes").select("*").eq("status", "procurando");
      wishes = (allWishes ?? []).map(toWish);
    } else {
      return NextResponse.json({ error: "wishId or offerId required" }, { status: 400 });
    }

    let newMatches = 0;
    for (const wish of wishes) {
      for (const offer of offers) {
        const result = calculateMatchScore(wish, offer);
        if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

        const { data: existing } = await supabase.from("matches").select("id").eq("wish_id", wish.id).eq("offer_id", offer.id).maybeSingle();
        if (existing) continue;

        const status = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
        const { data: matchRow } = await supabase.from("matches").insert({ wish_id: wish.id, offer_id: offer.id, score: result.score, status }).select("id").single();

        if (matchRow && wish.status === "procurando") {
          await supabase.from("wishes").update({ status: "match_encontrado", updated_at: new Date().toISOString() }).eq("id", wish.id);
        }

        if (matchRow && result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY) {
          await insert("notifications", {
            match_id: matchRow.id,
            recipient_id: wish.sellerId,
            channel: "sistema",
            template: "match_vendedor",
            content: `Match encontrado: ${offer.brand} ${offer.model} ${offer.version ?? ""} ${offer.year} em ${offer.city}/${offer.state}. Score: ${result.score}%`,
            status: "enviado",
            sent_at: new Date().toISOString(),
          });
        }
        newMatches++;
      }
    }

    return NextResponse.json({ newMatches });
  } catch (error) {
    console.error("[API] Matching trigger error:", error);
    return NextResponse.json({ error: "Erro no matching" }, { status: 500 });
  }
}
