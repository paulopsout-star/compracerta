import { canalRepassePool, avaliadorPool, safeQuery } from "@/lib/db-sqlserver";
import type { Offer, Wish } from "@/types";

/**
 * Adapters that fetch vehicle offers from the external SQL Server databases
 * and map them to the internal Offer shape used by the matching engine.
 *
 * IMPORTANT: The queries below use PLACEHOLDER table/column names.
 * Once the DBA shares the real schemas, update the SELECT statements
 * and the mapping functions to match real columns.
 */

/* ─────────────────────────────────────────────────────────────
 * CANAL DO REPASSE — Marketplace
 * ─────────────────────────────────────────────────────────────
 * Expected source: table of active listings on the marketplace.
 * Typical columns: Id, Placa, Marca, Modelo, Versao, Ano, Km,
 * Cor, Preco, Cidade, Estado, Status, DataAtualizacao
 * ───────────────────────────────────────────────────────────── */

interface CanalRepasseRow {
  Id: string | number;
  Placa?: string | null;
  Marca: string;
  Modelo: string;
  Versao?: string | null;
  Ano: number;
  Km: number;
  Cor?: string | null;
  Preco: number;
  Cidade: string;
  Estado: string;
  DataAtualizacao?: Date | string;
}

function canalRepasseToOffer(row: CanalRepasseRow): Offer {
  return {
    id: `mp-${row.Id}`,
    source: "marketplace",
    sourceId: String(row.Id),
    plate: row.Placa ?? undefined,
    brand: row.Marca,
    model: row.Modelo,
    version: row.Versao ?? undefined,
    year: row.Ano,
    km: row.Km,
    color: row.Cor ?? undefined,
    price: row.Preco,
    city: row.Cidade,
    state: row.Estado,
    active: true,
    syncedAt: new Date(),
  };
}

export async function fetchCanalRepasseOffers(filter?: {
  brand?: string; model?: string; yearMin?: number; yearMax?: number; limit?: number;
}): Promise<Offer[]> {
  const pool = await canalRepassePool();
  if (!pool) return [];

  // ⚠️ PLACEHOLDER: adjust table name and WHERE clauses with real schema
  let query = `
    SELECT TOP ${filter?.limit ?? 500}
      Id, Placa, Marca, Modelo, Versao, Ano, Km, Cor, Preco,
      Cidade, Estado, DataAtualizacao
    FROM dbo.Anuncios
    WHERE Status = 'ativo'
  `;

  const params: Record<string, unknown> = {};
  if (filter?.brand) { query += ` AND Marca = @brand`; params.brand = filter.brand; }
  if (filter?.model) { query += ` AND Modelo = @model`; params.model = filter.model; }
  if (filter?.yearMin) { query += ` AND Ano >= @yearMin`; params.yearMin = filter.yearMin; }
  if (filter?.yearMax) { query += ` AND Ano <= @yearMax`; params.yearMax = filter.yearMax; }

  const rows = await safeQuery<CanalRepasseRow>(pool, query, params);
  return rows.map(canalRepasseToOffer);
}

/* ─────────────────────────────────────────────────────────────
 * AVALIADOR DIGITAL
 * ─────────────────────────────────────────────────────────────
 * Expected source: vehicles currently being evaluated at dealerships.
 * Typical tables: Veiculos_Avaliados + Avaliacoes (join)
 * ───────────────────────────────────────────────────────────── */

interface AvaliadorRow {
  Id: string | number;
  Placa?: string | null;
  Marca: string;
  Modelo: string;
  Versao?: string | null;
  Ano: number;
  Km: number;
  Cor?: string | null;
  PrecoEstimado: number;
  UnidadeCidade: string;
  UnidadeEstado: string;
  AvaliadorNome?: string | null;
  AvaliadorTelefone?: string | null;
  DataAvaliacao?: Date | string;
}

function avaliadorToOffer(row: AvaliadorRow): Offer {
  return {
    id: `av-${row.Id}`,
    source: "avaliador",
    sourceId: String(row.Id),
    plate: row.Placa ?? undefined,
    brand: row.Marca,
    model: row.Modelo,
    version: row.Versao ?? undefined,
    year: row.Ano,
    km: row.Km,
    color: row.Cor ?? undefined,
    price: row.PrecoEstimado,
    city: row.UnidadeCidade,
    state: row.UnidadeEstado,
    active: true,
    syncedAt: new Date(),
  };
}

export async function fetchAvaliadorOffers(filter?: {
  brand?: string; model?: string; limit?: number;
}): Promise<Offer[]> {
  const pool = await avaliadorPool();
  if (!pool) return [];

  // ⚠️ PLACEHOLDER: adjust join and column names with real schema
  let query = `
    SELECT TOP ${filter?.limit ?? 500}
      v.Id, v.Placa, v.Marca, v.Modelo, v.Versao, v.Ano, v.Km, v.Cor,
      a.PrecoEstimado, u.Cidade AS UnidadeCidade, u.Estado AS UnidadeEstado,
      av.Nome AS AvaliadorNome, av.Telefone AS AvaliadorTelefone,
      a.DataAvaliacao
    FROM dbo.Veiculos_Avaliados v
    INNER JOIN dbo.Avaliacoes a ON a.VeiculoId = v.Id
    INNER JOIN dbo.Unidades u ON u.Id = a.UnidadeId
    LEFT JOIN dbo.Avaliadores av ON av.Id = a.AvaliadorId
    WHERE a.Status = 'em_avaliacao'
  `;

  const params: Record<string, unknown> = {};
  if (filter?.brand) { query += ` AND v.Marca = @brand`; params.brand = filter.brand; }
  if (filter?.model) { query += ` AND v.Modelo = @model`; params.model = filter.model; }

  const rows = await safeQuery<AvaliadorRow>(pool, query, params);
  return rows.map(avaliadorToOffer);
}

/* ─────────────────────────────────────────────────────────────
 * UNIFIED FETCH — all sources in parallel with circuit breaker
 * ───────────────────────────────────────────────────────────── */

export async function fetchAllExternalOffers(filter?: {
  brand?: string; model?: string; yearMin?: number; yearMax?: number;
}): Promise<{ marketplace: Offer[]; avaliador: Offer[] }> {
  const [marketplace, avaliador] = await Promise.all([
    fetchCanalRepasseOffers(filter),
    fetchAvaliadorOffers(filter),
  ]);
  return { marketplace, avaliador };
}

/**
 * Write-back: notify Avaliador Digital that a vehicle under evaluation
 * has active demand. We write into a dedicated queue table that the
 * Avaliador Digital consumes. This is the ONLY allowed write path.
 */
export async function notifyAvaliadorOfMatch(params: {
  veiculoId: string;
  desejoId: string;
  vendedorNome: string;
  unidadesCount: number;
}): Promise<boolean> {
  const pool = await avaliadorPool();
  if (!pool) return false;

  try {
    const request = pool.request();
    request.input("veiculoId", params.veiculoId);
    request.input("desejoId", params.desejoId);
    request.input("vendedorNome", params.vendedorNome);
    request.input("unidadesCount", params.unidadesCount);

    // ⚠️ PLACEHOLDER: confirm table name and columns with DBA
    await request.query(`
      INSERT INTO dbo.CompraCerta_NotificacoesDesejo
        (VeiculoId, DesejoId, VendedorNome, UnidadesComDemanda, DataCriacao, Status)
      VALUES (@veiculoId, @desejoId, @vendedorNome, @unidadesCount, GETDATE(), 'pendente')
    `);
    return true;
  } catch (error) {
    console.error("[MSSQL] Writeback to Avaliador failed:", error);
    return false;
  }
}

/* Utility to help matching engine decide if a wish might match external offers */
export function buildExternalFilter(wish: Wish) {
  return {
    brand: wish.brand,
    model: wish.model,
    yearMin: wish.yearMin,
    yearMax: wish.yearMax,
  };
}
