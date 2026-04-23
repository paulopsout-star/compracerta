/**
 * Processamento de mensagens inbound do WhatsApp — spec seções 5, 8, 9.
 *
 * Responsabilidades:
 * - Gate de flag whatsapp.inbound.enabled
 * - Idempotência via provider_message_id
 * - Rate limit por telefone (flag rate_limit.inbound_per_min_per_user)
 * - Identificação de vendedor (desconhecido → mensagem padrão, inativo → msg bloqueio)
 * - Persistência em whatsapp_inbound_messages
 * - Roteamento para orquestrador de conversa (stub até FASE 8)
 */

import { supabase } from "@/lib/db";
import { getNumber, isEnabled } from "@/lib/feature-flags";
import { toE164 } from "@/lib/services/zapi";
import { sendText } from "@/lib/services/whatsapp";
import { renderTemplate } from "@/lib/whatsapp-templates";
import { identifySender } from "@/lib/conversation/seller-auth";
import { getOrCreateActiveSession } from "@/lib/conversation/session-store";
import { processTurn } from "@/lib/conversation/orchestrator";

export interface InboundEnvelope {
  providerMessageId: string;
  phoneRaw: string;
  senderName?: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  receivedAt: Date;
  rawPayload: unknown;
}

export interface ProcessResult {
  outcome:
    | "duplicate"
    | "inbound_disabled"
    | "maintenance"
    | "rate_limited"
    | "unknown_sender"
    | "inactive_seller"
    | "unsupported_media"
    | "processed"
    | "error";
  reason?: string;
}

async function isRateLimited(phoneE164: string): Promise<boolean> {
  const limit = await getNumber("rate_limit.inbound_per_min_per_user", 10);
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("whatsapp_inbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("phone_e164", phoneE164)
    .gte("received_at", since);
  return (count ?? 0) >= limit;
}

/**
 * Lock idempotente atômico via UPSERT com ignoreDuplicates.
 * Retorna { acquired: true } se foi a primeira a inserir o messageId.
 * Retorna { acquired: false } se já existia (duplicata) OU em erro de DB
 * (fail-closed: melhor não responder do que duplicar a resposta).
 */
async function tryRegisterInbound(env: InboundEnvelope): Promise<{ acquired: boolean; reason?: string }> {
  const phoneE164 = toE164(env.phoneRaw);
  const contentType = env.audioUrl ? "audio" : env.imageUrl ? "image" : "text";
  const payload = {
    provider_message_id: env.providerMessageId,
    phone_e164: phoneE164,
    seller_id: null,
    content_type: contentType,
    content: env.text ?? null,
    media_url: env.audioUrl ?? env.imageUrl ?? null,
    raw_payload: env.rawPayload,
    received_at: env.receivedAt.toISOString(),
    session_id: null,
  };

  const { data, error } = await supabase
    .from("whatsapp_inbound_messages")
    .upsert(payload, { onConflict: "provider_message_id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("[Inbound] register error (fail-closed):", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      messageId: env.providerMessageId,
    });
    return { acquired: false, reason: `db_error:${error.code ?? "unknown"}` };
  }

  // Com ignoreDuplicates: true, INSERT real → data = [{id}]; conflito → data = [].
  if (!data || data.length === 0) {
    console.log("[Inbound] duplicate skipped", { messageId: env.providerMessageId });
    return { acquired: false, reason: "duplicate" };
  }
  return { acquired: true };
}

/**
 * Após identificação, completa o registro com seller_id e session_id.
 * Best-effort: warn em erro mas não interrompe.
 */
async function attachInboundContext(
  providerMessageId: string,
  sellerId: string | null,
  sessionId: string | null
): Promise<void> {
  if (!sellerId && !sessionId) return;
  const update: Record<string, unknown> = { processed_at: new Date().toISOString() };
  if (sellerId) update.seller_id = sellerId;
  if (sessionId) update.session_id = sessionId;
  const { error } = await supabase
    .from("whatsapp_inbound_messages")
    .update(update)
    .eq("provider_message_id", providerMessageId);
  if (error) console.warn("[Inbound] attach context error:", error.message);
}

export async function processInbound(env: InboundEnvelope): Promise<ProcessResult> {
  console.log("[Inbound] enter", { messageId: env.providerMessageId, phone: env.phoneRaw, hasText: !!env.text });
  try {
    if (await isEnabled("maintenance_mode.enabled")) {
      await sendText(env.phoneRaw, renderTemplate("manutencao", { previsao_retorno: "em breve" }), {
        templateName: "manutencao",
      });
      return { outcome: "maintenance" };
    }
    if (!(await isEnabled("whatsapp.inbound.enabled"))) {
      return { outcome: "inbound_disabled" };
    }

    // LOCK idempotente: tenta inserir o registro logo de cara. Se outra
    // execução paralela (Z-API retry) já inseriu OU se há erro de DB,
    // sai aqui sem enviar nada (fail-closed).
    const lock = await tryRegisterInbound(env);
    if (!lock.acquired) {
      return { outcome: "duplicate", reason: lock.reason };
    }

    const phoneE164 = toE164(env.phoneRaw);

    if (await isRateLimited(phoneE164)) {
      console.warn("[Inbound] rate limited:", phoneE164);
      return { outcome: "rate_limited" };
    }

    console.log("[Inbound] identifying sender", { phoneE164 });
    const ident = await identifySender(phoneE164, { displayName: env.senderName });
    console.log("[Inbound] ident result", { kind: ident.kind, userId: ident.kind !== "unknown" ? ident.user.id : null });

    // Desconhecido — resposta padrão (registro já foi feito acima)
    if (ident.kind === "unknown") {
      await sendText(env.phoneRaw, renderTemplate("numero_nao_cadastrado"), {
        templateName: "numero_nao_cadastrado",
      });
      return { outcome: "unknown_sender" };
    }

    if (ident.kind === "inactive") {
      await sendText(
        env.phoneRaw,
        renderTemplate("vendedor_inativo", { vendedor_nome: ident.user.name }),
        { recipientId: ident.user.id, recipientType: "vendedor", templateName: "vendedor_inativo" }
      );
      await attachInboundContext(env.providerMessageId, ident.user.id, null);
      return { outcome: "inactive_seller" };
    }

    // Autenticado — cria/atualiza sessão
    const user = ident.user;
    const session = await getOrCreateActiveSession(user.id, phoneE164);
    await attachInboundContext(env.providerMessageId, user.id, session.id);

    // Mídia — checa flags
    if (env.audioUrl && !(await isEnabled("conversation.audio_transcription.enabled"))) {
      await sendText(
        env.phoneRaw,
        "Ainda não consigo ouvir áudios por aqui. Pode me mandar o mesmo conteúdo em texto?",
        { recipientId: user.id, recipientType: "vendedor", templateName: "media_unsupported_audio" }
      );
      return { outcome: "unsupported_media" };
    }
    if (env.imageUrl && !(await isEnabled("conversation.image_recognition.enabled"))) {
      await sendText(
        env.phoneRaw,
        "Recebi a foto, obrigado! Mas ainda não processo imagens automaticamente. Se puder, me conte em texto o modelo que o cliente procura.",
        { recipientId: user.id, recipientType: "vendedor", templateName: "media_unsupported_image" }
      );
      return { outcome: "unsupported_media" };
    }

    // Roteamento para o orquestrador de conversa (state machine + extrator).
    // Vendedor sem role definido cai em boas-vindas (nem todo usuário do sistema
    // é vendedor — gestor/lojista/admin também podem mandar mensagem).
    if (user.role !== "vendedor") {
      await sendText(env.phoneRaw, renderTemplate("boas_vindas", { vendedor_nome: user.name }), {
        recipientId: user.id, recipientType: user.role, templateName: "boas_vindas_non_seller",
      });
      return { outcome: "processed" };
    }

    await processTurn({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        phone: user.phone,
        dealershipId: user.dealershipId,
        dealerStoreId: user.dealerStoreId,
      },
      session,
      text: env.text ?? "",
    });
    return { outcome: "processed" };
  } catch (err) {
    console.error("[Inbound] processing error:", err);
    return { outcome: "error", reason: err instanceof Error ? err.message : "unknown" };
  }
}
