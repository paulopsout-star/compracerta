-- notification_dedup: chave estavel para idempotencia de match->vendedor.
--
-- Por que existe: o dedup antigo (notifications.match_id unique) quebra
-- quando a linha de matches eh deletada e recriada (cleanup de offer
-- ausente, edicao de wish via PUT /api/desejos/[id], etc) -> novo
-- match_id -> dedup nao acha registro -> vendedor recebe mesma oferta
-- de novo.
--
-- Esta tabela usa identidade externa estavel da oferta:
--   (wish_id, offer.source, offer.source_id, channel)
-- Sobrevive a recriacao de matches/offers desde que o provedor externo
-- (Avaliador) mantenha o mesmo source_id pra mesma oferta.
--
-- Aplicar no Supabase Studio SQL Editor.

CREATE TABLE IF NOT EXISTS "notification_dedup" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "wish_id"            text NOT NULL,
  "offer_source"       text NOT NULL,
  "offer_source_id"    text NOT NULL,
  "channel"            text NOT NULL DEFAULT 'whatsapp',
  "recipient_id"       text NOT NULL,
  "match_id"           text,
  "first_notified_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_dedup_unique"
  ON "notification_dedup" ("wish_id", "offer_source", "offer_source_id", "channel");

CREATE INDEX IF NOT EXISTS "notification_dedup_recipient_idx"
  ON "notification_dedup" ("recipient_id");

-- Cascade: deletou o desejo, vai junto.
ALTER TABLE "notification_dedup"
  DROP CONSTRAINT IF EXISTS "notification_dedup_wish_fk";
ALTER TABLE "notification_dedup"
  ADD CONSTRAINT "notification_dedup_wish_fk"
  FOREIGN KEY ("wish_id") REFERENCES "wishes" ("id") ON DELETE CASCADE;

-- Backfill: registra nas dedup todas as notificacoes whatsapp do template
-- match_encontrado ja enviadas (status diferente de 'erro'). Sem isso, o
-- proximo cron re-notificaria tudo que ja foi notificado historicamente.
INSERT INTO "notification_dedup"
  (wish_id, offer_source, offer_source_id, channel, recipient_id, match_id, first_notified_at)
SELECT DISTINCT ON (m.wish_id, o.source::text, o.source_id, n.channel::text)
  m.wish_id,
  o.source::text,
  o.source_id,
  n.channel::text,
  n.recipient_id,
  n.match_id,
  COALESCE(n.sent_at, n.created_at) AS first_notified_at
FROM notifications n
JOIN matches m ON m.id = n.match_id
JOIN offers o ON o.id = m.offer_id
WHERE n.channel = 'whatsapp'
  AND n.template = 'match_encontrado'
  AND n.status IN ('enviado', 'entregue', 'lido', 'respondido', 'pendente')
ORDER BY m.wish_id, o.source::text, o.source_id, n.channel::text, COALESCE(n.sent_at, n.created_at) ASC
ON CONFLICT ("wish_id", "offer_source", "offer_source_id", "channel") DO NOTHING;
