"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Users, Plug, ScrollText, Settings, Loader2, Zap, Heart, Package, MessageSquare } from "lucide-react";

interface DashboardData {
  totalUsers: number;
  totalWishes: number;
  totalOffers: number;
  totalMatches: number;
  totalNotifications: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin" userName="Admin" subtitle="Visão geral do ecossistema Compra Certa">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-6">
                <MetricHero
                  label="Usuários Ativos"
                  value={String(data?.totalUsers ?? 0)}
                  trend={{ value: 0, label: `${data?.totalWishes ?? 0} desejos · ${data?.totalOffers ?? 0} ofertas` }}
                  subtitle={`${data?.totalMatches ?? 0} match${(data?.totalMatches ?? 0) === 1 ? "" : "es"} gerado${(data?.totalMatches ?? 0) === 1 ? "" : "s"} até agora`}
                  sparklineData={[0, 0, 0, 0, 0, data?.totalUsers ?? 0]}
                  primaryAction={{ label: "Relatório Completo" }}
                  secondaryAction={{ label: "Exportar" }}
                />
                <QuickActions
                  actions={[
                    { label: "Usuários", icon: Users, href: "/admin/usuarios" },
                    { label: "Integrações", icon: Plug, href: "/admin/integracoes" },
                    { label: "Logs", icon: ScrollText, href: "/admin/logs" },
                    { label: "Parâmetros", icon: Settings, href: "/admin/parametros" },
                  ]}
                />
              </div>

              <div className="lg:col-span-2">
                <div className="card-tradox h-full">
                  <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px] mb-4">Métricas Gerais</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    {[
                      { label: "Usuários", value: data?.totalUsers ?? 0, icon: Users },
                      { label: "Desejos", value: data?.totalWishes ?? 0, icon: Heart },
                      { label: "Ofertas", value: data?.totalOffers ?? 0, icon: Package },
                      { label: "Matches", value: data?.totalMatches ?? 0, icon: Zap },
                      { label: "Notificações", value: data?.totalNotifications ?? 0, icon: MessageSquare },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <item.icon className="w-3 h-3 text-[#B0B7C3]" />
                          <p className="text-[10px] text-[#B0B7C3] uppercase tracking-[0.4px] font-semibold">{item.label}</p>
                        </div>
                        <p className="text-[20px] font-bold text-[#111827] tabular-nums">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-tradox">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">Status das Integrações</p>
                  <p className="text-[12px] text-[#9AA0AB] mt-0.5">Monitore a saúde das integrações do ecossistema</p>
                </div>
                <Link href="/admin/integracoes" className="h-[36px] px-4 rounded-[8px] bg-[#2563EB] text-white text-[13px] font-medium inline-flex items-center hover:bg-[#1D4ED8] transition-all">
                  Ver detalhes
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
