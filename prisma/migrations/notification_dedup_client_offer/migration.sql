-- notification_dedup_client_offer
--
-- Corrige recorrencia de alertas WhatsApp para o mesmo vendedor + mesmo
-- cliente + mesma oferta. A chave anterior usava wish_id; se o desejo era
-- recriado/editado ou o match era recriado, o vendedor podia receber o mesmo
-- veiculo de novo para o mesmo cliente.
--
-- Aplicar no Supabase Studio SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "notification_dedup"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "client_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "dedup_key" TEXT;

-- Normaliza telefone BR para reduzir variacoes de mascara/+55.
CREATE OR REPLACE FUNCTION "notification_client_phone_key"(raw_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_phone IS NULL OR regexp_replace(raw_phone, '\D', '', 'g') = '' THEN 'unknown'
    WHEN length(regexp_replace(raw_phone, '\D', '', 'g')) IN (12, 13)
      AND left(regexp_replace(raw_phone, '\D', '', 'g'), 2) = '55'
      THEN regexp_replace(raw_phone, '\D', '', 'g')
    WHEN length(regexp_replace(raw_phone, '\D', '', 'g')) IN (10, 11)
      THEN '55' || regexp_replace(raw_phone, '\D', '', 'g')
    ELSE regexp_replace(raw_phone, '\D', '', 'g')
  END;
$$;

CREATE OR REPLACE FUNCTION "notification_match_dedup_key"(
  tenant_id TEXT,
  recipient_id TEXT,
  client_phone TEXT,
  offer_source TEXT,
  offer_source_id TEXT,
  channel TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      concat_ws(
        '|',
        coalesce(tenant_id, 'default'),
        coalesce(recipient_id, ''),
        notification_client_phone_key(client_phone),
        lower(coalesce(offer_source, '')),
        lower(coalesce(offer_source_id, '')),
        lower(coalesce(channel, 'whatsapp'))
      ),
      'sha256'
    ),
    'hex'
  );
$$;

-- Backfill a partir do historico confiavel de notifications -> matches -> wishes -> offers.
UPDATE "notification_dedup" nd
SET
  tenant_id = COALESCE(nd.tenant_id, w.tenant_id),
  client_phone = COALESCE(nd.client_phone, w.client_phone),
  dedup_key = COALESCE(
    nd.dedup_key,
    notification_match_dedup_key(
      COALESCE(nd.tenant_id, w.tenant_id),
      nd.recipient_id,
      w.client_phone,
      nd.offer_source,
      nd.offer_source_id,
      nd.channel
    )
  )
FROM "wishes" w
WHERE w.id = nd.wish_id;

-- Backfill complementar: garante slots para notificacoes antigas que talvez
-- nao tenham entrado na migration anterior.
INSERT INTO "notification_dedup" (
  tenant_id,
  wish_id,
  offer_source,
  offer_source_id,
  channel,
  recipient_id,
  match_id,
  client_phone,
  dedup_key,
  first_notified_at
)
SELECT DISTINCT ON (
  notification_match_dedup_key(
    w.tenant_id,
    n.recipient_id,
    w.client_phone,
    o.source::text,
    o.source_id,
    n.channel::text
  )
)
  w.tenant_id,
  m.wish_id,
  o.source::text,
  o.source_id,
  n.channel::text,
  n.recipient_id,
  n.match_id,
  w.client_phone,
  notification_match_dedup_key(
    w.tenant_id,
    n.recipient_id,
    w.client_phone,
    o.source::text,
    o.source_id,
    n.channel::text
  ),
  COALESCE(n.sent_at, n.created_at)
FROM notifications n
JOIN matches m ON m.id = n.match_id
JOIN wishes w ON w.id = m.wish_id
JOIN offers o ON o.id = m.offer_id
WHERE n.channel = 'whatsapp'
  AND n.template = 'match_encontrado'
  AND n.status IN ('enviado', 'entregue', 'lido', 'respondido', 'pendente')
ORDER BY
  notification_match_dedup_key(
    w.tenant_id,
    n.recipient_id,
    w.client_phone,
    o.source::text,
    o.source_id,
    n.channel::text
  ),
  COALESCE(n.sent_at, n.created_at) ASC
ON CONFLICT DO NOTHING;

-- Se o problema ja aconteceu, podem existir varias linhas antigas que agora
-- colapsam na mesma dedup_key. Mantem a primeira e remove duplicadas.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY dedup_key
      ORDER BY first_notified_at ASC, id ASC
    ) AS rn
  FROM "notification_dedup"
  WHERE dedup_key IS NOT NULL
)
DELETE FROM "notification_dedup" nd
USING ranked r
WHERE nd.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_dedup_dedup_key_unique"
  ON "notification_dedup" ("dedup_key");

CREATE INDEX IF NOT EXISTS "notification_dedup_client_phone_idx"
  ON "notification_dedup" ("client_phone");

CREATE INDEX IF NOT EXISTS "notification_dedup_tenant_recipient_client_idx"
  ON "notification_dedup" ("tenant_id", "recipient_id", "client_phone");
