/**
 * Facade de envio WhatsApp — spec seção 8.
 *
 * Provedor default: Z-API (flag whatsapp.zapi.enabled). Meta Cloud como fallback.
 * Gates: whatsapp.outbound.enabled (desliga envio), whatsapp.shadow_mode (processa
 * mas não envia — QA).
 *
 * Toda saída é logada em whatsapp_outbound_messages para auditoria/retry.
 */

import { supabase } from "@/lib/db";
import { isEnabled } from "@/lib/feature-flags";
import { formatPhoneForZapi, sendText as zapiSendText, toE164 } from "@/lib/services/zapi";

export interface WhatsAppSendResult {
  messageId: string;
  status: "sent" | "failed" | "skipped";
  provider: "zapi" | "meta" | "shadow" | "mock";
  error?: string;
}

export interface SendOptions {
  recipientId?: string;
  recipientType?: "vendedor" | "gestor" | "lojista" | "admin" | "cliente";
  templateName?: string;
}

/**
 * Templates legados usados pela API de match existente. Mantidos para compat
 * enquanto o novo pipeline conversacional (src/templates/whatsapp/*.txt) não
 * substitui todas as chamadas.
 */
const LEGACY_TEMPLATES = {
  match_vendedor:             "🚗 Encontramos um {{vehicle}} {{year}} em {{city}}! Preço: {{price}}. Acesse o sistema para detalhes.",
  match_avaliador:            "📋 Este veículo está na lista de desejos de {{count}} vendedor(es) da rede.",
  match_lojista:              "📢 Um vendedor da rede tem um cliente interessado no {{vehicle}} placa {{plate}}. Quer ser conectado?",
  match_concessionaria:       "🔔 Interesse qualificado no anúncio do {{vehicle}}. Um vendedor da rede tem um cliente buscando este veículo.",
  confirmacao_disponibilidade:"📦 O {{vehicle}} ainda está disponível no seu estoque? Responda SIM para manter ativo ou NÃO para remover.",
  follow_up_venda:            "👋 Olá! O match com o {{vehicle}} resultou em venda? Responda SIM ou NÃO para nos ajudar a melhorar.",
} as const;

export type LegacyTemplateName = keyof typeof LEGACY_TEMPLATES;

function renderLegacyTemplate(template: LegacyTemplateName, params: Record<string, string>): string {
  let body: string = LEGACY_TEMPLATES[template];
  for (const [key, value] of Object.entries(params)) {
    body = body.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
  }
  return body;
}

/**
 * Log best-effort em whatsapp_outbound_messages. Silencia erros para não
 * derrubar o caller (tabela pode não existir antes da migration).
 */
async function logOutbound(params: {
  phoneE164: string;
  providerMessageId: string;
  status: "sent" | "failed" | "skipped";
  opts?: SendOptions;
  payload: unknown;
  failureReason?: string;
}): Promise<void> {
  try {
    await supabase.from("whatsapp_outbound_messages").insert({
      phone_e164: params.phoneE164,
      recipient_id: params.opts?.recipientId ?? null,
      recipient_type: params.opts?.recipientType ?? null,
      template_name: params.opts?.templateName ?? null,
      payload: params.payload,
      provider_message_id: params.providerMessageId || null,
      status: params.status === "skipped" ? "pending" : params.status,
      failure_reason: params.failureReason ?? null,
      sent_at: params.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.warn("[WhatsApp] log outbound skipped:", err instanceof Error ? err.message : err);
  }
}

async function sendViaMeta(phone: string, body: string): Promise<WhatsAppSendResult> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!apiUrl || !apiToken || !phoneNumberId) {
    return { messageId: `mock-${Date.now()}`, status: "sent", provider: "mock" };
  }
  try {
    const res = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhoneForZapi(phone),
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { messageId: "", status: "failed", provider: "meta", error: err };
    }
    const data = await res.json();
    return { messageId: data.messages?.[0]?.id ?? "", status: "sent", provider: "meta" };
  } catch (err) {
    return { messageId: "", status: "failed", provider: "meta", error: err instanceof Error ? err.message : "network" };
  }
}

/**
 * Envio cru de texto — respeita todas as feature flags de saída.
 * Prefira usar os helpers semânticos (sendLegacyTemplate, etc.) ou os
 * templates novos em src/templates/whatsapp/.
 */
export async function sendText(phone: string, body: string, opts?: SendOptions): Promise<WhatsAppSendResult> {
  const phoneE164 = toE164(phone);

  const outboundEnabled = await isEnabled("whatsapp.outbound.enabled");
  if (!outboundEnabled) {
    const result: WhatsAppSendResult = { messageId: "", status: "skipped", provider: "zapi" };
    await logOutbound({ phoneE164, providerMessageId: "", status: "skipped", opts, payload: { body }, failureReason: "outbound_disabled" });
    return result;
  }

  const shadow = await isEnabled("whatsapp.shadow_mode");
  if (shadow) {
    const result: WhatsAppSendResult = { messageId: `shadow-${Date.now()}`, status: "skipped", provider: "shadow" };
    await logOutbound({ phoneE164, providerMessageId: result.messageId, status: "skipped", opts, payload: { body } });
    return result;
  }

  const useZapi = await isEnabled("whatsapp.zapi.enabled");
  let result: WhatsAppSendResult;
  if (useZapi) {
    const r = await zapiSendText(phone, body);
    result = { messageId: r.messageId, status: r.status, provider: "zapi", error: r.error };
  } else {
    result = await sendViaMeta(phone, body);
  }

  await logOutbound({
    phoneE164,
    providerMessageId: result.messageId,
    status: result.status === "skipped" ? "sent" : result.status, // já tratado acima
    opts,
    payload: { body, provider: result.provider },
    failureReason: result.error,
  });
  return result;
}

/**
 * Envio por template legado (mantido para callers antigos em /api/matching, cron, etc.).
 */
export async function sendWhatsAppMessage(
  phone: string,
  template: LegacyTemplateName,
  parameters: Record<string, string>,
  opts?: SendOptions
): Promise<WhatsAppSendResult> {
  const body = renderLegacyTemplate(template, parameters);
  return sendText(phone, body, { ...opts, templateName: opts?.templateName ?? template });
}

/**
 * Helper semântico — notifica vendedor sobre match (wrapper do template legado).
 */
export async function sendMatchNotification(params: {
  sellerPhone: string;
  vehicleName: string;
  year: number;
  city: string;
  price: string;
  sellerId?: string;
}): Promise<WhatsAppSendResult> {
  return sendWhatsAppMessage(
    params.sellerPhone,
    "match_vendedor",
    {
      vehicle: params.vehicleName,
      year: String(params.year),
      city: params.city,
      price: params.price,
    },
    { recipientId: params.sellerId, recipientType: "vendedor", templateName: "match_vendedor" }
  );
}

export { formatPhoneForZapi as formatPhoneForAPI, toE164 };
