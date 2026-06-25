import { supabase } from "@/lib/db";
import type { Offer, OfferImageRef, OfferPhoto } from "@/types";

/**
 * Bucket publico onde as fotos JA TRATADAS (placa coberta/limpa) sao re-hospedadas.
 * As URLs cruas da fonte externa (http) nunca sao servidas diretamente.
 */
export const OFFER_IMAGES_BUCKET = (process.env.STORAGE_BUCKET ?? "offer-images").trim();

/**
 * Centraliza o upsert de uma oferta EXTERNA (avaliador/marketplace) na tabela
 * `offers` e enfileira as fotos pra processamento. Substitui os blocos de upsert
 * duplicados nos varios caminhos de matching, garantindo que nenhum esqueca as
 * imagens. Retorna o id persistido da oferta (para FK em `matches`).
 *
 * NAO use para `estoque_lojista` — essas ofertas ja existem no banco.
 */
export async function upsertExternalOffer(offer: Offer, tenantId?: string): Promise<string> {
  const payload: Record<string, unknown> = {
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
  };
  if (tenantId) payload.tenant_id = tenantId;

  const { data: upserted, error } = await supabase
    .from("offers")
    .upsert(payload, { onConflict: "tenant_id,source,source_id" })
    .select("id")
    .single();
  if (error) throw error;

  const offerId = (upserted?.id as string) ?? offer.id;
  await enqueueOfferImages(offerId, offer.images, tenantId);
  return offerId;
}

/**
 * Enfileira as fotos de uma oferta na tabela `offer_images` (status='pending').
 * Idempotente: o UNIQUE(offer_id, source_url) + ignoreDuplicates faz re-buscas
 * nao re-enfileirarem. No-op se nao houver fotos. Falha aqui nunca deve quebrar
 * o fluxo de matching — apenas logamos.
 */
export async function enqueueOfferImages(
  offerId: string,
  images: OfferImageRef[] | undefined,
  tenantId?: string
): Promise<void> {
  if (!images || images.length === 0) return;

  const rows = images.map((img) => ({
    offer_id: offerId,
    source_url: img.url,
    is_capa: img.capa,
    position: img.position,
    status: "pending",
    // tenant_id e NOT NULL mas tem DEFAULT (tenant compra-certa) na migration;
    // preenchemos quando disponivel.
    ...(tenantId ? { tenant_id: tenantId } : {}),
  }));

  const { error } = await supabase
    .from("offer_images")
    .upsert(rows, { onConflict: "offer_id,source_url", ignoreDuplicates: true });
  if (error) {
    console.error(`[OfferImages] enqueue falhou para offer ${offerId}:`, error.message);
  }
}

/**
 * Retorna as fotos JA TRATADAS (status='done') de varias ofertas, prontas pra
 * exibir: capa primeiro, depois por posicao. So expoe a URL publica https do
 * Storage — nunca source_url nem nada de placa.
 */
export async function getOfferImages(offerIds: string[]): Promise<Map<string, OfferPhoto[]>> {
  const map = new Map<string, OfferPhoto[]>();
  const ids = [...new Set(offerIds)].filter(Boolean);
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("offer_images")
    .select("offer_id, storage_path, is_capa, position")
    .in("offer_id", ids)
    .eq("status", "done")
    .not("storage_path", "is", null)
    .order("is_capa", { ascending: false })
    .order("position", { ascending: true });

  if (error) {
    console.error("[OfferImages] getOfferImages falhou:", error.message);
    return map;
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const path = row.storage_path as string;
    const offerId = row.offer_id as string;
    const { data: pub } = supabase.storage.from(OFFER_IMAGES_BUCKET).getPublicUrl(path);
    if (!pub?.publicUrl) continue;
    const list = map.get(offerId) ?? [];
    list.push({ url: pub.publicUrl, isCapa: row.is_capa === true });
    map.set(offerId, list);
  }
  return map;
}

type OfferRow = Record<string, unknown>;

/**
 * Projecao publica de uma linha de oferta: REMOVE `plate` (placa nunca vai ao
 * frontend) e anexa as fotos tratadas. Use sempre que uma offer for serializada
 * numa resposta de API.
 */
export function toPublicOffer(offerRow: OfferRow, photos: OfferPhoto[] = []): OfferRow {
  const clone: OfferRow = { ...offerRow };
  delete clone.plate;
  clone.images = photos;
  return clone;
}

/**
 * Recebe linhas de `matches` com `offers` aninhada (select "*, offers(*)"),
 * busca as fotos de todas as ofertas de uma vez e devolve as linhas com
 * `offers` saneada (sem placa, com `images`).
 */
export async function attachImagesToMatchRows(rows: OfferRow[]): Promise<OfferRow[]> {
  const offerIds = rows
    .map((r) => (r.offers as OfferRow | undefined)?.id as string | undefined)
    .filter((id): id is string => !!id);
  const imagesByOffer = await getOfferImages(offerIds);
  return rows.map((r) => {
    const offer = r.offers as OfferRow | undefined;
    if (!offer) return r;
    return { ...r, offers: toPublicOffer(offer, imagesByOffer.get(offer.id as string) ?? []) };
  });
}

/** Idem para uma lista de ofertas "cruas" (GET /api/ofertas): sem placa, com fotos. */
export async function serializeOfferRows(rows: OfferRow[]): Promise<OfferRow[]> {
  const offerIds = rows.map((r) => r.id as string).filter(Boolean);
  const imagesByOffer = await getOfferImages(offerIds);
  return rows.map((r) => toPublicOffer(r, imagesByOffer.get(r.id as string) ?? []));
}
