import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, insert } from "@/lib/db";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import type { Wish, Offer } from "@/types";

function dbWishToType(row: Record<string, unknown>): Wish {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    clientName: row.client_name as string,
    clientPhone: row.client_phone as string,
    brand: row.brand as string,
    model: row.model as string,
    version: row.version as string | undefined,
    yearMin: row.year_min as number | undefined,
    yearMax: row.year_max as number | undefined,
    kmMax: row.km_max as number | undefined,
    priceMin: row.price_min as number | undefined,
    priceMax: row.price_max as number | undefined,
    colors: (row.colors as string[]) ?? [],
    transmission: row.transmission as Wish["transmission"],
    fuel: row.fuel as Wish["fuel"],
    cityRef: row.city_ref as string | undefined,
    stateRef: row.state_ref as string | undefined,
    radiusKm: row.radius_km as number,
    urgency: row.urgency as Wish["urgency"],
    validityDays: row.validity_days as number,
    lgpdConsent: row.lgpd_consent as boolean,
    status: row.status as Wish["status"],
    createdAt: new Date(row.created_at as string),
    expiresAt: new Date(row.expires_at as string),
  };
}

function dbOfferToType(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    source: row.source as Offer["source"],
    sourceId: row.source_id as string,
    plate: row.plate as string | undefined,
    brand: row.brand as string,
    model: row.model as string,
    version: row.version as string | undefined,
    year: row.year as number,
    km: row.km as number,
    color: row.color as string | undefined,
    price: row.price as number,
    city: row.city as string,
    state: row.state as string,
    active: row.active as boolean,
    syncedAt: new Date(row.synced_at as string),
  };
}

// POST /api/matching — Run matching engine
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const wishId = body.wishId as string | undefined;

    // Fetch active wishes
    let wishQuery = supabase.from("wishes").select("*").eq("status", "procurando");
    if (wishId) wishQuery = wishQuery.eq("id", wishId);
    const { data: wishRows, error: wErr } = await wishQuery;
    if (wErr) throw wErr;

    // Fetch active offers
    const { data: offerRows, error: oErr } = await supabase
      .from("offers")
      .select("*")
      .eq("active", true);
    if (oErr) throw oErr;

    const wishes = (wishRows ?? []).map(dbWishToType);
    const offers = (offerRows ?? []).map(dbOfferToType);

    let newMatches = 0;
    let notifications = 0;

    for (const wish of wishes) {
      for (const offer of offers) {
        const result = calculateMatchScore(wish, offer);
        if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

        // Check if match already exists
        const { data: existing } = await supabase
          .from("matches")
          .select("id")
          .eq("wish_id", wish.id)
          .eq("offer_id", offer.id)
          .maybeSingle();

        if (existing) continue;

        // Create match
        const status = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
        await insert("matches", {
          wish_id: wish.id,
          offer_id: offer.id,
          score: result.score,
          status,
        });
        newMatches++;

        // Update wish status if first match
        if (wish.status === "procurando") {
          await supabase
            .from("wishes")
            .update({ status: "match_encontrado", updated_at: new Date().toISOString() })
            .eq("id", wish.id);
        }

        // Create notification for auto-notify matches
        if (result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY) {
          const { data: matchRow } = await supabase
            .from("matches")
            .select("id")
            .eq("wish_id", wish.id)
            .eq("offer_id", offer.id)
            .single();

          if (matchRow) {
            await insert("notifications", {
              match_id: matchRow.id,
              recipient_id: wish.sellerId,
              channel: "sistema",
              template: "match_vendedor",
              content: `Match encontrado: ${offer.brand} ${offer.model} ${offer.version ?? ""} ${offer.year} em ${offer.city}/${offer.state}. Score: ${result.score}%`,
              status: "enviado",
              sent_at: new Date().toISOString(),
            });
            notifications++;
          }
        }
      }
    }

    return NextResponse.json({
      message: `Matching concluído: ${newMatches} novos matches, ${notifications} notificações`,
      newMatches,
      notifications,
      wishesProcessed: wishes.length,
      offersProcessed: offers.length,
    });
  } catch (error) {
    console.error("[API] Matching error:", error);
    return NextResponse.json({ error: "Erro no motor de matching" }, { status: 500 });
  }
}

// GET /api/matching — Get matches for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const wishId = searchParams.get("wishId");
    const status = searchParams.get("status");

    let query = supabase
      .from("matches")
      .select("*, wishes!inner(*), offers!inner(*)")
      .order("score", { ascending: false });

    if (wishId) query = query.eq("wish_id", wishId);
    if (status) query = query.eq("status", status);

    // Role-based filtering
    const role = (session.user as Record<string, unknown>).role as string;
    if (role === "vendedor") {
      query = query.eq("wishes.seller_id", session.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[API] Error fetching matches:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
