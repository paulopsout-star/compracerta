/**
 * Executa o pipeline de matching para um desejo: busca ofertas (locais +
 * Avaliador Digital), pontua, upserta ofertas externas, cria/atualiza
 * matches, e retorna a lista ordenada. Espelha a lógica inline do POST
 * /api/desejos/route.ts para ser reaproveitado pelo orquestrador WhatsApp.
 */

import { supabase } from "@/lib/db";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import { fetchExternalOffersForWish, buildPresentSourceIdsSet } from "@/lib/services/avaliador-api";
import { cleanupStaleMatchesForWish } from "@/lib/services/match-cleanup";
import type { Wish, Offer } from "@/types";

export interface MatchSummary {
  /** id da linha em `matches` (após upsert) — usado para auditoria em notifications */
  matchId: string;
  score: number;
  offer: Offer;
  /** true quando não existia linha em matches para (wish, offer) antes deste run */
  isNew: boolean;
  /** true quando a oferta é em uma cidade diferente da pedida no desejo */
  outOfCity: boolean;
}

interface DbWishRow {
  id: string;
  seller_id: string;
  client_name: string;
  client_phone: string;
  brand: string;
  model: string;
  version: string | null;
  year_min: number | null;
  year_max: number | null;
  km_max: number | null;
  price_min: number | null;
  price_max: number | null;
  colors: string[] | null;
  transmission: string;
  fuel: string;
  city_ref: string | null;
  state_ref: string | null;
  radius_km: number;
  urgency: string;
  validity_days: number;
  lgpd_consent: boolean;
  status: string;
  created_at: string;
  expires_at: string;
}

function rowToWish(r: DbWishRow): Wish {
  return {
    id: r.id,
    sellerId: r.seller_id,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    brand: r.brand,
    model: r.model,
    version: r.version ?? undefined,
    yearMin: r.year_min ?? undefined,
    yearMax: r.year_max ?? undefined,
    kmMax: r.km_max ?? undefined,
    priceMin: r.price_min ?? undefined,
    priceMax: r.price_max ?? undefined,
    colors: r.colors ?? [],
    transmission: r.transmission as Wish["transmission"],
    fuel: r.fuel as Wish["fuel"],
    cityRef: r.city_ref ?? undefined,
    stateRef: r.state_ref ?? undefined,
    radiusKm: r.radius_km,
    urgency: r.urgency as Wish["urgency"],
    validityDays: r.validity_days,
    lgpdConsent: r.lgpd_consent,
    status: r.status as Wish["status"],
    createdAt: new Date(r.created_at),
    expiresAt: new Date(r.expires_at),
  };
}

/**
 * Busca + scoring + persistência de matches. Retorna top matches ordenados
 * por score desc (≥ SUGGESTION threshold), ou [] se nada qualificar.
 */
export async function runMatchingForWish(wishId: string): Promise<MatchSummary[]> {
  const { data: wishRow, error: wishErr } = await supabase
    .from("wishes")
    .select("*")
    .eq("id", wishId)
    .single();
  if (wishErr || !wishRow) {
    console.warn("[match-runner] wish não encontrado:", wishId, wishErr?.message);
    return [];
  }
  const wish = rowToWish(wishRow as DbWishRow);

  // Ofertas locais + externas
  const [localRes, external] = await Promise.all([
    supabase.from("offers").select("*").eq("active", true),
    fetchExternalOffersForWish(wish).catch((err) => {
      console.warn("[match-runner] fetchExternalOffers falhou:", err instanceof Error ? err.message : err);
      return [] as Offer[];
    }),
  ]);

  const localOffers: Offer[] = (localRes.data ?? []).map((r: Record<string, unknown>): Offer => ({
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
    syncedAt: r.synced_at ? new Date(r.synced_at as string) : new Date(),
  }));

  // Cleanup de matches órfãos (ofertas que sumiram do Avaliador)
  try {
    const presentIds = buildPresentSourceIdsSet(external);
    await cleanupStaleMatchesForWish(wish.id, presentIds);
  } catch (err) {
    console.warn("[match-runner] cleanup falhou:", err instanceof Error ? err.message : err);
  }

  // Snapshot dos matches que já existem para este desejo — usado para marcar
  // isNew (permite ao caller notificar apenas matches recém-descobertos).
  const { data: existingRows } = await supabase
    .from("matches")
    .select("offer_id")
    .eq("wish_id", wish.id);
  const existingOfferIds = new Set((existingRows ?? []).map((r) => r.offer_id as string));

  const all: Offer[] = [...localOffers, ...external];
  const matches: MatchSummary[] = [];

  for (const offer of all) {
    const result = calculateMatchScore(wish, offer);
    if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

    // Persiste oferta externa (upsert) para ter FK válida no match
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
            external_seller_name: offer.externalSellerName ?? null,
            external_dealership_name: offer.externalDealershipName ?? null,
            synced_at: offer.syncedAt ? new Date(offer.syncedAt).toISOString() : new Date().toISOString(),
          },
          { onConflict: "source,source_id" }
        )
        .select("id")
        .single();
      if (upserted) offerId = upserted.id as string;
    }

    const matchStatus = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
    const { data: matchRow } = await supabase
      .from("matches")
      .upsert(
        { wish_id: wish.id, offer_id: offerId, score: result.score, status: matchStatus },
        { onConflict: "wish_id,offer_id" }
      )
      .select("id")
      .single();

    const outOfCity = !!wish.cityRef
      && offer.city.trim().toLowerCase() !== wish.cityRef.trim().toLowerCase();

    matches.push({
      matchId: (matchRow?.id as string) ?? "",
      score: result.score,
      offer: { ...offer, id: offerId },
      isNew: !existingOfferIds.has(offerId),
      outOfCity,
    });
  }

  // Ordena: in-city primeiro (por score desc), depois out-of-city (por score desc).
  // Se o desejo não tem cidade definida, comportamento recai só em score.
  matches.sort((a, b) => {
    if (a.outOfCity !== b.outOfCity) return a.outOfCity ? 1 : -1;
    return b.score - a.score;
  });

  if (matches.length > 0) {
    await supabase
      .from("wishes")
      .update({ status: "match_encontrado", updated_at: new Date().toISOString() })
      .eq("id", wish.id);
  }

  return matches;
}
