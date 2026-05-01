import { NextResponse } from "next/server";
import { checkAvaliadorHealth } from "@/lib/services/avaliador-api";
import { getAdminScope } from "@/lib/tenant-scope";

export async function GET() {
  const scopeRes = await getAdminScope();
  if (!scopeRes.ok) {
    return NextResponse.json({ error: scopeRes.reason }, { status: scopeRes.status });
  }

  const avaliador = await checkAvaliadorHealth();

  return NextResponse.json({
    integrations: {
      avaliador: { name: "avaliador", ...avaliador },
      canal_repasse: {
        name: "canal_repasse",
        status: "desabilitado",
        latency: null,
        message: "Aguardando API do Marketplace Canal do Repasse",
      },
      whatsapp: {
        name: "whatsapp",
        status: process.env.WHATSAPP_API_TOKEN ? "online" : "desabilitado",
        latency: null,
        message: process.env.WHATSAPP_API_TOKEN ? null : "WHATSAPP_API_TOKEN não configurado",
      },
    },
    timestamp: new Date().toISOString(),
  });
}
