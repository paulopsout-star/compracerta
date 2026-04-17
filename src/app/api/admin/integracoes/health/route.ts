import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAvaliadorHealth } from "@/lib/services/avaliador-api";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

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
