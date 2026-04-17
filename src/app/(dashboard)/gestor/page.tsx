"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Trophy, AlertTriangle, Lightbulb, FileDown, Loader2, BarChart3 } from "lucide-react";

interface DashboardData {
  totalWishes: number;
  totalMatches: number;
  sellers: { id: string; name: string; email: string }[];
  wishes: { id: string; brand: string; model: string; status: string; seller_id: string }[];
}

export default function GestorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const hasData = data && data.totalWishes > 0;

  return (
    <DashboardLayout role="gestor" userName="Ricardo" subtitle="Acompanhe a performance da sua equipe">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-6">
                <MetricHero
                  label="Pipeline da Equipe"
                  value={String(data?.totalWishes ?? 0)}
                  trend={{ value: 0, label: `${data?.sellers?.length ?? 0} vendedor${(data?.sellers?.length ?? 0) === 1 ? "" : "es"} ativo${(data?.sellers?.length ?? 0) === 1 ? "" : "s"}` }}
                  subtitle={`${data?.totalMatches ?? 0} match${(data?.totalMatches ?? 0) === 1 ? "" : "es"} gerado${(data?.totalMatches ?? 0) === 1 ? "" : "s"} pela equipe`}
                  sparklineData={[0, 0, 0, 0, 0, data?.totalWishes ?? 0]}
                  primaryAction={{ label: "Ver Pipeline" }}
                  secondaryAction={{ label: "Exportar" }}
                />
                <QuickActions
                  actions={[
                    { label: "Ranking", icon: Trophy, href: "/gestor/equipe" },
                    { label: "Oportunidades", icon: AlertTriangle, href: "/gestor/desejos" },
                    { label: "Insights", icon: Lightbulb, href: "/gestor/relatorios" },
                    { label: "Exportar", icon: FileDown, href: "/gestor/relatorios" },
                  ]}
                />
              </div>
              <div className="lg:col-span-2">
                <div className="card-tradox h-full">
                  <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px]">Equipe</p>
                  {(data?.sellers?.length ?? 0) === 0 ? (
                    <div className="mt-6 text-center py-8">
                      <p className="text-[13px] text-[#9AA0AB]">Nenhum vendedor cadastrado na sua concessionária.</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {data?.sellers?.slice(0, 5).map((s) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                            {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#111827] truncate">{s.name}</p>
                            <p className="text-[11px] text-[#9AA0AB] truncate">{s.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
                    <Link href="/gestor/equipe" className="text-[13px] text-[#2563EB] font-medium hover:underline">Ver equipe →</Link>
                  </div>
                </div>
              </div>
            </div>

            {!hasData && (
              <div className="card-tradox text-center py-16">
                <BarChart3 className="w-12 h-12 mx-auto text-[#D1D5DB] mb-4" />
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Nenhum desejo cadastrado ainda</h3>
                <p className="text-[14px] text-[#6B7280] max-w-md mx-auto">
                  Os números e relatórios aparecerão aqui conforme sua equipe começar a registrar desejos de compra dos clientes.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
