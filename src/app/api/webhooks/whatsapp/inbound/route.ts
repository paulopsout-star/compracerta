/**
 * Webhook inbound Z-API — spec seção 8.3.
 *
 * Contrato: responde 200 OK em < 1s. Processamento assíncrono via `after()`.
 * Regras:
 * - Valida assinatura (header X-Zapi-Signature vs ZAPI_WEBHOOK_SECRET)
 * - Filtra: isGroup, fromMe, notification — ignora
 * - Idempotência no processor
 */

import { NextRequest, NextResponse } from "next/server";
import { processInbound, type InboundEnvelope } from "@/lib/conversation/inbound-processor";
import { resolveTenantByZapiInstanceId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ZapiInboundPayload {
  instanceId?: string;
  messageId?: string;
  phone?: string;
  fromMe?: boolean;
  momment?: number;
  type?: string;
  text?: { message?: string };
  audio?: { audioUrl?: string; mimeType?: string };
  image?: { imageUrl?: string; caption?: string };
  isGroup?: boolean;
  notification?: unknown;
  senderName?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Resolve o tenant a que o payload Z-API pertence + autentica.
 *
 * Ordem (multi-tenant):
 * 1) payload.instanceId bate com algum tenant ativo (lookup em
 *    tenant_feature_flags whatsapp.zapi.instance_id) — caminho preferido.
 * 2) Header X-Zapi-Signature bate com ZAPI_WEBHOOK_SECRET global — fallback
 *    legacy enquanto há só 1 tenant; resolve para tenant default.
 * 3) instanceId bate com ZAPI_INSTANCE_ID env — fallback legacy idem.
 *
 * Retorna { tenantId, source } se autenticou, ou null.
 */
async function authenticateAndResolveTenant(
  req: NextRequest,
  payload: { instanceId?: string }
): Promise<{ tenantId: string; source: "instance_lookup" | "secret_header" | "env_fallback" } | null> {
  const instanceId = payload.instanceId?.trim();

  // 1) Lookup multi-tenant pelo instanceId
  if (instanceId) {
    const tenantId = await resolveTenantByZapiInstanceId(instanceId);
    if (tenantId) return { tenantId, source: "instance_lookup" };
  }

  // Fallbacks (transição enquanto envs antigas existem ou só 1 tenant ativo).
  // Ambos resolvem para o tenant default `compra-certa`.
  const { resolveTenantByHost } = await import("@/lib/tenant");
  const hostFallback = await resolveTenantByHost("");
  const fallbackTenantId = hostFallback?.id;
  if (!fallbackTenantId) return null;

  const secret = process.env.ZAPI_WEBHOOK_SECRET;
  const expectedInstanceId = process.env.ZAPI_INSTANCE_ID?.trim();

  if (secret) {
    const header = req.headers.get("x-zapi-signature") ?? req.headers.get("X-Zapi-Signature") ?? "";
    if (header && timingSafeEqual(header, secret)) {
      return { tenantId: fallbackTenantId, source: "secret_header" };
    }
  }

  if (expectedInstanceId && instanceId === expectedInstanceId) {
    return { tenantId: fallbackTenantId, source: "env_fallback" };
  }

  // Dev: nada configurado — aceita no tenant default
  if (!secret && !expectedInstanceId) {
    console.warn("[Webhook inbound] sem credenciais configuradas — aceitando no tenant default");
    return { tenantId: fallbackTenantId, source: "env_fallback" };
  }

  return null;
}

export async function POST(req: NextRequest) {
  console.log("[Webhook inbound] POST received", { ts: new Date().toISOString() });

  let payload: ZapiInboundPayload;
  try {
    payload = (await req.json()) as ZapiInboundPayload;
  } catch {
    return NextResponse.json({ ack: false, error: "invalid_json" }, { status: 400 });
  }

  const authResult = await authenticateAndResolveTenant(req, payload);
  if (!authResult) {
    console.warn("[Webhook inbound] autenticação falhou (instanceId não cadastrado em nenhum tenant)", {
      hasHeader: !!req.headers.get("x-zapi-signature"),
      payloadInstanceId: payload.instanceId,
    });
    return NextResponse.json({ ack: false, error: "invalid_signature" }, { status: 401 });
  }
  console.log("[Webhook inbound] tenant resolved", { tenantId: authResult.tenantId, source: authResult.source });

  // Filtros obrigatórios
  if (payload.isGroup) {
    return NextResponse.json({ ack: true, ignored: "group_message" });
  }
  if (payload.fromMe) {
    return NextResponse.json({ ack: true, ignored: "from_me" });
  }
  if (payload.notification !== null && payload.notification !== undefined) {
    return NextResponse.json({ ack: true, ignored: "notification" });
  }
  if (!payload.messageId || !payload.phone) {
    return NextResponse.json({ ack: false, error: "missing_fields" }, { status: 400 });
  }

  const env: InboundEnvelope = {
    tenantId: authResult.tenantId,
    providerMessageId: payload.messageId,
    phoneRaw: payload.phone,
    senderName: payload.senderName,
    text: payload.text?.message,
    audioUrl: payload.audio?.audioUrl,
    imageUrl: payload.image?.imageUrl,
    receivedAt: payload.momment ? new Date(payload.momment) : new Date(),
    rawPayload: payload,
  };

  // Processa inline — `after()` do Next.js 16 truncado no runtime Vercel
  // (callback agendado mas morre antes do await resolver). Trade-off: +1-2s
  // no ACK, em troca de garantia de execução. Z-API aceita até ~5s.
  try {
    const result = await processInbound(env);
    console.log("[Webhook inbound] processed", { messageId: env.providerMessageId, outcome: result.outcome, reason: result.reason });
  } catch (err) {
    console.error("[Webhook inbound] processInbound THROW:",
      err instanceof Error ? err.message : String(err),
      err instanceof Error ? err.stack : "");
  }

  return NextResponse.json({ ack: true, messageId: payload.messageId });
}

// Health check útil no dev
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "whatsapp.inbound" });
}
