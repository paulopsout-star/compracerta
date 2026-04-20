import type { Offer, Wish } from "@/types";

/**
 * Cliente da API pública do Avaliador Digital.
 *
 * Endpoint: GET {BASE_URL}/API/V1/Get/ConsultaPublica
 * Query params: modelo (obrigatório), km_inicial (obrigatório), km_final (obrigatório),
 *               cidade (opcional), uf (opcional)
 *
 * Não requer autenticação (API pública).
 */

const DEFAULT_BASE_URL = "https://hmlv2api.avaliadordigital.com.br";

interface AvaliadorVehicle {
  marca: string;
  modelo: string;
  km: string;
  cor: string | null;
  ano_fabricacao: string;
  ano_modelo: string;
  valor_fipe?: number;
  valor_desejado?: number;
  status: string;
  data_atualizacao: string;
  cidade: string;
  uf: string;
  vendedor?: string | null;
  concessionaria?: string | null;
}

interface AvaliadorResponse {
  success: boolean;
  message: string;
  data: AvaliadorVehicle[];
}

/** In-memory cache — 5 minute TTL */
interface CacheEntry { data: Offer[]; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(params: Record<string, string | number | undefined>): string {
  return JSON.stringify(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .sort()
  );
}

function vehicleToOffer(v: AvaliadorVehicle, _index: number): Offer {
  // API doesn't return id — synthesize a stable id from core fields.
  // IMPORTANT: do NOT include array index — it changes between queries
  // and causes the same vehicle to be duplicated in our DB.
  const syntheticId = `${v.marca}-${v.modelo}-${v.km}-${v.ano_modelo}-${v.cidade}-${v.uf}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  // Price: prefer FIPE value (avoids 0), fallback to valor_desejado, then 0
  const price = v.valor_fipe && v.valor_fipe > 0
    ? v.valor_fipe
    : v.valor_desejado && v.valor_desejado > 0
    ? v.valor_desejado
    : 0;

  return {
    id: `av-${syntheticId}`,
    source: "avaliador",
    sourceId: syntheticId,
    brand: v.marca.trim(),
    model: v.modelo.trim(),
    year: parseInt(v.ano_modelo) || parseInt(v.ano_fabricacao) || 0,
    km: parseInt(v.km) || 0,
    color: v.cor?.trim() || undefined,
    price,
    city: v.cidade.trim(),
    state: v.uf.trim().toUpperCase(),
    active: true,
    syncedAt: new Date(v.data_atualizacao),
    externalStatus: v.status,
    externalSellerName: v.vendedor?.trim() || undefined,
    externalDealershipName: v.concessionaria?.trim() || undefined,
  };
}

/** Fetch vehicles from Avaliador API matching a single model query */
async function fetchAvaliadorRaw(params: {
  modelo: string;
  km_inicial: number;
  km_final: number;
  cidade?: string;
  uf?: string;
}): Promise<Offer[]> {
  if (process.env.AVALIADOR_API_ENABLED?.trim() !== "true") {
    console.log("[Avaliador API] Skipped — AVALIADOR_API_ENABLED not 'true'");
    return [];
  }

  const baseUrl = (process.env.AVALIADOR_API_URL?.trim()) || DEFAULT_BASE_URL;
  const key = cacheKey(params);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[Avaliador API] Cache hit for ${params.modelo} (${cached.data.length} offers)`);
    return cached.data;
  }

  const url = new URL(`${baseUrl}/API/V1/Get/ConsultaPublica`);
  url.searchParams.set("modelo", params.modelo);
  url.searchParams.set("km_inicial", String(params.km_inicial));
  url.searchParams.set("km_final", String(params.km_final));
  if (params.cidade) url.searchParams.set("cidade", params.cidade);
  if (params.uf) url.searchParams.set("uf", params.uf);

  console.log(`[Avaliador API] GET ${url.toString()}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeout);

    console.log(`[Avaliador API] Status ${res.status}`);
    if (!res.ok) {
      console.error(`[Avaliador API] HTTP ${res.status}`);
      return [];
    }

    const body = (await res.json()) as AvaliadorResponse;
    console.log(`[Avaliador API] Response: success=${body.success}, qtd=${body.data?.length ?? 0}`);

    if (!body.success || !Array.isArray(body.data)) return [];

    const offers = body.data
      .filter((v) => ["Publicado", "Avaliado", "Pendente", "Comprado"].includes(v.status))
      .map(vehicleToOffer);

    console.log(`[Avaliador API] ${offers.length} active offers after filter`);
    cache.set(key, { data: offers, expiresAt: Date.now() + CACHE_TTL_MS });
    return offers;
  } catch (error) {
    console.error("[Avaliador API] Fetch failed:", error);
    return [];
  }
}

/**
 * Fetch vehicles from Avaliador matching a wish's criteria.
 * The API requires a model string — we use the wish model as query.
 */
export async function fetchAvaliadorOffersForWish(wish: Wish): Promise<Offer[]> {
  return fetchAvaliadorRaw({
    modelo: wish.model,
    km_inicial: 0,
    km_final: wish.kmMax ?? 500000,
    cidade: wish.cityRef,
    uf: wish.stateRef,
  });
}

/**
 * Fetch offers from all external sources for a given wish.
 * Adds more sources here later (Canal do Repasse marketplace, etc.)
 */
export async function fetchExternalOffersForWish(wish: Wish): Promise<Offer[]> {
  const results = await Promise.allSettled([
    fetchAvaliadorOffersForWish(wish),
    // future: fetchCanalRepasseOffersForWish(wish),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<Offer[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

/**
 * Retorna um Set com todos os source_ids externos (por source) que
 * estao presentes na lista de offers retornadas.
 * Usado para detectar matches orfaos (que apontam para offers que
 * sumiram da API externa).
 */
export function buildPresentSourceIdsSet(offers: Offer[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const o of offers) {
    if (!map.has(o.source)) map.set(o.source, new Set());
    map.get(o.source)!.add(o.sourceId);
  }
  return map;
}

/** Health check for integrations page */
export async function checkAvaliadorHealth(): Promise<{
  status: "online" | "desabilitado" | "erro";
  latency: number | null;
  message: string | null;
}> {
  if (process.env.AVALIADOR_API_ENABLED?.trim() !== "true") {
    return { status: "desabilitado", latency: null, message: "AVALIADOR_API_ENABLED não está ligado" };
  }

  const baseUrl = (process.env.AVALIADOR_API_URL?.trim()) || DEFAULT_BASE_URL;
  const start = Date.now();

  try {
    const url = new URL(`${baseUrl}/API/V1/Get/ConsultaPublica`);
    url.searchParams.set("modelo", "civic");
    url.searchParams.set("km_inicial", "0");
    url.searchParams.set("km_final", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { status: "erro", latency: null, message: `HTTP ${res.status}` };
    return { status: "online", latency: Date.now() - start, message: null };
  } catch (error) {
    return { status: "erro", latency: null, message: error instanceof Error ? error.message : "Falha" };
  }
}
