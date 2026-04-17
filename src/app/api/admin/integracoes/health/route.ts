import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canalRepassePool, avaliadorPool } from "@/lib/db-sqlserver";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  async function check(name: string, getPool: () => Promise<unknown>) {
    const start = Date.now();
    try {
      const pool = await getPool();
      if (!pool) return { name, status: "desabilitado", latency: null, message: "Feature flag desligada ou variáveis não configuradas" };
      return { name, status: "online", latency: Date.now() - start, message: null };
    } catch (error) {
      return { name, status: "erro", latency: null, message: error instanceof Error ? error.message : "Falha na conexão" };
    }
  }

  const [canal, avaliador] = await Promise.all([
    check("canal_repasse", canalRepassePool),
    check("avaliador", avaliadorPool),
  ]);

  return NextResponse.json({
    integrations: {
      canal_repasse: canal,
      avaliador,
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
