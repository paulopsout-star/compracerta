/**
 * Cliente Z-API — spec: prompt-final-whatsapp-compra-certa.md seção 8
 *
 * Endpoints usados:
 * - POST /instances/{ID}/token/{TOKEN}/send-text
 * - POST /instances/{ID}/token/{TOKEN}/send-button-list
 * - POST /instances/{ID}/token/{TOKEN}/send-option-list
 * - POST /instances/{ID}/token/{TOKEN}/send-image
 *
 * Todas as chamadas enviam Client-Token no header.
 */

import { getString } from "@/lib/feature-flags";

export interface ZapiSendResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  raw?: unknown;
}

export interface ZapiButton {
  id: string;
  label: string;
}

export interface ZapiOption {
  id: string;
  title: string;
  description?: string;
}

export interface ZapiConfig {
  baseUrl: string;
  instanceId: string;
  instanceToken: string;
  clientToken: string;
}

export const ZAPI_FLAG_KEYS = {
  baseUrl: "whatsapp.zapi.base_url",
  instanceId: "whatsapp.zapi.instance_id",
  instanceToken: "whatsapp.zapi.instance_token",
  clientToken: "whatsapp.zapi.client_token",
} as const;

export const ZAPI_DEFAULT_BASE_URL = "https://api.z-api.io";

/**
 * Carrega config Z-API. Precedência: feature_flags (admin/integracoes) > env > default.
 * Permite alterar a rota sem redeploy. Retorna null se faltar instance_id/token/client_token.
 */
export async function getConfig(): Promise<ZapiConfig | null> {
  const [flagBaseUrl, flagInstanceId, flagInstanceToken, flagClientToken] = await Promise.all([
    getString(ZAPI_FLAG_KEYS.baseUrl, ""),
    getString(ZAPI_FLAG_KEYS.instanceId, ""),
    getString(ZAPI_FLAG_KEYS.instanceToken, ""),
    getString(ZAPI_FLAG_KEYS.clientToken, ""),
  ]);

  const baseUrl = flagBaseUrl || process.env.ZAPI_BASE_URL || ZAPI_DEFAULT_BASE_URL;
  const instanceId = flagInstanceId || process.env.ZAPI_INSTANCE_ID || "";
  const instanceToken = flagInstanceToken || process.env.ZAPI_INSTANCE_TOKEN || "";
  const clientToken = flagClientToken || process.env.ZAPI_CLIENT_TOKEN || "";

  if (!instanceId || !instanceToken || !clientToken) return null;
  return { baseUrl, instanceId, instanceToken, clientToken };
}

function endpoint(cfg: ZapiConfig, path: string): string {
  return `${cfg.baseUrl}/instances/${cfg.instanceId}/token/${cfg.instanceToken}/${path}`;
}

/**
 * Normaliza para E.164 brasileiro (sem o +).
 * Z-API aceita "5531988887777" (sem +).
 * Aceita entradas "(31) 98888-7777", "+5531988887777", "31988887777".
 */
export function formatPhoneForZapi(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("55") && cleaned.length >= 12) return cleaned;
  return `55${cleaned}`;
}

/**
 * Normaliza para E.164 completo com +  — usado para persistência/logs.
 */
export function toE164(phone: string): string {
  return `+${formatPhoneForZapi(phone)}`;
}

async function post(url: string, body: unknown, clientToken: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify(body),
  });
}

async function handle(res: Response, fallbackError: string): Promise<ZapiSendResult> {
  if (!res.ok) {
    const text = await res.text().catch(() => fallbackError);
    console.error("[Z-API] Request failed:", res.status, text);
    return { messageId: "", status: "failed", error: text || fallbackError };
  }
  const data = (await res.json().catch(() => ({}))) as { messageId?: string; id?: string; zaapId?: string };
  return {
    messageId: data.messageId ?? data.id ?? data.zaapId ?? "",
    status: "sent",
    raw: data,
  };
}

function mockWarn(op: string): ZapiSendResult {
  console.warn(`[Z-API] não configurado — ${op} em modo mock`);
  return { messageId: `mock-${Date.now()}`, status: "sent" };
}

export async function sendText(phone: string, message: string): Promise<ZapiSendResult> {
  const cfg = await getConfig();
  if (!cfg) return mockWarn("sendText");
  try {
    const res = await post(
      endpoint(cfg, "send-text"),
      { phone: formatPhoneForZapi(phone), message },
      cfg.clientToken
    );
    return await handle(res, "send-text failed");
  } catch (err) {
    console.error("[Z-API] sendText network error:", err);
    return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "network" };
  }
}

export async function sendButtonList(
  phone: string,
  message: string,
  buttons: ZapiButton[]
): Promise<ZapiSendResult> {
  const cfg = await getConfig();
  if (!cfg) return mockWarn("sendButtonList");
  try {
    const res = await post(
      endpoint(cfg, "send-button-list"),
      {
        phone: formatPhoneForZapi(phone),
        message,
        buttonList: { buttons },
      },
      cfg.clientToken
    );
    return await handle(res, "send-button-list failed");
  } catch (err) {
    console.error("[Z-API] sendButtonList network error:", err);
    return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "network" };
  }
}

export async function sendOptionList(
  phone: string,
  message: string,
  title: string,
  buttonLabel: string,
  options: ZapiOption[]
): Promise<ZapiSendResult> {
  const cfg = await getConfig();
  if (!cfg) return mockWarn("sendOptionList");
  try {
    const res = await post(
      endpoint(cfg, "send-option-list"),
      {
        phone: formatPhoneForZapi(phone),
        message,
        optionList: { title, buttonLabel, options },
      },
      cfg.clientToken
    );
    return await handle(res, "send-option-list failed");
  } catch (err) {
    console.error("[Z-API] sendOptionList network error:", err);
    return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "network" };
  }
}

export async function sendImage(phone: string, imageUrl: string, caption?: string): Promise<ZapiSendResult> {
  const cfg = await getConfig();
  if (!cfg) return mockWarn("sendImage");
  try {
    const res = await post(
      endpoint(cfg, "send-image"),
      { phone: formatPhoneForZapi(phone), image: imageUrl, caption },
      cfg.clientToken
    );
    return await handle(res, "send-image failed");
  } catch (err) {
    console.error("[Z-API] sendImage network error:", err);
    return { messageId: "", status: "failed", error: err instanceof Error ? err.message : "network" };
  }
}

export async function isZapiConfigured(): Promise<boolean> {
  return (await getConfig()) !== null;
}
