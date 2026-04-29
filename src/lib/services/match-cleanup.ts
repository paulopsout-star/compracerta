import { supabase } from "@/lib/db";

/**
 * Marca offers orfaos de um wish como inactive: offers (source=avaliador)
 * que nao aparecem mais na resposta atual da API.
 *
 * NAO deleta linhas de `matches`. Manter o match preserva a chave de
 * idempotencia da notificacao (notifications.match_id). Se deletassemos,
 * uma oferta que some e volta seria recriada com novo match_id e o
 * vendedor seria notificado de novo do mesmo veiculo.
 *
 * @param wishId id do desejo sendo rematchado
 * @param presentSourceIdsBySource map source → Set<source_id> presentes na API agora
 * @returns numero de offers desativadas
 */
export async function cleanupStaleMatchesForWish(
  wishId: string,
  presentSourceIdsBySource: Map<string, Set<string>>
): Promise<number> {
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id, offer_id, offers!inner(id, source, source_id)")
    .eq("wish_id", wishId);

  if (!existingMatches) return 0;

  const staleOfferIds: string[] = [];

  for (const m of existingMatches) {
    const offer = m.offers as unknown as { id: string; source: string; source_id: string } | null;
    if (!offer) continue;
    if (offer.source === "estoque_lojista") continue;

    const presentSet = presentSourceIdsBySource.get(offer.source);
    const stillPresent = presentSet?.has(offer.source_id) ?? false;

    if (!stillPresent) staleOfferIds.push(offer.id);
  }

  if (staleOfferIds.length === 0) return 0;

  await supabase.from("offers").update({ active: false }).in("id", staleOfferIds);
  return staleOfferIds.length;
}
