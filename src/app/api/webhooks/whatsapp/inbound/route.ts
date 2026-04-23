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
 * Z-API via API (vs painel) não permite configurar header customizado. Aceitamos
 * qualquer uma das duas autenticações:
 * 1) Header X-Zapi-Signature bate com ZAPI_WEBHOOK_SECRET (alta segurança — quem
 *    configurou webhook via painel deve usar essa)
 * 2) payload.instanceId bate com ZAPI_INSTANCE_ID (fallback — Z-API sempre envia
 *    esse campo; um attacker teria que descobrir o ID, que não é público)
 */
function verifyAuth(req: NextRequest, payload: { instanceId?: string }): boolean {
  const secret = process.env.ZAPI_WEBHOOK_SECRET;
  const expectedInstanceId = process.env.ZAPI_INSTANCE_ID?.trim();

  // Caminho 1: header HMAC
  if (secret) {
    const header = req.headers.get("x-zapi-signature") ?? req.headers.get("X-Zapi-Signature") ?? "";
    if (header && timingSafeEqual(header, secret)) return true;
  }

  // Caminho 2: instanceId bate
  if (expectedInstanceId && payload.instanceId && payload.instanceId === expectedInstanceId) {
    return true;
  }

  // Dev: se nada configurado, aceita
  if (!secret && !expectedInstanceId) {
    console.warn("[Webhook inbound] sem ZAPI_WEBHOOK_SECRET nem ZAPI_INSTANCE_ID — aceitando sem validação");
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  console.log("[Webhook inbound] POST received", { ts: new Date().toISOString() });

  let payload: ZapiInboundPayload;
  try {
    payload = (await req.json()) as ZapiInboundPayload;
  } catch {
    return NextResponse.json({ ack: false, error: "invalid_json" }, { status: 400 });
  }

  if (!verifyAuth(req, payload)) {
    console.warn("[Webhook inbound] autenticação falhou", {
      hasHeader: !!req.headers.get("x-zapi-signature"),
      payloadInstanceId: payload.instanceId,
    });
    return NextResponse.json({ ack: false, error: "invalid_signature" }, { status: 401 });
  }

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
