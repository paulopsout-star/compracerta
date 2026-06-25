-- Feature: fotos das ofertas do Avaliador Digital com placa coberta.
--
-- A API publica do Avaliador retorna um array `imagens` por veiculo. Capturamos
-- as URLs (http) na ingestao, mas NAO baixamos nada inline (serverless). Esta
-- tabela e a fila duravel: o worker self-hosted (services/plate-redactor) faz
-- poll de status='pending', baixa, detecta+cobre a placa (ou esconde a foto na
-- duvida), sobe a versao tratada pro Supabase Storage e marca 'done'/'hidden'.
--
-- IMPORTANTE: `source_url` (URL crua do Avaliador) e o caminho do Storage NUNCA
-- sao expostos ao frontend junto de placa. O read path serve so status='done'.
--
-- Padrao idempotente (igual add_tenant_id_to_matches). Id com DEFAULT pois os
-- inserts vem via supabase-js (sem Prisma) — ver whatsapp_zapi/fix-id-defaults.sql.
--
-- Aplicada em prod (projeto compracerta / xqwbgcblyyfqwjuwqvjf) via Supabase MCP
-- em 2026-06-24. Bucket publico `offer-images` criado no mesmo passo.

DO $$
DECLARE
  default_tenant_id TEXT;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'compra-certa';
  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant default compra-certa nao encontrado — abortando';
  END IF;

  CREATE TABLE IF NOT EXISTS offer_images (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id             TEXT NOT NULL,
    offer_id              TEXT NOT NULL,
    source_url            TEXT NOT NULL,
    is_capa               BOOLEAN NOT NULL DEFAULT false,
    position              INTEGER NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'pending',
    action                TEXT,
    has_plate             BOOLEAN,
    detection_confidence  DOUBLE PRECISION,
    storage_path          TEXT,
    attempts              INTEGER NOT NULL DEFAULT 0,
    last_error            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at          TIMESTAMPTZ
  );

  -- Backfill defensivo do default (no-op em tabela nova; util se recriada).
  EXECUTE format('ALTER TABLE offer_images ALTER COLUMN tenant_id SET DEFAULT %L', default_tenant_id);
END $$;

-- status: pending | processing | done | hidden | error
DO $$ BEGIN
  ALTER TABLE offer_images
    ADD CONSTRAINT offer_images_status_check
    CHECK (status IN ('pending','processing','done','hidden','error'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- action: blurred | clean | hidden  (null enquanto nao processado)
DO $$ BEGIN
  ALTER TABLE offer_images
    ADD CONSTRAINT offer_images_action_check
    CHECK (action IS NULL OR action IN ('blurred','clean','hidden'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE offer_images
    ADD CONSTRAINT offer_images_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE offer_images
    ADD CONSTRAINT offer_images_offer_id_fkey
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Idempotencia da ingestao: a mesma foto da mesma oferta nunca e re-enfileirada.
DO $$ BEGIN
  ALTER TABLE offer_images
    ADD CONSTRAINT offer_images_offer_id_source_url_key UNIQUE (offer_id, source_url);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Poll do worker (pega pending) e read path (fotos por oferta).
CREATE INDEX IF NOT EXISTS offer_images_status_idx ON offer_images (status);
CREATE INDEX IF NOT EXISTS offer_images_offer_id_idx ON offer_images (offer_id);
CREATE INDEX IF NOT EXISTS offer_images_tenant_id_idx ON offer_images (tenant_id);
