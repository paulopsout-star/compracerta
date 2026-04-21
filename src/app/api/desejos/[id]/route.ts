import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, findById, update, remove, insert } from "@/lib/db";
import { wishSchema } from "@/lib/validators/wish";
import { calculateMatchScore, MATCH_THRESHOLDS } from "@/lib/services/matching";
import { fetchExternalOffersForWish, buildPresentSourceIdsSet } from "@/lib/services/avaliador-api";
import { cleanupStaleMatchesForWish } from "@/lib/services/match-cleanup";
import type { Wish, Offer } from "@/types";

interface ImmediateMatch {
  score: number;
  offer: {
    brand: string; model: string; version?: string; year: number; km: number;
    color?: string; price: number; city: string; state: string; source: string;
    externalStatus?: string;
    syncedAt?: string;
  };
}

// GET /api/desejos/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const wish = await findById("wishes", id);
    return NextResponse.json(wish);
  } catch {
    return NextResponse.json({ error: "Desejo não encontrado" }, { status: 404 });
  }
}

// PATCH /api/desejos/[id]
// - Se body tem { status } apenas: atualização simples (marcar convertido etc.)
// - Se body tem campos do formulário: edição completa + rerun matching
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Simple status/notes update (no matching rerun)
    const simpleUpdate = !body.brand && !body.model;
    if (simpleUpdate) {
      const allowedFields: Record<string, unknown> = {};
      if (body.status) allowedFields.status = body.status;
      if (body.notes !== undefined) allowedFields.notes = body.notes;
      if (body.status === "convertido") allowedFields.converted_at = new Date().toISOString();
      const updated = await update("wishes", id, allowedFields);
      return NextResponse.json({ message: "Desejo atualizado", wish: updated });
    }

    // Full edit — validate with schema
    const parsed = wishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.validityDays);

    const updatedWishRow = (await update("wishes", id, {
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
      expires_at: expiresAt.toISOString(),
      // Reset status so matching can be rerun
      status: "procurando",
    })) as Record<string, unknown>;

    // Clear old matches for this wish — we'll recalculate
    await supabase.from("matches").delete().eq("wish_id", id);

    // Rerun matching
    const wish: Wish = {
      id, sellerId: updatedWishRow.seller_id as string,
      clientName: data.clientName, clientPhone: data.clientPhone,
      brand: data.brand, model: data.model, version: data.version,
      yearMin: data.yearMin, yearMax: data.yearMax, kmMax: data.kmMax,
      priceMin: data.priceMin, priceMax: data.priceMax, colors: data.colors,
      transmission: data.transmission, fuel: data.fuel,
      cityRef: data.cityRef, stateRef: data.stateRef, radiusKm: data.radiusKm,
      urgency: data.urgency, validityDays: data.validityDays,
      lgpdConsent: data.lgpdConsent, status: "procurando",
      createdAt: new Date(), expiresAt,
    };

    const immediateMatches: ImmediateMatch[] = [];
    try {
      const { data: localOffers } = await supabase.from("offers").select("*").eq("active", true);
      const external = await fetchExternalOffersForWish(wish);

      // Cleanup: remove matches antigos que apontam para offers que sumiram da API
      const presentIdsBySource = buildPresentSourceIdsSet(external);
      await cleanupStaleMatchesForWish(id, presentIdsBySource);

      const allOffers: Offer[] = [
        ...((localOffers ?? []).map((r: Record<string, unknown>): Offer => ({
          id: r.id as string, source: r.source as Offer["source"], sourceId: r.source_id as string,
          plate: r.plate as string | undefined, brand: r.brand as string, model: r.model as string,
          version: r.version as string | undefined, year: r.year as number, km: r.km as number,
          color: r.color as string | undefined, price: r.price as number,
          city: r.city as string, state: r.state as string, active: r.active as boolean,
          syncedAt: new Date(r.synced_at as string),
        }))),
        ...external,
      ];

      for (const offer of allOffers) {
        const result = calculateMatchScore(wish, offer);
        if (result.score < MATCH_THRESHOLDS.SUGGESTION) continue;

        immediateMatches.push({
          score: result.score,
          offer: {
            brand: offer.brand, model: offer.model, version: offer.version,
            year: offer.year, km: offer.km, color: offer.color, price: offer.price,
            city: offer.city, state: offer.state, source: offer.source,
            externalStatus: offer.externalStatus,
            syncedAt: offer.syncedAt ? new Date(offer.syncedAt).toISOString() : undefined,
          },
        });

        let offerId = offer.id;
        if (offer.source !== "estoque_lojista") {
          const { data: upserted } = await supabase.from("offers").upsert({
            source: offer.source, source_id: offer.sourceId, plate: offer.plate ?? null,
            brand: offer.brand, model: offer.model, version: offer.version ?? null,
            year: offer.year, km: offer.km, color: offer.color ?? null,
            price: offer.price, city: offer.city, state: offer.state,
            active: true,
            external_status: offer.externalStatus ?? null,
            external_seller_name: offer.externalSellerName ?? null,
            external_dealership_name: offer.externalDealershipName ?? null,
            synced_at: offer.syncedAt ? new Date(offer.syncedAt).toISOString() : new Date().toISOString(),
          }, { onConflict: "source,source_id" }).select("id").single();
          if (upserted) offerId = upserted.id as string;
        }

        const matchStatus = result.score >= MATCH_THRESHOLDS.AUTO_NOTIFY ? "notificado" : "novo";
        await supabase.from("matches").upsert(
          { wish_id: id, offer_id: offerId, score: result.score, status: matchStatus },
          { onConflict: "wish_id,offer_id" }
        );
      }

      immediateMatches.sort((a, b) => b.score - a.score);

      if (immediateMatches.length > 0) {
        await supabase.from("wishes").update({ status: "match_encontrado", updated_at: new Date().toISOString() }).eq("id", id);
      }
    } catch (matchError) {
      console.error("[API] Rematch error on edit (wish still updated):", matchError);
    }

    return NextResponse.json({
      message: "Desejo atualizado",
      wish: updatedWishRow,
      immediateMatches: immediateMatches.slice(0, 10),
      matchesFound: immediateMatches.length,
    });
  } catch (error) {
    console.error("[API] Error updating wish:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE /api/desejos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    // Cascata manual (Supabase sem ON DELETE CASCADE configurado):
    //   notifications → match_id → matches → wish_id → wishes
    // Sem esta ordem, o delete em matches viola FK de notifications.
    const { data: matchRows, error: matchListErr } = await supabase
      .from("matches")
      .select("id")
      .eq("wish_id", id);
    if (matchListErr) throw matchListErr;
    const matchIdList = (matchRows ?? []).map((m) => m.id as string);

    if (matchIdList.length > 0) {
      const { error: notifErr } = await supabase.from("notifications").delete().in("match_id", matchIdList);
      if (notifErr) throw notifErr;
    }

    const { error: matchErr } = await supabase.from("matches").delete().eq("wish_id", id);
    if (matchErr) throw matchErr;

    // match_groups depende do schema novo; delete é no-op se tabela vazia
    await supabase.from("match_groups").delete().eq("wish_id", id);

    await remove("wishes", id);
    return NextResponse.json({ message: "Desejo removido" });
  } catch (error) {
    console.error("[API] Error deleting wish:", error);
    const msg = error instanceof Error ? error.message : "Erro ao remover";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
