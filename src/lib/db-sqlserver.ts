import sql from "mssql";

/**
 * Two independent connection pools — one per external product.
 * Both are READ-ONLY. Never run INSERT/UPDATE/DELETE through these pools.
 * For writeback (e.g. notifying Avaliador Digital), use the dedicated
 * writeback helper which goes through a different authenticated path.
 */

type Pools = {
  canalRepasse?: sql.ConnectionPool;
  avaliador?: sql.ConnectionPool;
};

const globalForMssql = globalThis as unknown as { mssqlPools: Pools };
globalForMssql.mssqlPools = globalForMssql.mssqlPools ?? {};

function baseConfig(opts: {
  host: string; port: number; database: string; user: string; password: string;
}): sql.config {
  return {
    server: opts.host,
    port: opts.port,
    database: opts.database,
    user: opts.user,
    password: opts.password,
    options: {
      encrypt: true,              // TLS (required for Azure SQL; safe default for on-prem)
      trustServerCertificate: true, // dev only — in prod use proper CA
      readOnlyIntent: true,       // hint to SQL Server: use read replica if AlwaysOn enabled
      requestTimeout: 15_000,
      connectTimeout: 10_000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

/** Canal do Repasse (Marketplace) read-only pool */
export async function canalRepassePool(): Promise<sql.ConnectionPool | null> {
  if (process.env.CANAL_REPASSE_SYNC_ENABLED !== "true") return null;

  if (globalForMssql.mssqlPools.canalRepasse?.connected) {
    return globalForMssql.mssqlPools.canalRepasse;
  }

  const host = process.env.CANAL_REPASSE_SQL_HOST;
  const database = process.env.CANAL_REPASSE_SQL_DATABASE;
  const user = process.env.CANAL_REPASSE_SQL_USER;
  const password = process.env.CANAL_REPASSE_SQL_PASSWORD;

  if (!host || !database || !user || !password) {
    console.warn("[MSSQL] Canal do Repasse env vars missing — sync disabled");
    return null;
  }

  const pool = new sql.ConnectionPool(
    baseConfig({
      host,
      port: parseInt(process.env.CANAL_REPASSE_SQL_PORT ?? "1433"),
      database,
      user,
      password,
    })
  );

  try {
    await pool.connect();
    globalForMssql.mssqlPools.canalRepasse = pool;
    return pool;
  } catch (error) {
    console.error("[MSSQL] Canal do Repasse connection failed:", error);
    return null;
  }
}

/** Avaliador Digital read-only pool */
export async function avaliadorPool(): Promise<sql.ConnectionPool | null> {
  if (process.env.AVALIADOR_SYNC_ENABLED !== "true") return null;

  if (globalForMssql.mssqlPools.avaliador?.connected) {
    return globalForMssql.mssqlPools.avaliador;
  }

  const host = process.env.AVALIADOR_SQL_HOST;
  const database = process.env.AVALIADOR_SQL_DATABASE;
  const user = process.env.AVALIADOR_SQL_USER;
  const password = process.env.AVALIADOR_SQL_PASSWORD;

  if (!host || !database || !user || !password) {
    console.warn("[MSSQL] Avaliador env vars missing — sync disabled");
    return null;
  }

  const pool = new sql.ConnectionPool(
    baseConfig({
      host,
      port: parseInt(process.env.AVALIADOR_SQL_PORT ?? "1433"),
      database,
      user,
      password,
    })
  );

  try {
    await pool.connect();
    globalForMssql.mssqlPools.avaliador = pool;
    return pool;
  } catch (error) {
    console.error("[MSSQL] Avaliador connection failed:", error);
    return null;
  }
}

/** Utility: safe query with circuit breaker — returns [] on any failure */
export async function safeQuery<T = Record<string, unknown>>(
  pool: sql.ConnectionPool | null,
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  if (!pool) return [];
  try {
    const request = pool.request();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }
    const result = await request.query<T>(query);
    return result.recordset ?? [];
  } catch (error) {
    console.error("[MSSQL] Query failed:", error);
    return [];
  }
}
