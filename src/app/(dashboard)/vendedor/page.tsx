"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TradoxTable } from "@/components/dashboard/tradox-table";
import { PlusCircle, Search, Users, Clock, Heart, Loader2 } from "lucide-react";

interface WishRow { id: string; client_name: string; brand: string; model: string; year_min: number | null; year_max: number | null; price_min: number | null; price_max: number | null; status: string; created_at: string }
interface DashboardData { totalWishes: number; activeWishes: number; totalMatches: number; conversionRate: number; recentWishes: WishRow[]; recentMatches: unknown[] }

const STATUS_CLS: Record<string, { label: string; cls: string }> = {
  procurando: { label: "Procurando", cls: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  match_encontrado: { label: "Match!", cls: "bg-green-50 text-green-700" },
  em_negociacao: { label: "Negociando", cls: "bg-amber-50 text-amber-700" },
  convertido: { label: "Convertido", cls: "bg-green-100 text-green-800" },
  perdido: { label: "Perdido", cls: "bg-red-50 text-[#E5484D]" },
  expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
};

function fmt(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function brandInitial(brand: string) {
  return brand.trim().charAt(0).toUpperCase();
}

export default function VendedorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const hasAnyData = data && (data.totalWishes > 0 || data.recentWishes.length > 0);

  return (
    <DashboardLayout role="vendedor" userName="João" subtitle="Vamos encontrar o carro certo hoje">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-6">
                <MetricHero
                  label="Desejos Ativos"
                  value={String(data?.activeWishes ?? 0)}
                  trend={{ value: 0, label: data?.totalWishes ? `${data.totalWishes} desejos no total` : "comece agora" }}
                  subtitle={data?.totalWishes ? `${data.totalMatches} match${data.totalMatches === 1 ? "" : "es"} encontrado${data.totalMatches === 1 ? "" : "s"}` : "Cadastre o primeiro desejo do seu cliente"}
                  sparklineData={[0, 0, 0, 0, 0, data?.totalWishes ?? 0]}
                  primaryAction={{ label: "Novo Desejo", onClick: () => router.push("/desejos/novo") }}
                  secondaryAction={{ label: "Ver todos", onClick: () => router.push("/vendedor/desejos") }}
                />
                <QuickActions
                  actions={[
                    { label: "Novo Desejo", icon: PlusCircle, href: "/desejos/novo" },
                    { label: "Buscar Veículo", icon: Search, href: "/vendedor/matches" },
                    { label: "Meus Clientes", icon: Users, href: "/vendedor/carteira" },
                    { label: "Histórico", icon: Clock, href: "/vendedor/desejos" },
                  ]}
                />
              </div>
              <div className="lg:col-span-2">
                <div className="card-tradox h-full flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px]">Taxa de Conversão</p>
                    <p className="text-[36px] font-bold text-[#111827] leading-none mt-4 tabular-nums">
                      {data?.totalWishes ? `${data.conversionRate}%` : "—"}
                    </p>
                    <p className="text-[12px] text-[#9AA0AB] mt-2">
                      {data?.totalWishes ? `${data.totalMatches} matches / ${data.totalWishes} desejos` : "Sem dados ainda"}
                    </p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
                    <Link href="/vendedor/matches" className="text-[13px] text-[#2563EB] font-medium hover:underline">Ver matches →</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de desejos */}
            {!hasAnyData ? (
              <div className="card-tradox text-center py-16">
                <Heart className="w-12 h-12 mx-auto text-[#D1D5DB] mb-4" />
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Comece cadastrando o primeiro desejo</h3>
                <p className="text-[14px] text-[#6B7280] max-w-md mx-auto mb-5">
                  Registre o veículo que seu cliente procura e deixe o sistema encontrar matches na rede.
                </p>
                <Link href="/desejos/novo" className="inline-flex items-center gap-2 h-[44px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:bg-[#1D4ED8] transition-all">
                  <PlusCircle className="w-4 h-4" />Cadastrar Desejo
                </Link>
              </div>
            ) : (
              <TradoxTable
                title="Meus Desejos em Andamento"
                columns={[
                  { key: "vehicle", label: "Veículo" },
                  { key: "price", label: "Faixa", align: "right", minWidth: "110px" },
                  { key: "status", label: "Status", align: "center", minWidth: "96px" },
                ]}
                rows={(data?.recentWishes ?? []).slice(0, 10).map((w) => ({
                  id: w.id,
                  avatar: { text: brandInitial(w.brand), color: "#2563EB" },
                  title: `${w.brand} ${w.model}`,
                  subtitle: `${w.year_min ?? "—"}${w.year_max && w.year_max !== w.year_min ? `–${w.year_max}` : ""} · ${w.client_name}`,
                  cells: {
                    price: (
                      <span className="text-[#111827] text-[12px]">
                        {w.price_min && w.price_max ? `${fmt(w.price_min)} – ${fmt(w.price_max)}` : fmt(w.price_max ?? w.price_min)}
                      </span>
                    ),
                    status: (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLS[w.status]?.cls ?? STATUS_CLS.procurando.cls}`}>
                        {STATUS_CLS[w.status]?.label ?? w.status}
                      </span>
                    ),
                  },
                  action: { label: "Ver match", onClick: () => router.push("/vendedor/matches") },
                }))}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
