"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AreaChart } from "@/components/dashboard/area-chart";
import { TradoxTable } from "@/components/dashboard/tradox-table";
import { Upload, Package, Zap, Bell, FileSpreadsheet } from "lucide-react";

export default function LojistaDashboard() {
  return (
    <DashboardLayout
      role="lojista"
      userName="Auto Center"
      subtitle="Seu estoque está sendo procurado agora"
    >
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <MetricHero
              label="Veículos Procurados Agora"
              value="8"
              trend={{ value: 33, label: "vs. semana anterior" }}
              subtitle="25% do seu estoque tem demanda ativa"
              sparklineData={[2, 3, 4, 3, 5, 6, 5, 7, 8]}
              primaryAction={{ label: "Ver Matches" }}
              secondaryAction={{ label: "Atualizar Estoque" }}
            />
            <QuickActions
              actions={[
                { label: "Subir Estoque", icon: Upload, href: "/lojista/upload" },
                { label: "Meus Veículos", icon: Package, href: "/lojista/estoque" },
                { label: "Matches Ativos", icon: Zap, href: "/lojista/matches" },
                { label: "Alertas", icon: Bell, href: "/lojista/configuracoes" },
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <AreaChart
              title="Matches do Seu Estoque"
              subtitle="Veículos do seu estoque com demanda"
              currentValue="14"
              trend={{ value: 40, label: "matches este mês" }}
              data={[
                { label: "Nov", value: 4 },
                { label: "Dez", value: 6 },
                { label: "Jan", value: 8 },
                { label: "Fev", value: 10 },
                { label: "Mar", value: 11 },
                { label: "Abr", value: 14 },
              ]}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TradoxTable
              title="Carros do Seu Estoque Sendo Procurados"
              columns={[
                { key: "vehicle", label: "Veículo" },
                { key: "price", label: "Preço", align: "right" },
                { key: "interested", label: "Interessados", align: "center" },
              ]}
              rows={[
                {
                  id: "s1",
                  avatar: { text: "T", color: "#1A1A1A" },
                  title: "Toyota Corolla XEi 2022",
                  subtitle: "32.000 km · BH/MG",
                  cells: {
                    price: <span className="font-semibold text-[#111827]">R$ 120.000</span>,
                    interested: (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--primary)]">
                        4 vendedores
                      </span>
                    ),
                  },
                  action: { label: "Conectar" },
                  pinned: true,
                },
                {
                  id: "s2",
                  avatar: { text: "F", color: "#B6254F" },
                  title: "Fiat Argo Trekking 2023",
                  subtitle: "18.000 km · BH/MG",
                  cells: {
                    price: <span className="font-semibold text-[#111827]">R$ 72.000</span>,
                    interested: (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--primary)]">
                        3 vendedores
                      </span>
                    ),
                  },
                  action: { label: "Conectar" },
                },
                {
                  id: "s3",
                  avatar: { text: "H", color: "#002C5F" },
                  title: "Hyundai Creta Ultimate 2023",
                  subtitle: "22.000 km · Goiânia/GO",
                  cells: {
                    price: <span className="font-semibold text-[#111827]">R$ 118.000</span>,
                    interested: (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                        2 vendedores
                      </span>
                    ),
                  },
                  action: { label: "Conectar" },
                },
                {
                  id: "s4",
                  avatar: { text: "H", color: "#E40521" },
                  title: "Honda HR-V EXL 2023",
                  subtitle: "25.000 km · BH/MG",
                  cells: {
                    price: <span className="font-semibold text-[#111827]">R$ 135.000</span>,
                    interested: (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                        1 vendedor
                      </span>
                    ),
                  },
                  action: { label: "Conectar" },
                },
              ]}
            />
          </div>

          {/* Upload card — TradoX style */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-tradox">
              <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px] mb-4">
                Atualizar Estoque
              </p>
              <div className="border-2 border-dashed border-[#E8EAEE] rounded-[12px] p-8 text-center hover:border-[var(--primary)]/30 hover:bg-[var(--accent)]/30 transition-colors cursor-pointer">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-[#9AA0AB]" />
                <p className="text-[14px] font-medium text-[#111827] mt-3">
                  Arraste um arquivo ou clique aqui
                </p>
                <p className="text-[12px] text-[#9AA0AB] mt-1">
                  CSV, XLS, XLSX ou PDF (máx. 10MB)
                </p>
                <button className="mt-4 h-[36px] px-5 rounded-[10px] bg-[var(--primary)] text-white text-[13px] font-medium hover:brightness-90 transition-all">
                  Selecionar arquivo
                </button>
              </div>
              <p className="text-[12px] text-[#9AA0AB] mt-3">
                Último upload: 13/04/2026 — 32 veículos processados
              </p>
            </div>

            <div className="card-tradox">
              <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px] mb-3">
                Resumo do Estoque
              </p>
              <div className="space-y-3">
                {[
                  { label: "Total de veículos", value: "32" },
                  { label: "Com demanda ativa", value: "8" },
                  { label: "Matches este mês", value: "14" },
                  { label: "Conversões", value: "4" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[13px] text-[#5B6370]">{item.label}</span>
                    <span className="text-[14px] font-semibold text-[#111827]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
