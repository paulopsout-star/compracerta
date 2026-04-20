-- Fix: adiciona DEFAULT gen_random_uuid()::text nas colunas id das 5 tabelas
-- novas que usam PK gerada. O SQL original criou as colunas sem default,
-- fazendo inserts via supabase-js (que não passa id) falharem com NOT NULL.
--
-- Idempotente: ALTER COLUMN SET DEFAULT pode rodar várias vezes.
-- Aplicar no Supabase Studio SQL Editor.

ALTER TABLE "conversation_sessions"        ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "whatsapp_inbound_messages"    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "whatsapp_outbound_messages"   ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "match_groups"                 ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "feature_flag_history"         ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
