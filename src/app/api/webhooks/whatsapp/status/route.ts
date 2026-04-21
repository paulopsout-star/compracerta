/**
 * Webhook de status Z-API — spec seção 8.4.
 *
 * Atualiza whatsapp_outbound_messages com delivery/read/failed.
 * Em FAILED, agenda retry (tratamento completo de fallback e-mail fica na fase de notificações ricas).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ZapiStatusPayload {
  instanceId?: string;
  messageId?: string;
  phone?: string;
  status?: "SENT" | "RECEIVED" | "READ" | "PLAYED" | "FAILED";
  momment?: number;
  type?: string;
  failureReason?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function verifyAuth(req: NextRequest, payload: { instanceId?: string }): boolean {
  const secret = process.env.ZAPI_WEBHOOK_SECRET;
  const expectedInstanceId = process.env.ZAPI_INSTANCE_ID?.trim();
  if (secret) {
    const header = req.headers.get("x-zapi-signature") ?? req.headers.get("X-Zapi-Signature") ?? "";
    if (header && timingSafeEqual(header, secret)) return true;
  }
  if (expectedInstanceId && payload.instanceId === expectedInstanceId) return true;
  if (!secret && !expectedInstanceId) return true;
  return false;
}

function mapStatus(s: string | undefined): { status?: string; delivered?: boolean; read?: boolean; failed?: boolean } {
  switch (s) {
    case "SENT":     return { status: "sent" };
    case "RECEIVED": return { status: "delivered", delivered: true };
    case "READ":
    case "PLAYED":   return { status: "read", delivered: true, read: true };
    case "FAILED":   return { status: "failed", failed: true };
    default:         return {};
  }
}

async function applyStatus(payload: ZapiStatusPayload) {
  if (!payload.messageId) return;
  const m = mapStatus(payload.status);
  if (!m.status) return;

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: m.status };
  if (m.delivered) update.delivered_at = now;
  if (m.read) update.read_at = now;
  if (m.failed) update.failure_reason = payload.failureReason ?? "unknown";

  try {
    const { error } = await supabase
      .from("whatsapp_outbound_messages")
      .update(update)
      .eq("provider_message_id", payload.messageId);
    if (error) console.warn("[Webhook status] update failed:", error.message);
  } catch (err) {
    console.error("[Webhook status] unexpected error:", err);
  }
}

export async function POST(req: NextRequest) {
  let payload: ZapiStatusPayload;
  try {
    payload = (await req.json()) as ZapiStatusPayload;
  } catch {
    return NextResponse.json({ ack: false, error: "invalid_json" }, { status: 400 });
  }
  if (!verifyAuth(req, payload)) {
    return NextResponse.json({ ack: false, error: "invalid_signature" }, { status: 401 });
  }
  try {
    await applyStatus(payload);
  } catch (err) {
    console.error("[Webhook status] applyStatus error:", err);
  }
  return NextResponse.json({ ack: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "whatsapp.status" });
}
