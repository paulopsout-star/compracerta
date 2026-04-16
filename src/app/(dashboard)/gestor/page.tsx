"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AreaChart } from "@/components/dashboard/area-chart";
import { TradoxTable } from "@/components/dashboard/tradox-table";
import { Trophy, AlertTriangle, Lightbulb, FileDown } from "lucide-react";

export default function GestorDashboard() {
  return (
    <DashboardLayout
      role="gestor"
      userName="Ricardo"
      subtitle="Acompanhe a performance da sua equipe"
    >
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <MetricHero
              label="Pipeline da Equipe"
              value="R$ 2,4M"
              trend={{ value: 18, label: "vs. mês anterior" }}
              subtitle="47 desejos ativos na sua rede"
              sparklineData={[800, 1200, 1100, 1600, 1800, 2000, 2200, 2100, 2400]}
              primaryAction={{ label: "Ver Pipeline" }}
              secondaryAction={{ label: "Exportar" }}
            />
            <QuickActions
              actions={[
                { label: "Ranking", icon: Trophy, href: "/gestor/equipe" },
                { label: "Oport. Perdidas", icon: AlertTriangle, href: "/gestor/relatorios" },
                { label: "Insights", icon: Lightbulb, href: "/gestor/desejos" },
                { label: "Exportar", icon: FileDown, href: "/gestor/relatorios" },
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <AreaChart
              title="Performance da Equipe"
              subtitle="Desejos cadastrados x convertidos"
              currentValue="47"
              trend={{ value: 15, label: "desejos este mês" }}
              data={[
                { label: "Nov", value: 28 },
                { label: "Dez", value: 35 },
                { label: "Jan", value: 32 },
                { label: "Fev", value: 40 },
                { label: "Mar", value: 43 },
                { label: "Abr", value: 47 },
              ]}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TradoxTable
            title="Top Vendedores"
            columns={[
              { key: "seller", label: "Vendedor" },
              { key: "conversions", label: "Conversões", align: "center" },
              { key: "rate", label: "Taxa", align: "right" },
            ]}
            rows={[
              {
                id: "s2",
                avatar: { text: "MS", color: "#2563EB" },
                title: "Maria Santos",
                subtitle: "15 desejos · 10 matches",
                cells: {
                  conversions: <span className="font-bold text-[#111827]">4</span>,
                  rate: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      26.7%
                    </span>
                  ),
                },
                action: { label: "Detalhes" },
                pinned: true,
              },
              {
                id: "s1",
                avatar: { text: "JS", color: "#3B82F6" },
                title: "João Silva",
                subtitle: "12 desejos · 8 matches",
                cells: {
                  conversions: <span className="font-bold text-[#111827]">3</span>,
                  rate: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      25.0%
                    </span>
                  ),
                },
                action: { label: "Detalhes" },
              },
              {
                id: "s3",
                avatar: { text: "CO", color: "#60A5FA" },
                title: "Carlos Oliveira",
                subtitle: "10 desejos · 9 matches",
                cells: {
                  conversions: <span className="font-bold text-[#111827]">2</span>,
                  rate: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                      20.0%
                    </span>
                  ),
                },
                action: { label: "Detalhes" },
              },
              {
                id: "s4",
                avatar: { text: "AS", color: "#93C5FD" },
                title: "Ana Souza",
                subtitle: "10 desejos · 7 matches",
                cells: {
                  conversions: <span className="font-bold text-[#111827]">1</span>,
                  rate: (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#E5484D]">
                      10.0%
                    </span>
                  ),
                },
                action: { label: "Detalhes" },
              },
            ]}
          />

          <TradoxTable
            title="Modelos Mais Procurados Sem Estoque"
            columns={[
              { key: "model", label: "Modelo" },
              { key: "wishes", label: "Desejos", align: "center" },
              { key: "trend", label: "Tendência", align: "right" },
            ]}
            rows={[
              {
                id: "t1",
                avatar: { text: "H", color: "#E40521" },
                title: "Honda Civic",
                subtitle: "2021–2024 · Automático",
                cells: {
                  wishes: <span className="font-bold text-[#111827]">8</span>,
                  trend: (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--primary)]">
                      +3 esta semana
                    </span>
                  ),
                },
                action: { label: "Ver" },
              },
              {
                id: "t2",
                avatar: { text: "T", color: "#1A1A1A" },
                title: "Toyota Corolla",
                subtitle: "2020–2024 · Flex",
                cells: {
                  wishes: <span className="font-bold text-[#111827]">7</span>,
                  trend: (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--primary)]">
                      +2 esta semana
                    </span>
                  ),
                },
                action: { label: "Ver" },
              },
              {
                id: "t3",
                avatar: { text: "J", color: "#3D5A1E" },
                title: "Jeep Compass",
                subtitle: "2020–2023 · Diesel",
                cells: {
                  wishes: <span className="font-bold text-[#111827]">6</span>,
                  trend: (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#9AA0AB]">
                      sem alteração
                    </span>
                  ),
                },
                action: { label: "Ver" },
              },
              {
                id: "t4",
                avatar: { text: "V", color: "#001E50" },
                title: "VW T-Cross",
                subtitle: "2021–2024 · Automático",
                cells: {
                  wishes: <span className="font-bold text-[#111827]">5</span>,
                  trend: (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--primary)]">
                      +1 esta semana
                    </span>
                  ),
                },
                action: { label: "Ver" },
              },
            ]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
