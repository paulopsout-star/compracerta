-- Bug fix: a tabela `matches` foi esquecida do array de tabelas em
-- multi_company_white_label/migration.sql. Sem `tenant_id`, todos os UPSERTs
-- do PR2.2 que tentam gravar `tenant_id: scope.tenantId` em matches falham
-- silenciosamente com "column matches.tenant_id does not exist".
--
-- Esta migration adiciona a coluna seguindo a mesma estrategia: backfill via
-- wish.tenant_id (com fallback para tenant default), DEFAULT, NOT NULL, FK
-- com ON DELETE RESTRICT, index.
--
-- Aplicada em prod via Supabase MCP em 2026-05-12.

DO $$
DECLARE
  default_tenant_id TEXT;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'compra-certa';
  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant default compra-certa nao encontrado — abortando';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matches' AND column_name='tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE matches ADD COLUMN tenant_id TEXT';
  END IF;

  -- Backfill: deriva do wish; fallback para o tenant default.
  UPDATE matches m
  SET tenant_id = COALESCE(w.tenant_id, default_tenant_id)
  FROM wishes w
  WHERE m.wish_id = w.id AND m.tenant_id IS NULL;

  UPDATE matches SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  EXECUTE format('ALTER TABLE matches ALTER COLUMN tenant_id SET DEFAULT %L', default_tenant_id);
  EXECUTE 'ALTER TABLE matches ALTER COLUMN tenant_id SET NOT NULL';
END $$;

DO $$ BEGIN
  ALTER TABLE matches
    ADD CONSTRAINT matches_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS matches_tenant_id_idx ON matches (tenant_id);
