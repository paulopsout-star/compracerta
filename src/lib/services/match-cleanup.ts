import { supabase } from "@/lib/db";

/**
 * Remove matches orfaos de um wish: matches cujas offers externas
 * (source=avaliador) nao aparecem mais na resposta atual da API.
 *
 * Tambem marca as offers orfaos como inactive.
 *
 * @param wishId id do desejo sendo rematchado
 * @param presentSourceIdsBySource map source → Set<source_id> presentes na API agora
 * @returns numero de matches removidos
 */
export async function cleanupStaleMatchesForWish(
  wishId: string,
  presentSourceIdsBySource: Map<string, Set<string>>
): Promise<number> {
  // Buscar matches ativos do wish que apontam para offers de fontes externas
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id, offer_id, offers!inner(id, source, source_id)")
    .eq("wish_id", wishId);

  if (!existingMatches) return 0;

  const toRemoveMatchIds: string[] = [];
  const toDeactivateOfferIds: string[] = [];

  for (const m of existingMatches) {
    const offer = m.offers as unknown as { id: string; source: string; source_id: string } | null;
    if (!offer) continue;
    // Lojistas nao vem da API externa — skip
    if (offer.source === "estoque_lojista") continue;

    const presentSet = presentSourceIdsBySource.get(offer.source);
    const stillPresent = presentSet?.has(offer.source_id) ?? false;

    if (!stillPresent) {
      toRemoveMatchIds.push(m.id as string);
      toDeactivateOfferIds.push(offer.id);
    }
  }

  if (toRemoveMatchIds.length === 0) return 0;

  // Remover matches
  await supabase.from("matches").delete().in("id", toRemoveMatchIds);

  // Desativar offers (se nao tem mais match ativo em lugar nenhum)
  // Verificar primeiro quais offers ainda tem outros matches
  const { data: stillLinked } = await supabase
    .from("matches")
    .select("offer_id")
    .in("offer_id", toDeactivateOfferIds);
  const linkedSet = new Set((stillLinked ?? []).map((r) => r.offer_id as string));
  const trulyOrphanedOffers = toDeactivateOfferIds.filter((id) => !linkedSet.has(id));

  if (trulyOrphanedOffers.length > 0) {
    await supabase.from("offers").update({ active: false }).in("id", trulyOrphanedOffers);
  }

  return toRemoveMatchIds.length;
}
