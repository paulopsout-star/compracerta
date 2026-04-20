/**
 * Webhook inbound Z-API — spec seção 8.3.
 *
 * Contrato: responde 200 OK em < 1s. Processamento assíncrono via `after()`.
 * Regras:
 * - Valida assinatura (header X-Zapi-Signature vs ZAPI_WEBHOOK_SECRET)
 * - Filtra: isGroup, fromMe, notification — ignora
 * - Idempotência no processor
 */

import { after, NextRequest, NextResponse } from "next/server";
import { processInbound, type InboundEnvelope } from "@/lib/conversation/inbound-processor";

function runAfter(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    // waitUntil não disponível — fallback best-effort
    task().catch((err) => console.error("[Webhook] after fallback error:", err));
  }
}

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

function verifySignature(req: NextRequest): boolean {
  const secret = process.env.ZAPI_WEBHOOK_SECRET;
  if (!secret) {
    // Dev/staging — aceita sem secret mas avisa
    console.warn("[Webhook inbound] ZAPI_WEBHOOK_SECRET não configurado — aceitando request sem validação");
    return true;
  }
  const header = req.headers.get("x-zapi-signature") ?? req.headers.get("X-Zapi-Signature") ?? "";
  return timingSafeEqual(header, secret);
}

export async function POST(req: NextRequest) {
  if (!verifySignature(req)) {
    console.warn("[Webhook inbound] assinatura inválida");
    return NextResponse.json({ ack: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: ZapiInboundPayload;
  try {
    payload = (await req.json()) as ZapiInboundPayload;
  } catch {
    return NextResponse.json({ ack: false, error: "invalid_json" }, { status: 400 });
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
    receivedAt: payload.momment ? new Date(payload.momment * 1000) : new Date(),
    rawPayload: payload,
  };

  // Processa fora do caminho crítico — ACK rápido
  runAfter(async () => {
    const result = await processInbound(env);
    if (result.outcome === "error") {
      console.error("[Webhook inbound] processing error:", result.reason, { messageId: env.providerMessageId });
    }
  });

  return NextResponse.json({ ack: true, messageId: payload.messageId });
}

// Health check útil no dev
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "whatsapp.inbound" });
}
