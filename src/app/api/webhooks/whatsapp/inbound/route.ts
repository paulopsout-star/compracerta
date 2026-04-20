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
import { supabase } from "@/lib/db";

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
  console.log("[Webhook inbound] POST received", { ts: new Date().toISOString() });
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

  // DEBUG: insert com URL hardcoded vs env var — isola se o problema é env-var (\n)
  // ou outra coisa.
  const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const keyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  console.log("[Webhook inbound] DEBUG env:",
    { url: JSON.stringify(urlEnv), urlLen: urlEnv.length, keyLen: keyEnv.length,
      urlEndsWithNewline: urlEnv.endsWith("\n") });

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sbHard = createClient("https://xqwbgcblyyfqwjuwqvjf.supabase.co", keyEnv.trim());
    const { error } = await sbHard.from("whatsapp_inbound_messages").insert({
      provider_message_id: `debug-hardcoded-${env.providerMessageId}`,
      phone_e164: env.phoneRaw,
      content: "(debug: hardcoded URL)",
      received_at: env.receivedAt.toISOString(),
    });
    console.log("[Webhook inbound] DEBUG hardcoded insert:", error ? error.message : "OK");

    const { error: e2 } = await supabase.from("whatsapp_inbound_messages").insert({
      provider_message_id: `debug-env-${env.providerMessageId}`,
      phone_e164: env.phoneRaw,
      content: "(debug: env-based client)",
      received_at: env.receivedAt.toISOString(),
    });
    console.log("[Webhook inbound] DEBUG env insert:", e2 ? e2.message : "OK");
  } catch (err) {
    console.error("[Webhook inbound] DEBUG insert THROW:", err instanceof Error ? err.message : String(err));
  }

  // Processa inline — `after()` do Next.js 16 está sendo truncado no runtime
  // Vercel (callback agendado mas morre antes do await resolver). Trade-off:
  // +1-2s no ACK, em troca de garantia de execução. Z-API aceita até ~5s.
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
