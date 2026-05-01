/**
 * Registro auditável de notificações enviadas. Fonte da verdade para
 * "este match já foi notificado via WhatsApp?" — evita spam mesmo em
 * cenários de reprocessamento ou inconsistência em outras tabelas.
 *
 * Tabela: notifications (id, matchId, recipientId, channel, template,
 * content, status, sentAt, readAt, respondedAt, createdAt).
 */

import { supabase } from "@/lib/db";
import { createHash } from "node:crypto";

export type NotificationChannel = "whatsapp" | "email" | "sistema";

export interface ClaimSlotInput {
  tenantId: string;
  wishId: string;
  clientPhone: string;
  offerSource: string;
  offerSourceId: string;
  recipientId: string;
  channel?: NotificationChannel;
  matchId?: string | null;
}

function normalizeClientPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "unknown";
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function buildDedupKey(input: ClaimSlotInput, channel: NotificationChannel): string {
  return createHash("sha256")
    .update([
      input.tenantId || "default",
      input.recipientId,
      normalizeClientPhone(input.clientPhone),
      input.offerSource.toLowerCase(),
      input.offerSourceId.toLowerCase(),
      channel,
    ].join("|"))
    .digest("hex");
}

/**
 * Reserva atomicamente o "slot" de notificacao desta oferta para este cliente.
 * Tabela: notification_dedup, chaveada por dedup_key:
 *   tenant + vendedor + telefone_cliente + fonte/id_oferta + canal.
 *
 * Padrao claim-then-send:
 *   - Se inseriu (claimed=true): caller envia o WhatsApp.
 *   - Se conflito (claimed=false, reason='duplicate'): outro run ja notificou.
 *   - Se erro de DB (claimed=false, reason='db_error:...'): fail-closed.
 *
 * Idempotencia sobrevive a recreation de wish/match, porque nao depende de
 * match_id e nao depende apenas de wish_id.
 */
export async function claimNotificationSlot(
  input: ClaimSlotInput
): Promise<{ claimed: boolean; reason?: string }> {
  const channel = input.channel ?? "whatsapp";
  const dedupKey = buildDedupKey(input, channel);
  const { data, error } = await supabase
    .from("notification_dedup")
    .upsert(
      {
        tenant_id: input.tenantId,
        wish_id: input.wishId,
        client_phone: normalizeClientPhone(input.clientPhone),
        dedup_key: dedupKey,
        offer_source: input.offerSource,
        offer_source_id: input.offerSourceId,
        channel,
        recipient_id: input.recipientId,
        match_id: input.matchId ?? null,
      },
      { onConflict: "dedup_key", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    console.error("[notification-dedup] claim error (fail-closed):", {
      code: error.code,
      message: error.message,
      wishId: input.wishId,
      sourceId: input.offerSourceId,
      dedupKey,
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
