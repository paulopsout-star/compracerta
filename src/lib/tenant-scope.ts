import "server-only";

import { auth } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";

export interface ScopeContext {
  /** ID do tenant a usar nas queries. Sempre presente quando `ok` é true. */
  tenantId: string;
  /** Tenant resolvido pelo host atual (do proxy). */
  hostTenantId: string;
  /** Tenant do usuário autenticado, vindo do JWT. Pode diferir do host se superadmin. */
  userTenantId: string | null;
  /** Role do usuário autenticado. */
  role: string;
  /** ID do usuário autenticado. */
  userId: string;
  /** Se o caller é superadmin (pode atravessar tenants). */
  isSuperadmin: boolean;
}

export type ScopeResult =
  | { ok: true; scope: ScopeContext }
  | { ok: false; status: 401 | 403; reason: string };

/**
 * Resolve o tenant_id efetivo a usar em queries de uma rota autenticada.
 *
 * Regras:
 *  - Sem sessão -> 401.
 *  - Sem tenant resolvido pelo host -> 500-equivalente (proxy quebrado).
 *  - Usuário não-superadmin com `user.tenant_id` diferente do host -> 403.
 *  - Superadmin pode passar `targetTenantId` para forçar outro tenant; senão
 *    usa o tenant do host.
 *  - Usuário comum sempre usa o tenant do host (que já bate com o seu).
 */
export async function getRequestScope(
  options?: { targetTenantId?: string | null }
): Promise<ScopeResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, reason: "unauthenticated" };

  const tenant = await getTenantFromHeaders();
  if (!tenant) return { ok: false, status: 403, reason: "tenant_unresolved" };

  const role = (session.user.role as string) ?? "vendedor";
  const userTenantId = (session.user.tenantId as string | null | undefined) ?? null;
  const isSuperadmin = role === "superadmin";

  if (!isSuperadmin && userTenantId && userTenantId !== tenant.id) {
    return { ok: false, status: 403, reason: "tenant_mismatch" };
  }

  const tenantId = isSuperadmin && options?.targetTenantId
    ? options.targetTenantId
    : tenant.id;

  return {
    ok: true,
    scope: {
      tenantId,
      hostTenantId: tenant.id,
      userTenantId,
      role,
      userId: session.user.id,
      isSuperadmin,
    },
  };
}

/**
 * Aplica `.eq("tenant_id", tenantId)` num query builder do supabase-js.
 * Aceita qualquer builder com método `.eq()`. Retorna o próprio builder
 * para chaining.
 */
export function withTenant<Q extends { eq: (col: string, val: unknown) => Q }>(
  query: Q,
  tenantId: string
): Q {
  return query.eq("tenant_id", tenantId);
}
