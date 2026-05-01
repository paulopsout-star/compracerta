-- Multiempresa + white label
--
-- Aplicar no Supabase Studio SQL Editor.
-- Idempotente: usa IF NOT EXISTS, checks em information_schema e backfill.
--
-- Objetivo:
--   1) Criar um tenant raiz para isolar dados por empresa/marca.
--   2) Guardar identidade visual, dominio e configuracoes por tenant.
--   3) Adicionar tenant_id nas tabelas operacionais atuais.
--   4) Fazer backfill dos dados existentes para um tenant padrao.
--
-- Proximos passos no app:
--   - Resolver tenant por host/header em proxy.ts.
--   - Incluir tenant_id em sessoes/JWT.
--   - Filtrar todas as queries por tenant_id.
--   - Carregar branding no layout/login a partir do tenant resolvido.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ======================================================================
-- tenants
-- ======================================================================

CREATE TABLE IF NOT EXISTS "tenants" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL,
  "legal_name"     TEXT,
  "cnpj"           TEXT UNIQUE,
  "slug"           TEXT NOT NULL UNIQUE,
  "primary_domain" TEXT UNIQUE,
  "support_email"  TEXT,
  "support_phone"  TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata"       JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "tenants_active_idx" ON "tenants" ("active");
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug");

-- ======================================================================
-- tenant_branding
-- ======================================================================

CREATE TABLE IF NOT EXISTS "tenant_branding" (
  "tenant_id"             TEXT PRIMARY KEY,
  "app_name"              TEXT NOT NULL DEFAULT 'Compra Certa',
  "tagline"               TEXT,
  "logo_url"              TEXT,
  "logo_dark_url"         TEXT,
  "favicon_url"           TEXT,
  "login_background_url"  TEXT,
  "primary_color"         TEXT NOT NULL DEFAULT '#2563EB',
  "secondary_color"       TEXT NOT NULL DEFAULT '#111827',
  "accent_color"          TEXT NOT NULL DEFAULT '#10B981',
  "sidebar_primary_color" TEXT NOT NULL DEFAULT '#2563EB',
  "font_family"           TEXT NOT NULL DEFAULT 'Inter',
  "custom_css"            TEXT,
  "terms_url"             TEXT,
  "privacy_url"           TEXT,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE "tenant_branding"
    ADD CONSTRAINT "tenant_branding_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tenant_branding"
    ADD CONSTRAINT "tenant_branding_primary_color_check"
    CHECK ("primary_color" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tenant_branding"
    ADD CONSTRAINT "tenant_branding_secondary_color_check"
    CHECK ("secondary_color" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tenant_branding"
    ADD CONSTRAINT "tenant_branding_accent_color_check"
    CHECK ("accent_color" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ======================================================================
-- tenant_domains
-- ======================================================================

CREATE TABLE IF NOT EXISTS "tenant_domains" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id"   TEXT NOT NULL,
  "domain"      TEXT NOT NULL UNIQUE,
  "verified"    BOOLEAN NOT NULL DEFAULT FALSE,
  "is_primary"  BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "verified_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "tenant_domains_tenant_id_idx" ON "tenant_domains" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_domains_domain_idx" ON "tenant_domains" ("domain");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_domains_one_primary_per_tenant_idx"
  ON "tenant_domains" ("tenant_id")
  WHERE "is_primary" = TRUE;

DO $$ BEGIN
  ALTER TABLE "tenant_domains"
    ADD CONSTRAINT "tenant_domains_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ======================================================================
-- tenant_feature_flags
-- ======================================================================
-- Mantem "feature_flags" como defaults globais e permite override por tenant.

CREATE TABLE IF NOT EXISTS "tenant_feature_flags" (
  "tenant_id"   TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT FALSE,
  "value"       JSONB,
  "description" TEXT,
  "updated_by"  TEXT,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("tenant_id", "key")
);

CREATE INDEX IF NOT EXISTS "tenant_feature_flags_key_idx"
  ON "tenant_feature_flags" ("key");

DO $$ BEGIN
  ALTER TABLE "tenant_feature_flags"
    ADD CONSTRAINT "tenant_feature_flags_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "tenant_feature_flag_history" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id"  TEXT NOT NULL,
  "flag_key"   TEXT NOT NULL,
  "old_value"  JSONB,
  "new_value"  JSONB,
  "changed_by" TEXT,
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reason"     TEXT
);

CREATE INDEX IF NOT EXISTS "tenant_feature_flag_history_tenant_id_idx"
  ON "tenant_feature_flag_history" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_feature_flag_history_flag_key_idx"
  ON "tenant_feature_flag_history" ("flag_key");

DO $$ BEGIN
  ALTER TABLE "tenant_feature_flag_history"
    ADD CONSTRAINT "tenant_feature_flag_history_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ======================================================================
-- Backfill: tenant padrao para dados existentes
-- ======================================================================

INSERT INTO "tenants" ("name", "legal_name", "slug", "active", "metadata")
VALUES (
  'Compra Certa',
  'Compra Certa',
  'compra-certa',
  TRUE,
  '{"source":"migration:multi_company_white_label","defaultTenant":true}'::jsonb
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "tenant_branding" (
  "tenant_id",
  "app_name",
  "tagline",
  "primary_color",
  "secondary_color",
  "accent_color",
  "sidebar_primary_color"
)
SELECT
  t.id,
  'Compra Certa',
  'Canal do Repasse',
  '#2563EB',
  '#111827',
  '#10B981',
  '#2563EB'
FROM "tenants" t
WHERE t.slug = 'compra-certa'
ON CONFLICT ("tenant_id") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'feature_flags'
  ) THEN
    INSERT INTO "tenant_feature_flags" (
      "tenant_id",
      "key",
      "enabled",
      "value",
      "description",
      "updated_by"
    )
    SELECT
      t.id,
      f.key,
      f.enabled,
      f.value,
      f.description,
      'migration:multi_company_white_label'
    FROM "tenants" t
    JOIN "feature_flags" f ON TRUE
    WHERE t.slug = 'compra-certa'
    ON CONFLICT ("tenant_id", "key") DO NOTHING;
  END IF;
END $$;

-- ======================================================================
-- tenant_id nas tabelas existentes
-- ======================================================================

DO $$
DECLARE
  default_tenant_id TEXT;
  current_table TEXT;
  tables TEXT[] := ARRAY[
    'users',
    'dealerships',
    'dealer_stores',
    'wishes',
    'offers',
    'notifications',
    'notification_dedup',
    'stock_uploads',
    'audit_logs',
    'conversation_sessions',
    'whatsapp_inbound_messages',
    'whatsapp_outbound_messages',
    'match_groups',
    'wish_rate_counters'
  ];
BEGIN
  SELECT id INTO default_tenant_id FROM "tenants" WHERE slug = 'compra-certa';

  FOREACH current_table IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = current_table
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = current_table
          AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id TEXT', current_table);
      END IF;

      EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', current_table)
      USING default_tenant_id;

      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L', current_table, default_tenant_id);

      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', current_table || '_tenant_id_idx', current_table);
    END IF;
  END LOOP;
END $$;

-- FKs de tenant_id. Mantidas em bloco separado para tolerar tabelas que
-- ainda nao existam em ambientes parciais.
DO $$
DECLARE
  current_table TEXT;
  tables TEXT[] := ARRAY[
    'users',
    'dealerships',
    'dealer_stores',
    'wishes',
    'offers',
    'notifications',
    'notification_dedup',
    'stock_uploads',
    'audit_logs',
    'conversation_sessions',
    'whatsapp_inbound_messages',
    'whatsapp_outbound_messages',
    'match_groups',
    'wish_rate_counters'
  ];
BEGIN
  FOREACH current_table IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = current_table
        AND column_name = 'tenant_id'
    ) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE',
          current_table,
          current_table || '_tenant_id_fkey'
        );
      EXCEPTION WHEN duplicate_object THEN
        null;
      END;
    END IF;
  END LOOP;
END $$;

-- Depois do backfill e das FKs, tenant_id passa a ser obrigatorio nas
-- tabelas operacionais. Novas escritas da aplicacao devem informar tenant_id.
DO $$
DECLARE
  current_table TEXT;
  tables TEXT[] := ARRAY[
    'users',
    'dealerships',
    'dealer_stores',
    'wishes',
    'offers',
    'notifications',
    'notification_dedup',
    'stock_uploads',
    'audit_logs',
    'conversation_sessions',
    'whatsapp_inbound_messages',
    'whatsapp_outbound_messages',
    'match_groups',
    'wish_rate_counters'
  ];
BEGIN
  FOREACH current_table IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = current_table
        AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', current_table);
    END IF;
  END LOOP;
END $$;

-- ======================================================================
-- Unicidade por tenant
-- ======================================================================
-- As constraints globais antigas continuam existindo. Estes indices preparam
-- a aplicacao para, numa etapa posterior, trocar unicidade global por
-- unicidade escopada sem perder integridade.

CREATE UNIQUE INDEX IF NOT EXISTS "dealerships_tenant_cnpj_unique"
  ON "dealerships" ("tenant_id", "cnpj");

CREATE UNIQUE INDEX IF NOT EXISTS "dealer_stores_tenant_cnpj_unique"
  ON "dealer_stores" ("tenant_id", "cnpj");

CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_email_unique"
  ON "users" ("tenant_id", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "offers_tenant_source_source_id_unique"
  ON "offers" ("tenant_id", "source", "source_id");

-- ======================================================================
-- Helpers de resolucao
-- ======================================================================

CREATE OR REPLACE VIEW "tenant_public_config" AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.primary_domain,
  t.support_email,
  t.support_phone,
  t.active,
  b.app_name,
  b.tagline,
  b.logo_url,
  b.logo_dark_url,
  b.favicon_url,
  b.login_background_url,
  b.primary_color,
  b.secondary_color,
  b.accent_color,
  b.sidebar_primary_color,
  b.font_family,
  b.terms_url,
  b.privacy_url
FROM "tenants" t
LEFT JOIN "tenant_branding" b ON b.tenant_id = t.id;

CREATE OR REPLACE FUNCTION "resolve_tenant_by_host"(host_name TEXT)
RETURNS TABLE (
  tenant_id TEXT,
  tenant_slug TEXT,
  tenant_name TEXT,
  app_name TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id,
    t.slug,
    t.name,
    COALESCE(b.app_name, t.name),
    COALESCE(b.primary_color, '#2563EB'),
    COALESCE(b.secondary_color, '#111827'),
    COALESCE(b.accent_color, '#10B981')
  FROM "tenants" t
  LEFT JOIN "tenant_branding" b ON b.tenant_id = t.id
  LEFT JOIN "tenant_domains" d ON d.tenant_id = t.id
  WHERE t.active = TRUE
    AND (
      lower(t.primary_domain) = lower(host_name)
      OR lower(d.domain) = lower(host_name)
      OR t.slug = split_part(lower(host_name), '.', 1)
    )
  ORDER BY
    CASE
      WHEN lower(t.primary_domain) = lower(host_name) THEN 0
      WHEN lower(d.domain) = lower(host_name) THEN 1
      ELSE 2
    END
  LIMIT 1;
$$;
