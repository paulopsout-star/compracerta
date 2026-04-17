"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Upload, Package, Zap, Bell, FileSpreadsheet, Loader2 } from "lucide-react";

interface DashboardData {
  totalOffers: number;
  totalMatches: number;
  offers: { id: string; brand: string; model: string; year: number; price: number; city: string; state: string }[];
  matches: unknown[];
}

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v); }

export default function LojistaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const hasStock = data && data.totalOffers > 0;

  return (
    <DashboardLayout role="lojista" userName="Auto Center" subtitle="Seu estoque na rede Compra Certa">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-6">
                <MetricHero
                  label="Veículos no Estoque"
                  value={String(data?.totalOffers ?? 0)}
                  trend={{ value: 0, label: data?.totalOffers ? `${data.totalMatches} match${data.totalMatches === 1 ? "" : "es"}` : "sem estoque ainda" }}
                  subtitle={data?.totalOffers ? "Seus veículos aparecem em buscas da rede" : "Faça upload da sua planilha para começar"}
                  sparklineData={[0, 0, 0, 0, 0, data?.totalOffers ?? 0]}
                  primaryAction={{ label: "Subir Estoque" }}
                  secondaryAction={{ label: "Ver Matches" }}
                />
                <QuickActions
                  actions={[
                    { label: "Subir Estoque", icon: Upload, href: "/lojista/upload" },
                    { label: "Meus Veículos", icon: Package, href: "/lojista/estoque" },
                    { label: "Matches", icon: Zap, href: "/lojista/matches" },
                    { label: "Alertas", icon: Bell, href: "/configuracoes" },
                  ]}
                />
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="card-tradox">
                  <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px] mb-4">
                    Resumo do Estoque
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: "Total de veículos", value: data?.totalOffers ?? 0 },
                      { label: "Matches recebidos", value: data?.totalMatches ?? 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-[13px] text-[#5B6370]">{item.label}</span>
                        <span className="text-[14px] font-semibold text-[#111827] tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
                    <Link href="/lojista/estoque" className="text-[13px] text-[#2563EB] font-medium hover:underline">Ver estoque →</Link>
                  </div>
                </div>
              </div>
            </div>

            {!hasStock ? (
              <div className="card-tradox text-center py-16">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-[#D1D5DB] mb-4" />
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Você ainda não cadastrou veículos</h3>
                <p className="text-[14px] text-[#6B7280] max-w-md mx-auto mb-5">
                  Faça upload de uma planilha CSV/XLS ou cadastre manualmente para que seus veículos apareçam nas buscas da rede.
                </p>
                <Link href="/lojista/upload" className="inline-flex items-center gap-2 h-[44px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:bg-[#1D4ED8] transition-all">
                  <Upload className="w-4 h-4" />Subir Estoque
                </Link>
              </div>
            ) : (
              <div className="card-tradox">
                <p className="text-[14px] font-semibold text-[#111827] mb-4">Últimos veículos cadastrados</p>
                <div className="divide-y divide-[#F3F4F6]">
                  {(data?.offers ?? []).slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#111827]">{o.brand} {o.model}</p>
                        <p className="text-[11px] text-[#9AA0AB]">{o.year} · {o.city}/{o.state}</p>
                      </div>
                      <span className="text-[13px] font-semibold text-[#111827] tabular-nums">{fmt(o.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
