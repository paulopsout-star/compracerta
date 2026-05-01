import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { invalidateCache } from "@/lib/feature-flags";
import { ZAPI_DEFAULT_BASE_URL, ZAPI_FLAG_KEYS, getConfig } from "@/lib/services/zapi";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  return { session };
}

/**
 * Mascara token mantendo prefixo curto + asteriscos. Ex: "abc123" -> "abc***".
 * Vazio retorna vazio (UI mostra placeholder).
 */
function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 4)}${"*".repeat(Math.min(8, value.length - 4))}`;
}

async function readFlagValue(key: string): Promise<string> {
  const { data } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const v = data?.value;
  return typeof v === "string" ? v : "";
}

async function writeFlag(key: string, value: string, description: string): Promise<void> {
  await supabase.from("feature_flags").upsert(
    {
      key,
      enabled: true,
      value,
      description,
      environment: "production",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  invalidateCache(key);
}

/**
 * GET — retorna config atual com tokens mascarados + indicação da fonte
 * (flag, env, ou default). NÃO devolve segredo em texto plano.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [flagBaseUrl, flagInstanceId, flagInstanceToken, flagClientToken] = await Promise.all([
    readFlagValue(ZAPI_FLAG_KEYS.baseUrl),
    readFlagValue(ZAPI_FLAG_KEYS.instanceId),
    readFlagValue(ZAPI_FLAG_KEYS.instanceToken),
    readFlagValue(ZAPI_FLAG_KEYS.clientToken),
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

  const cfg = await getConfig();

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
  const { error } = await requireAdmin();
  if (error) return error;

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
      writes.push(writeFlag(ZAPI_FLAG_KEYS.baseUrl, d.baseUrl, "Z-API base URL (vazio usa env/default)"));
    }
    if (d.instanceId !== undefined) {
      writes.push(writeFlag(ZAPI_FLAG_KEYS.instanceId, d.instanceId, "Z-API instance ID"));
    }
    if (d.instanceToken !== undefined) {
      writes.push(writeFlag(ZAPI_FLAG_KEYS.instanceToken, d.instanceToken, "Z-API instance token"));
    }
    if (d.clientToken !== undefined) {
      writes.push(writeFlag(ZAPI_FLAG_KEYS.clientToken, d.clientToken, "Z-API client token"));
    }
    await Promise.all(writes);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API] admin/integracoes/zapi PUT error:", err);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
