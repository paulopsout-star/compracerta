import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { invalidateCache } from "@/lib/feature-flags";
import { ZAPI_DEFAULT_BASE_URL, ZAPI_FLAG_KEYS, getConfig } from "@/lib/services/zapi";
import { getAdminScope } from "@/lib/tenant-scope";

export const runtime = "nodejs";

/**
 * Mascara token mantendo prefixo curto + asteriscos. Ex: "abc123" -> "abc***".
 * Vazio retorna vazio (UI mostra placeholder).
 */
function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 4)}${"*".repeat(Math.min(8, value.length - 4))}`;
}

/**
 * Lê config do tenant primeiro (tenant_feature_flags), depois global
 * (feature_flags). Retorna string vazia se nenhum dos dois.
 */
async function readFlagValue(tenantId: string, key: string): Promise<string> {
  const { data: tenantRow } = await supabase
    .from("tenant_feature_flags")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle();
  if (tenantRow && typeof tenantRow.value === "string") return tenantRow.value;

  const { data: globalRow } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return typeof globalRow?.value === "string" ? globalRow.value : "";
}

async function writeFlag(tenantId: string, key: string, value: string, description: string, updatedBy: string): Promise<void> {
  await supabase.from("tenant_feature_flags").upsert(
    {
      tenant_id: tenantId,
      key,
      enabled: true,
      value,
      description,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,key" }
  );
  invalidateCache(key, tenantId);
}

/**
 * GET — retorna config atual com tokens mascarados + indicação da fonte
 * (flag, env, ou default). NÃO devolve segredo em texto plano.
 */
export async function GET() {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  const [flagBaseUrl, flagInstanceId, flagInstanceToken, flagClientToken] = await Promise.all([
    readFlagValue(scope.tenantId, ZAPI_FLAG_KEYS.baseUrl),
    readFlagValue(scope.tenantId, ZAPI_FLAG_KEYS.instanceId),
    readFlagValue(scope.tenantId, ZAPI_FLAG_KEYS.instanceToken),
    readFlagValue(scope.tenantId, ZAPI_FLAG_KEYS.clientToken),
  ]);

  const envBaseUrl = process.env.ZAPI_BASE_URL ?? "";
  const envInstanceId = process.env.ZAPI_INSTANCE_ID ?? "";
  const envInstanceToken = process.env.ZAPI_INSTANCE_TOKEN ?? "";
  const envClientToken = process.env.ZAPI_CLIENT_TOKEN ?? "";

  function source(flag: string, env: string): "flag" | "env" | "default" {
    if (flag) return "flag";
    if (env) return "env";
    return "default";
  }

  const cfg = await getConfig(scope.tenantId);

  return NextResponse.json({
    configured: cfg !== null,
    fields: {
      baseUrl: {
        value: flagBaseUrl || envBaseUrl || ZAPI_DEFAULT_BASE_URL,
        source: source(flagBaseUrl, envBaseUrl),
        masked: false,
      },
      instanceId: {
        value: flagInstanceId || envInstanceId || "",
        source: source(flagInstanceId, envInstanceId),
        masked: false,
      },
      instanceToken: {
        value: maskSecret(flagInstanceToken || envInstanceToken),
        source: source(flagInstanceToken, envInstanceToken),
        masked: true,
      },
      clientToken: {
        value: maskSecret(flagClientToken || envClientToken),
        source: source(flagClientToken, envClientToken),
        masked: true,
      },
    },
    endpointPreview: cfg
      ? `${cfg.baseUrl}/instances/${cfg.instanceId}/token/${maskSecret(cfg.instanceToken)}/<action>`
      : null,
  });
}

const updateSchema = z.object({
  baseUrl: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  instanceId: z.string().trim().optional(),
  instanceToken: z.string().trim().optional(),
  clientToken: z.string().trim().optional(),
});

/**
 * PUT — atualiza apenas os campos enviados. Strings vazias limpam o flag
 * (volta a usar env). Tokens não enviados ficam intactos (não são apagados).
 */
export async function PUT(req: NextRequest) {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }
  const { scope } = scopeRes;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const writes: Promise<unknown>[] = [];
    if (d.baseUrl !== undefined) {
      writes.push(writeFlag(scope.tenantId, ZAPI_FLAG_KEYS.baseUrl, d.baseUrl, "Z-API base URL (vazio usa env/default)", scope.userId));
    }
    if (d.instanceId !== undefined) {
      writes.push(writeFlag(scope.tenantId, ZAPI_FLAG_KEYS.instanceId, d.instanceId, "Z-API instance ID", scope.userId));
    }
    if (d.instanceToken !== undefined) {
      writes.push(writeFlag(scope.tenantId, ZAPI_FLAG_KEYS.instanceToken, d.instanceToken, "Z-API instance token", scope.userId));
    }
    if (d.clientToken !== undefined) {
      writes.push(writeFlag(scope.tenantId, ZAPI_FLAG_KEYS.clientToken, d.clientToken, "Z-API client token", scope.userId));
    }
    await Promise.all(writes);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] admin/integracoes/zapi PUT error:", err);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
