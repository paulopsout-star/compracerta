/**
 * CRUD de sessão de conversa — spec seção 6 (conversation_sessions).
 *
 * Sessão é criada na primeira mensagem de um vendedor identificado.
 * Timeout configurável via flag conversation.session_timeout_minutes (default 30).
 * Rascunho (draft_wish) persiste por conversation.draft_expiration_hours após
 * expiração (default 24h).
 */

import { supabase } from "@/lib/db";
import { getNumber } from "@/lib/feature-flags";

export type SessionState =
  | "idle"
  | "collecting_wish"
  | "confirming"
  | "viewing_status"
  | "viewing_matches"
  | "editing_field"
  | "getting_help"
  | "waiting_feedback";

export interface ConversationSessionRow {
  id: string;
  sellerId: string | null;
  phoneE164: string;
  state: SessionState;
  currentIntent: string | null;
  draftWish: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  lastMessageAt: Date;
  expiresAt: Date;
}

function rowToSession(r: Record<string, unknown>): ConversationSessionRow {
  return {
    id: r.id as string,
    sellerId: (r.seller_id as string | null) ?? null,
    phoneE164: r.phone_e164 as string,
    state: r.state as SessionState,
    currentIntent: (r.current_intent as string | null) ?? null,
    draftWish: (r.draft_wish as Record<string, unknown> | null) ?? null,
    context: (r.context as Record<string, unknown> | null) ?? null,
    lastMessageAt: new Date(r.last_message_at as string),
    expiresAt: new Date(r.expires_at as string),
  };
}

async function computeExpiresAt(): Promise<Date> {
  const minutes = await getNumber("conversation.session_timeout_minutes", 30);
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/**
 * Retorna sessão ativa (não expirada) para o telefone, se existir.
 */
export async function getActiveSession(phoneE164: string): Promise<ConversationSessionRow | null> {
  const { data } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("phone_e164", phoneE164)
    .gt("expires_at", new Date().toISOString())
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? rowToSession(data) : null;
}

/**
 * Retorna a sessão mais recente (mesmo expirada) — usado para detectar
 * rascunho de retomada dentro da janela draft_expiration_hours.
 */
export async function getLatestSession(phoneE164: string): Promise<ConversationSessionRow | null> {
  const { data } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("phone_e164", phoneE164)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? rowToSession(data) : null;
}

export async function createSession(params: {
  sellerId: string | null;
  phoneE164: string;
  state?: SessionState;
  draftWish?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}): Promise<ConversationSessionRow> {
  const expiresAt = await computeExpiresAt();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversation_sessions")
    .insert({
      seller_id: params.sellerId,
      phone_e164: params.phoneE164,
      state: params.state ?? "idle",
      draft_wish: params.draftWish ?? null,
      context: params.context ?? null,
      last_message_at: now,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSession(data);
}

export async function touchSession(id: string, patch?: Partial<{
  state: SessionState;
  currentIntent: string | null;
  draftWish: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}>): Promise<ConversationSessionRow> {
  const expiresAt = await computeExpiresAt();
  const update: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  };
  if (patch?.state !== undefined) update.state = patch.state;
  if (patch?.currentIntent !== undefined) update.current_intent = patch.currentIntent;
  if (patch?.draftWish !== undefined) update.draft_wish = patch.draftWish;
  if (patch?.context !== undefined) update.context = patch.context;

  const { data, error } = await supabase
    .from("conversation_sessions")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToSession(data);
}

export async function getOrCreateActiveSession(sellerId: string | null, phoneE164: string): Promise<ConversationSessionRow> {
  const existing = await getActiveSession(phoneE164);
  if (existing) return existing;
  return createSession({ sellerId, phoneE164 });
}
