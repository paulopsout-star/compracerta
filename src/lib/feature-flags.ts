import { supabase } from "@/lib/db";

export type FlagValue = boolean | number | string | null | Record<string, unknown> | unknown[];

export interface FeatureFlagRecord {
  key: string;
  enabled: boolean;
  value: FlagValue;
  description?: string | null;
  environment: string;
}

/**
 * Defaults — copiados do prompt-final (seção 13). Fonte de verdade quando
 * o banco ainda não foi semeado ou quando há falha de conexão.
 */
export const FEATURE_FLAG_DEFAULTS: Record<string, { enabled: boolean; value?: FlagValue; description: string }> = {
  // Canal e integração
  "whatsapp.inbound.enabled":            { enabled: true,  description: "Recebimento de mensagens WhatsApp" },
  "whatsapp.outbound.enabled":           { enabled: true,  description: "Envio de mensagens WhatsApp" },
  "whatsapp.zapi.enabled":               { enabled: true,  description: "Usa Z-API como provedor (fallback: Meta Cloud)" },
  "whatsapp.shadow_mode":                { enabled: false, description: "Processa sem enviar resposta (QA)" },

  // Conversação
  "conversation.llm.enabled":            { enabled: true,  description: "Usa LLM para extração" },
  "conversation.llm.provider":           { enabled: true,  value: "claude", description: "claude | openai | auto" },
  "conversation.llm.model":              { enabled: true,  value: "claude-sonnet-4-5", description: "Modelo do LLM" },
  "conversation.audio_transcription.enabled": { enabled: false, description: "Transcrição de áudios (Whisper)" },
  "conversation.image_recognition.enabled":   { enabled: false, description: "Reconhecimento de fotos" },
  "conversation.session_timeout_minutes":     { enabled: true, value: 30, description: "Timeout de sessão (minutos)" },
  "conversation.draft_expiration_hours":      { enabled: true, value: 24, description: "Validade do rascunho (horas)" },

  // Cadastro
  "wish.creation.enabled":               { enabled: true,  description: "Criação de novos desejos" },
  "wish.duplicate_detection.enabled":    { enabled: true,  description: "Detecção de duplicatas semânticas" },
  "wish.max_per_seller_per_day":         { enabled: true,  value: 20, description: "Limite diário de desejos por vendedor" },
  "wish.require_client_consent":         { enabled: true,  description: "LGPD — não desligar em prod" },

  // Matching e notificação
  "match.auto_notify.enabled":           { enabled: true,  description: "Notificação automática de match" },
  "match.notify_origin_manager.enabled": { enabled: true,  description: "Notifica gestor de origem" },
  "match.min_score_threshold":           { enabled: true,  value: 70, description: "Score mínimo (0-100) para notificar" },
  "match.max_alternatives":              { enabled: true,  value: 10, description: "Máximo guardado por match group" },
  "notification.window_start_hour":      { enabled: true,  value: 7,  description: "Início da janela de envio (fuso BRT)" },
  "notification.window_end_hour":        { enabled: true,  value: 22, description: "Fim da janela de envio (fuso BRT)" },
  "notification.urgency_override_window":{ enabled: true,  description: "Urgência alta ignora janela" },
  "notification.email_fallback.enabled": { enabled: true,  description: "Fallback por e-mail" },
  "feedback.conversion_check.enabled":   { enabled: true,  description: "Pergunta D+3 pós match" },

  // Operacional
  "rate_limit.inbound_per_min_per_user": { enabled: true, value: 10, description: "Mensagens/min recebidas por usuário" },
  "rate_limit.outbound_per_min_global":  { enabled: true, value: 60, description: "Mensagens/min enviadas global" },
  "logging.verbose.enabled":             { enabled: false, description: "Logs detalhados" },
  "maintenance_mode.enabled":            { enabled: false, description: "Modo manutenção" },
};

type CacheEntry = { record: FeatureFlagRecord; cachedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function defaultFor(key: string): FeatureFlagRecord {
  const d = FEATURE_FLAG_DEFAULTS[key];
  if (!d) return { key, enabled: false, value: null, environment: "production" };
  return { key, enabled: d.enabled, value: d.value ?? null, description: d.description, environment: "production" };
}

async function loadFromDb(key: string): Promise<FeatureFlagRecord | null> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, value, description, environment")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return data as FeatureFlagRecord;
  } catch {
    return null;
  }
}

export async function getFlag(key: string): Promise<FeatureFlagRecord> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.record;

  const record = (await loadFromDb(key)) ?? defaultFor(key);
  cache.set(key, { record, cachedAt: Date.now() });
  return record;
}

export async function isEnabled(key: string): Promise<boolean> {
  return (await getFlag(key)).enabled;
}

export async function getValue<T extends FlagValue = FlagValue>(key: string): Promise<T> {
  const { value } = await getFlag(key);
  return value as T;
}

export async function getNumber(key: string, fallback: number): Promise<number> {
  const v = await getValue<FlagValue>(key);
  return typeof v === "number" ? v : fallback;
}

export async function getString(key: string, fallback: string): Promise<string> {
  const v = await getValue<FlagValue>(key);
  return typeof v === "string" ? v : fallback;
}

export function invalidateCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
