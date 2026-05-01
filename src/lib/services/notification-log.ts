/**
 * Registro auditável de notificações enviadas. Fonte da verdade para
 * "este match já foi notificado via WhatsApp?" — evita spam mesmo em
 * cenários de reprocessamento ou inconsistência em outras tabelas.
 *
 * Tabela: notifications (id, matchId, recipientId, channel, template,
 * content, status, sentAt, readAt, respondedAt, createdAt).
 */

import { supabase } from "@/lib/db";

export type NotificationChannel = "whatsapp" | "email" | "sistema";

export interface ClaimSlotInput {
  tenantId: string;
  wishId: string;
  offerSource: string;
  offerSourceId: string;
  recipientId: string;
  channel?: NotificationChannel;
  matchId?: string | null;
}

/**
 * Reserva atomicamente o "slot" de notificacao desta oferta para este desejo.
 * Tabela: notification_dedup, chaveada por (wish_id, offer_source, offer_source_id, channel).
 *
 * Padrao claim-then-send:
 *   - Se inseriu (claimed=true): caller envia o WhatsApp.
 *   - Se conflito (claimed=false, reason='duplicate'): outro run ja notificou.
 *   - Se erro de DB (claimed=false, reason='db_error:...'): fail-closed.
 *
 * Idempotencia sobrevive a deletion+recreation de matches/offers, porque a
 * chave eh a identidade externa estavel (source + source_id) da oferta.
 */
export async function claimNotificationSlot(
  input: ClaimSlotInput
): Promise<{ claimed: boolean; reason?: string }> {
  const channel = input.channel ?? "whatsapp";
  const { data, error } = await supabase
    .from("notification_dedup")
    .upsert(
      {
        tenant_id: input.tenantId,
        wish_id: input.wishId,
        offer_source: input.offerSource,
        offer_source_id: input.offerSourceId,
        channel,
        recipient_id: input.recipientId,
        match_id: input.matchId ?? null,
      },
      { onConflict: "wish_id,offer_source,offer_source_id,channel", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    console.error("[notification-dedup] claim error (fail-closed):", {
      code: error.code,
      message: error.message,
      wishId: input.wishId,
      sourceId: input.offerSourceId,
    });
    return { claimed: false, reason: `db_error:${error.code ?? "unknown"}` };
  }

  if (!data || data.length === 0) {
    return { claimed: false, reason: "duplicate" };
  }
  return { claimed: true };
}

/**
 * Retorna true se já existe registro bem-sucedido de notificação para o
 * match no canal indicado (status != 'erro').
 */
export async function hasBeenNotified(
  matchId: string,
  channel: NotificationChannel = "whatsapp"
): Promise<boolean> {
  if (!matchId) return false;
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("match_id", matchId)
    .eq("channel", channel)
    .neq("status", "erro")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export interface RecordNotificationInput {
  tenantId: string;
  matchId: string;
  recipientId: string;
  channel?: NotificationChannel;
  template: string;
  content: string;
  status?: "pendente" | "enviado" | "entregue" | "lido" | "respondido" | "erro";
  providerMessageId?: string;
  failureReason?: string;
}

/**
 * Insere linha em notifications registrando o envio. Best-effort: loga erro
 * mas não lança — não deve derrubar o fluxo de entrega que já deu certo.
 */
export async function recordNotification(input: RecordNotificationInput): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        tenant_id: input.tenantId,
        match_id: input.matchId,
        recipient_id: input.recipientId,
        channel: input.channel ?? "whatsapp",
        template: input.template,
        content: input.content,
        status: input.status ?? "enviado",
        sent_at: input.status === "erro" ? null : new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      // 23505 = unique_violation: corrida entre runs concorrentes — alguém
      // já registrou a mesma notificação. Não é erro real.
      if (error.code === "23505") {
        console.log("[notification-log] já existe notificação enviada para este match — ignorando");
        return null;
      }
      console.warn("[notification-log] insert failed:", error.message);
      return null;
    }
    return (data?.id as string) ?? null;
  } catch (err) {
    console.warn("[notification-log] insert threw:", err instanceof Error ? err.message : err);
    return null;
  }
}
