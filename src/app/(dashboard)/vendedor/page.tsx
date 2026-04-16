"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AreaChart } from "@/components/dashboard/area-chart";
import { TradoxTable } from "@/components/dashboard/tradox-table";
import { PlusCircle, Search, Users, Clock } from "lucide-react";

const BRAND_COLORS: Record<string, string> = {
  Honda: "#E40521",
  Toyota: "#1A1A1A",
  Fiat: "#B6254F",
  Volkswagen: "#001E50",
  Jeep: "#3D5A1E",
  Hyundai: "#002C5F",
  Chevrolet: "#D4AF37",
};

export default function VendedorDashboard() {
  const router = useRouter();

  return (
    <DashboardLayout
      role="vendedor"
      userName="João"
      subtitle="Vamos encontrar o carro certo hoje"
    >
      <div className="space-y-6">
        {/* Row 1: Two columns — MetricHero+QuickActions (left ~40%) | AreaChart (right ~60%) */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <MetricHero
              label="Desejos Ativos"
              value="23"
              trend={{ value: 12, label: "vs. semana anterior" }}
              subtitle="Você gerou 8 oportunidades esta semana"
              sparklineData={[5, 8, 6, 12, 10, 15, 18, 16, 23]}
              primaryAction={{
                label: "Novo Desejo",
                onClick: () => router.push("/desejos/novo"),
              }}
              secondaryAction={{ label: "Ver todos" }}
            />
            <QuickActions
              actions={[
                { label: "Novo Desejo", icon: PlusCircle, href: "/desejos/novo" },
                { label: "Buscar Veículo", icon: Search, href: "/vendedor/marketplace" },
                { label: "Meus Clientes", icon: Users, href: "/vendedor/carteira" },
                { label: "Histórico", icon: Clock, href: "/vendedor/matches" },
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <AreaChart
              title="Conversões x Tempo"
              subtitle="Dias até match"
              currentValue="34"
              trend={{ value: 23, label: "vs. mês anterior" }}
              data={[
                { label: "Nov", value: 12 },
                { label: "Dez", value: 18 },
                { label: "Jan", value: 22 },
                { label: "Fev", value: 28 },
                { label: "Mar", value: 31 },
                { label: "Abr", value: 34 },
              ]}
            />
          </div>
        </div>

        {/* Row 2: Two tables side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TradoxTable
            title="Meus Desejos em Andamento"
            columns={[
              { key: "vehicle", label: "Veículo" },
              { key: "price", label: "Faixa", align: "right" },
              { key: "status", label: "Status", align: "center" },
            ]}
            rows={[
              {
                id: "w1",
                avatar: { text: "H", color: BRAND_COLORS.Honda },
                title: "Honda Civic",
                subtitle: "2021–2024 · Roberto Mendes",
                cells: {
                  price: <span className="text-[#111827]">R$ 100–130k</span>,
                  status: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      Procurando
                    </span>
                  ),
                },
                action: { label: "Ver match" },
                pinned: true,
              },
              {
                id: "w2",
                avatar: { text: "T", color: BRAND_COLORS.Toyota },
                title: "Toyota Corolla",
                subtitle: "2020–2024 · Fernanda Lima",
                cells: {
                  price: <span className="text-[#111827]">R$ 110–150k</span>,
                  status: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">
                      Match!
                    </span>
                  ),
                },
                action: { label: "Contatar" },
              },
              {
                id: "w4",
                avatar: { text: "V", color: BRAND_COLORS.Volkswagen },
                title: "VW T-Cross",
                subtitle: "2021–2024 · Lucia Ferreira",
                cells: {
                  price: <span className="text-[#111827]">R$ 90–120k</span>,
                  status: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                      Negociando
                    </span>
                  ),
                },
                action: { label: "Detalhes" },
              },
              {
                id: "w6",
                avatar: { text: "H", color: BRAND_COLORS.Hyundai },
                title: "Hyundai Creta",
                subtitle: "2022–2025 · Renata Dias",
                cells: {
                  price: <span className="text-[#111827]">R$ 95–130k</span>,
                  status: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      Procurando
                    </span>
                  ),
                },
                action: { label: "Ver match" },
              },
            ]}
          />

          <TradoxTable
            title="Matches Pendentes de Contato"
            columns={[
              { key: "vehicle", label: "Veículo" },
              { key: "score", label: "Score", align: "center" },
              { key: "source", label: "Origem", align: "center" },
            ]}
            rows={[
              {
                id: "m1",
                avatar: { text: "H", color: BRAND_COLORS.Honda },
                title: "Honda Civic EXL 2022",
                subtitle: "32.000 km · BH/MG",
                cells: {
                  score: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--primary)]">
                      95%
                    </span>
                  ),
                  source: <span className="text-[12px] text-[#9AA0AB]">Marketplace</span>,
                },
                action: { label: "Contatar" },
              },
              {
                id: "m2",
                avatar: { text: "T", color: BRAND_COLORS.Toyota },
                title: "Toyota Corolla XEi 2021",
                subtitle: "45.000 km · Contagem/MG",
                cells: {
                  score: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--primary)]">
                      88%
                    </span>
                  ),
                  source: <span className="text-[12px] text-[#9AA0AB]">Avaliador</span>,
                },
                action: { label: "Contatar" },
              },
              {
                id: "m3",
                avatar: { text: "F", color: BRAND_COLORS.Fiat },
                title: "Fiat Argo Trekking 2023",
                subtitle: "18.000 km · BH/MG",
                cells: {
                  score: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700">
                      92%
                    </span>
                  ),
                  source: <span className="text-[12px] text-[#9AA0AB]">Lojista</span>,
                },
                action: { label: "Contatar" },
              },
            ]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
