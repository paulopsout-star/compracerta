import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, insert } from "@/lib/db";
import { wishSchema } from "@/lib/validators/wish";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import { fetchExternalOffersForWish } from "@/lib/services/avaliador-api";
import type { Wish, Offer } from "@/types";

interface ImmediateMatch {
  score: number;
  offer: {
    brand: string;
    model: string;
    version?: string;
    year: number;
    km: number;
    color?: string;
    price: number;
    city: string;
    state: string;
    source: string;
    externalStatus?: string;
    syncedAt?: string;
  };
}

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

    const wishRow = (await insert("wishes", {
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
    })) as Record<string, unknown>;

    // Run immediate matching — so the user sees results instantly
    const wish: Wish = {
      id: wishRow.id as string,
      sellerId: wishRow.seller_id as string,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      brand: data.brand,
      model: data.model,
      version: data.version,
      yearMin: data.yearMin,
      yearMax: data.yearMax,
      kmMax: data.kmMax,
      priceMin: data.priceMin,
      priceMax: data.priceMax,
      colors: data.colors,
      transmission: data.transmission,
      fuel: data.fuel,
      cityRef: data.cityRef,
      stateRef: data.stateRef,
      radiusKm: data.radiusKm,
      urgency: data.urgency,
      validityDays: data.validityDays,
      lgpdConsent: data.lgpdConsent,
      status: "procurando",
      createdAt: new Date(),
      expiresAt,
    };

    const immediateMatches: ImmediateMatch[] = [];
    try {
      console.log(`[Desejo] Novo desejo ${wish.id}: ${wish.brand} ${wish.model}, UF=${wish.stateRef}, cidade=${wish.cityRef}, kmMax=${wish.kmMax}`);

      // Fetch local offers (lojistas) + external (Avaliador Digital)
      const { data: localOffers } = await supabase.from("offers").select("*").eq("active", true);
      const external = await fetchExternalOffersForWish(wish);

      console.log(`[Desejo] Ofertas: ${(localOffers ?? []).length} locais + ${external.length} externas = ${(localOffers ?? []).length + external.length} total`);

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

      // Score every offer, keep only relevant matches
      for (const offer of allOffers) {
        const result = calculateMatchScore(wish, offer);
        if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

        immediateMatches.push({
          score: result.score,
          offer: {
            brand: offer.brand,
            model: offer.model,
            version: offer.version,
            year: offer.year,
            km: offer.km,
            color: offer.color,
            price: offer.price,
            city: offer.city,
            state: offer.state,
            source: offer.source,
            externalStatus: offer.externalStatus,
            syncedAt: offer.syncedAt ? new Date(offer.syncedAt).toISOString() : undefined,
          },
        });

        // Persist external offers and create match records (FK integrity)
        let offerId = offer.id;
        if (offer.source !== "estoque_lojista") {
          const { data: upserted } = await supabase
            .from("offers")
            .upsert(
              {
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
                external_status: offer.externalStatus ?? null,
                synced_at: offer.syncedAt ? new Date(offer.syncedAt).toISOString() : new Date().toISOString(),
              },
              { onConflict: "source,source_id" }
            )
            .select("id")
            .single();
          if (upserted) offerId = upserted.id as string;
        }

        const matchStatus = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
        await supabase.from("matches").upsert(
          { wish_id: wish.id, offer_id: offerId, score: result.score, status: matchStatus },
          { onConflict: "wish_id,offer_id" }
        );
      }

      // Sort by score descending
      immediateMatches.sort((a, b) => b.score - a.score);

      // If we found any match, update wish status
      if (immediateMatches.length > 0) {
        await supabase
          .from("wishes")
          .update({ status: "match_encontrado", updated_at: new Date().toISOString() })
          .eq("id", wish.id);
      }
    } catch (matchError) {
      console.error("[API] Immediate match error (wish still saved):", matchError);
    }

    return NextResponse.json(
      {
        message: "Desejo cadastrado com sucesso",
        wish: wishRow,
        immediateMatches: immediateMatches.slice(0, 10),
        matchesFound: immediateMatches.length,
      },
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
