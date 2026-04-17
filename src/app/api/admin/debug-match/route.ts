import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAvaliadorOffersForWish } from "@/lib/services/avaliador-api";
import { calculateMatchScore } from "@/lib/services/matching";
import type { Wish, Offer } from "@/types";

/**
 * Admin-only debug endpoint — test matching flow for a hypothetical wish
 * without creating anything in the DB.
 *
 * Usage: POST /api/admin/debug-match with body:
 *   { "brand": "Honda", "model": "Fit", "yearMin": 2015, "yearMax": 2015,
 *     "kmMax": 60000, "cityRef": "Belo Horizonte", "stateRef": "MG" }
 */

async function runDebug(body: Record<string, unknown>) {
  const envEnabled = process.env.AVALIADOR_API_ENABLED;
  const envUrl = process.env.AVALIADOR_API_URL;

  const wish: Wish = {
    id: "debug-wish",
    sellerId: "debug-seller",
    clientName: "Debug",
    clientPhone: "(00) 00000-0000",
    brand: (body.brand as string) ?? "Honda",
    model: (body.model as string) ?? "Fit",
    yearMin: body.yearMin as number | undefined,
    yearMax: body.yearMax as number | undefined,
    kmMax: body.kmMax as number | undefined,
    priceMin: body.priceMin as number | undefined,
    priceMax: body.priceMax as number | undefined,
    colors: (body.colors as string[]) ?? [],
    transmission: "indiferente",
    fuel: "indiferente",
    cityRef: body.cityRef as string | undefined,
    stateRef: body.stateRef as string | undefined,
    radiusKm: 100,
    urgency: "media",
    validityDays: 30,
    lgpdConsent: true,
    status: "procurando",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  const startTime = Date.now();
  let externalOffers: Offer[] = [];
  let fetchError: string | null = null;
  try {
    externalOffers = await fetchAvaliadorOffersForWish(wish);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }
  const fetchTime = Date.now() - startTime;

  const scored = externalOffers.map((offer) => {
    const result = calculateMatchScore(wish, offer);
    return {
      offer: {
        brand: offer.brand,
        model: offer.model,
        year: offer.year,
        km: offer.km,
        color: offer.color,
        price: offer.price,
        city: offer.city,
        state: offer.state,
      },
      score: result.score,
      breakdown: result.breakdown,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    env: {
      AVALIADOR_API_ENABLED_raw: JSON.stringify(envEnabled),
      AVALIADOR_API_ENABLED_trimmed: envEnabled?.trim() === "true",
      AVALIADOR_API_URL: envUrl?.trim() ?? "(default)",
    },
    wish: { brand: wish.brand, model: wish.model, yearMin: wish.yearMin, yearMax: wish.yearMax, kmMax: wish.kmMax, cityRef: wish.cityRef, stateRef: wish.stateRef },
    serviceCall: { fetchTimeMs: fetchTime, fetchError, externalOffersCount: externalOffers.length },
    scoredMatches: scored,
    summary: {
      above80: scored.filter((s) => s.score >= 80).length,
      above70: scored.filter((s) => s.score >= 70).length,
      above50: scored.filter((s) => s.score >= 50).length,
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const result = await runDebug(body);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const body: Record<string, unknown> = {
    brand: sp.get("brand") ?? "Honda",
    model: sp.get("model") ?? "Fit",
    yearMin: sp.get("yearMin") ? parseInt(sp.get("yearMin")!) : undefined,
    yearMax: sp.get("yearMax") ? parseInt(sp.get("yearMax")!) : undefined,
    kmMax: sp.get("kmMax") ? parseInt(sp.get("kmMax")!) : undefined,
    cityRef: sp.get("cityRef") ?? undefined,
    stateRef: sp.get("stateRef") ?? undefined,
  };
  const result = await runDebug(body);
  return NextResponse.json(result);
}
