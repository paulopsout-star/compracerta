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
