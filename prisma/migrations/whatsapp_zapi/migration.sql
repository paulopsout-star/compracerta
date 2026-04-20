-- Migration: WhatsApp conversacional (Z-API) — spec prompt-final-whatsapp-compra-certa.md
-- Aplicar no Supabase Studio SQL Editor. Idempotente: usa IF NOT EXISTS em tudo.
--
-- Cria:
--   3 enums novos
--   7 tabelas novas + índices + FKs
-- NÃO altera tabelas existentes (users, wishes, offers, matches, notifications etc.)

-- ======================================================================
-- ENUMS
-- ======================================================================

DO $$ BEGIN
  CREATE TYPE "ConversationState" AS ENUM (
    'idle', 'collecting_wish', 'confirming', 'viewing_status',
    'viewing_matches', 'editing_field', 'getting_help', 'waiting_feedback'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InboundContentType" AS ENUM ('text', 'audio', 'image', 'button', 'list', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OutboundStatus" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ======================================================================
-- conversation_sessions
-- ======================================================================

CREATE TABLE IF NOT EXISTS "conversation_sessions" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "seller_id"       TEXT,
  "phone_e164"      VARCHAR(32) NOT NULL,
  "state"           "ConversationState" NOT NULL DEFAULT 'idle',
  "current_intent"  VARCHAR(50),
  "draft_wish"      JSONB,
  "context"         JSONB,
  "last_message_at" TIMESTAMPTZ NOT NULL,
  "expires_at"      TIMESTAMPTZ NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "conversation_sessions_phone_e164_idx"  ON "conversation_sessions" ("phone_e164");
CREATE INDEX IF NOT EXISTS "conversation_sessions_seller_id_idx"   ON "conversation_sessions" ("seller_id");
CREATE INDEX IF NOT EXISTS "conversation_sessions_expires_at_idx"  ON "conversation_sessions" ("expires_at");

-- ======================================================================
-- whatsapp_inbound_messages
-- ======================================================================

CREATE TABLE IF NOT EXISTS "whatsapp_inbound_messages" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "provider_message_id"  VARCHAR(100) NOT NULL UNIQUE,
  "phone_e164"           VARCHAR(32) NOT NULL,
  "seller_id"            TEXT,
  "content_type"         "InboundContentType" NOT NULL DEFAULT 'text',
  "content"              TEXT,
  "media_url"            TEXT,
  "raw_payload"          JSONB,
  "received_at"          TIMESTAMPTZ NOT NULL,
  "processed_at"         TIMESTAMPTZ,
  "session_id"           TEXT,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "whatsapp_inbound_messages_phone_e164_idx"   ON "whatsapp_inbound_messages" ("phone_e164");
CREATE INDEX IF NOT EXISTS "whatsapp_inbound_messages_received_at_idx"  ON "whatsapp_inbound_messages" ("received_at");
CREATE INDEX IF NOT EXISTS "whatsapp_inbound_messages_seller_id_idx"    ON "whatsapp_inbound_messages" ("seller_id");

DO $$ BEGIN
  ALTER TABLE "whatsapp_inbound_messages"
    ADD CONSTRAINT "whatsapp_inbound_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ======================================================================
-- whatsapp_outbound_messages
-- ======================================================================

CREATE TABLE IF NOT EXISTS "whatsapp_outbound_messages" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "phone_e164"           VARCHAR(32) NOT NULL,
  "recipient_id"         TEXT,
  "recipient_type"       VARCHAR(20),
  "template_name"        VARCHAR(80),
  "payload"              JSONB,
  "provider_message_id"  VARCHAR(100),
  "status"               "OutboundStatus" NOT NULL DEFAULT 'pending',
  "failure_reason"       TEXT,
  "sent_at"              TIMESTAMPTZ,
  "delivered_at"         TIMESTAMPTZ,
  "read_at"              TIMESTAMPTZ,
  "retry_count"          INTEGER NOT NULL DEFAULT 0,
  "next_retry_at"        TIMESTAMPTZ,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "whatsapp_outbound_messages_phone_e164_idx"          ON "whatsapp_outbound_messages" ("phone_e164");
CREATE INDEX IF NOT EXISTS "whatsapp_outbound_messages_status_idx"              ON "whatsapp_outbound_messages" ("status");
CREATE INDEX IF NOT EXISTS "whatsapp_outbound_messages_provider_message_id_idx" ON "whatsapp_outbound_messages" ("provider_message_id");

-- ======================================================================
-- match_groups
-- ======================================================================

CREATE TABLE IF NOT EXISTS "match_groups" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "wish_id"       TEXT NOT NULL,
  "seller_id"     TEXT NOT NULL,
  "matches"       JSONB NOT NULL,
  "current_index" INTEGER NOT NULL DEFAULT 0,
  "expires_at"    TIMESTAMPTZ NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "match_groups_seller_id_idx"  ON "match_groups" ("seller_id");
CREATE INDEX IF NOT EXISTS "match_groups_wish_id_idx"    ON "match_groups" ("wish_id");
CREATE INDEX IF NOT EXISTS "match_groups_expires_at_idx" ON "match_groups" ("expires_at");

-- ======================================================================
-- feature_flags
-- ======================================================================

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "key"         VARCHAR(100) PRIMARY KEY,
  "enabled"     BOOLEAN NOT NULL DEFAULT FALSE,
  "value"       JSONB,
  "description" TEXT,
  "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
  "updated_by"  TEXT,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================
-- feature_flag_history
-- ======================================================================

CREATE TABLE IF NOT EXISTS "feature_flag_history" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "flag_key"   VARCHAR(100) NOT NULL,
  "old_value"  JSONB,
  "new_value"  JSONB,
  "changed_by" TEXT,
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reason"     TEXT
);

CREATE INDEX IF NOT EXISTS "feature_flag_history_flag_key_idx"   ON "feature_flag_history" ("flag_key");
CREATE INDEX IF NOT EXISTS "feature_flag_history_changed_at_idx" ON "feature_flag_history" ("changed_at");

-- ======================================================================
-- wish_rate_counters
-- ======================================================================

CREATE TABLE IF NOT EXISTS "wish_rate_counters" (
  "seller_id" TEXT NOT NULL,
  "date"      DATE NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("seller_id", "date")
);

-- ======================================================================
-- Seed das 28 feature flags (idempotente — não sobrescreve valores existentes)
-- ======================================================================

INSERT INTO "feature_flags" ("key", "enabled", "value", "description", "environment") VALUES
  ('whatsapp.inbound.enabled',                      TRUE,  NULL, 'Recebimento de mensagens WhatsApp', 'production'),
  ('whatsapp.outbound.enabled',                     TRUE,  NULL, 'Envio de mensagens WhatsApp', 'production'),
  ('whatsapp.zapi.enabled',                         TRUE,  NULL, 'Usa Z-API como provedor (fallback: Meta Cloud)', 'production'),
  ('whatsapp.shadow_mode',                          FALSE, NULL, 'Processa sem enviar resposta (QA)', 'production'),
  ('conversation.llm.enabled',                      TRUE,  NULL, 'Usa LLM para extração', 'production'),
  ('conversation.llm.provider',                     TRUE,  '"claude"'::jsonb, 'claude | openai | auto', 'production'),
  ('conversation.llm.model',                        TRUE,  '"claude-sonnet-4-5"'::jsonb, 'Modelo do LLM', 'production'),
  ('conversation.audio_transcription.enabled',      FALSE, NULL, 'Transcrição de áudios (Whisper)', 'production'),
  ('conversation.image_recognition.enabled',        FALSE, NULL, 'Reconhecimento de fotos', 'production'),
  ('conversation.session_timeout_minutes',          TRUE,  '30'::jsonb, 'Timeout de sessão (minutos)', 'production'),
  ('conversation.draft_expiration_hours',           TRUE,  '24'::jsonb, 'Validade do rascunho (horas)', 'production'),
  ('wish.creation.enabled',                         TRUE,  NULL, 'Criação de novos desejos', 'production'),
  ('wish.duplicate_detection.enabled',              TRUE,  NULL, 'Detecção de duplicatas', 'production'),
  ('wish.max_per_seller_per_day',                   TRUE,  '20'::jsonb, 'Limite diário', 'production'),
  ('wish.require_client_consent',                   TRUE,  NULL, 'LGPD — não desligar em prod', 'production'),
  ('match.auto_notify.enabled',                     TRUE,  NULL, 'Notificação automática de match', 'production'),
  ('match.notify_origin_manager.enabled',           TRUE,  NULL, 'Notifica gestor de origem', 'production'),
  ('match.min_score_threshold',                     TRUE,  '70'::jsonb, 'Score mínimo (0-100)', 'production'),
  ('match.max_alternatives',                        TRUE,  '10'::jsonb, 'Máx alternativas por grupo', 'production'),
  ('notification.window_start_hour',                TRUE,  '7'::jsonb,  'Início janela envio (BRT)', 'production'),
  ('notification.window_end_hour',                  TRUE,  '22'::jsonb, 'Fim janela envio (BRT)', 'production'),
  ('notification.urgency_override_window',          TRUE,  NULL, 'Urgência alta ignora janela', 'production'),
  ('notification.email_fallback.enabled',           TRUE,  NULL, 'Fallback por e-mail', 'production'),
  ('feedback.conversion_check.enabled',             TRUE,  NULL, 'Pergunta D+3 pós match', 'production'),
  ('rate_limit.inbound_per_min_per_user',           TRUE,  '10'::jsonb, 'Msgs/min recebidas por usuário', 'production'),
  ('rate_limit.outbound_per_min_global',            TRUE,  '60'::jsonb, 'Msgs/min global envio', 'production'),
  ('logging.verbose.enabled',                       FALSE, NULL, 'Logs detalhados', 'production'),
  ('maintenance_mode.enabled',                      FALSE, NULL, 'Modo manutenção', 'production')
ON CONFLICT ("key") DO NOTHING;
