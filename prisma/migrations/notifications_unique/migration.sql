-- Garante no máximo 1 notificação "enviada" por (match_id, channel).
-- Linhas em status 'erro' ou 'pendente' podem duplicar (retry fica livre).
-- Aplicar no Supabase Studio SQL Editor.

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_match_channel_sent_unique"
  ON "notifications" ("match_id", "channel")
  WHERE "status" IN ('enviado', 'entregue', 'lido', 'respondido');
