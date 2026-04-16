"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricHero } from "@/components/dashboard/metric-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AreaChart } from "@/components/dashboard/area-chart";
import { TradoxTable } from "@/components/dashboard/tradox-table";
import { Users, Plug, ScrollText, Settings, CheckCircle, AlertCircle, Wifi, Database, MessageSquare, Zap } from "lucide-react";

export default function AdminDashboard() {
  return (
    <DashboardLayout
      role="admin"
      userName="Admin"
      subtitle="Visão geral do ecossistema Compra Certa"
    >
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <MetricHero
              label="GMV Gerado"
              value="R$ 847k"
              trend={{ value: 42, label: "vs. mês anterior" }}
              subtitle="Valor de negócios fechados via plataforma"
              sparklineData={[120, 180, 250, 320, 400, 480, 550, 680, 847]}
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
          <div className="lg:col-span-3">
            <AreaChart
              title="Matches x Conversões"
              subtitle="Evolução mensal da plataforma"
              currentValue="234"
              trend={{ value: 28, label: "matches este mês" }}
              data={[
                { label: "Nov", value: 85 },
                { label: "Dez", value: 110 },
                { label: "Jan", value: 135 },
                { label: "Fev", value: 168 },
                { label: "Mar", value: 195 },
                { label: "Abr", value: 234 },
              ]}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Integrações */}
          <TradoxTable
            title="Status das Integrações"
            columns={[
              { key: "integration", label: "Integração" },
              { key: "latency", label: "Latência", align: "center" },
              { key: "status", label: "Status", align: "center" },
            ]}
            rows={[
              {
                id: "i1",
                avatar: { text: "CR", color: "#2563EB" },
                title: "Canal do Repasse",
                subtitle: "Marketplace · Webhook + REST",
                cells: {
                  latency: <span className="text-[13px] text-[#5B6370]">45ms</span>,
                  status: (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      <CheckCircle className="w-3 h-3" /> Online
                    </span>
                  ),
                },
                action: { label: "Config" },
              },
              {
                id: "i2",
                avatar: { text: "AD", color: "#3B82F6" },
                title: "Avaliador Digital",
                subtitle: "Read Replica · CDC Sync",
                cells: {
                  latency: <span className="text-[13px] text-[#5B6370]">120ms</span>,
                  status: (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      <CheckCircle className="w-3 h-3" /> Online
                    </span>
                  ),
                },
                action: { label: "Config" },
              },
              {
                id: "i3",
                avatar: { text: "WA", color: "#25D366" },
                title: "WhatsApp Business",
                subtitle: "Cloud API · Templates aprovados",
                cells: {
                  latency: <span className="text-[13px] text-[#5B6370]">89ms</span>,
                  status: (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      <CheckCircle className="w-3 h-3" /> Online
                    </span>
                  ),
                },
                action: { label: "Config" },
              },
              {
                id: "i4",
                avatar: { text: "MQ", color: "#FF6600" },
                title: "Fila de Matching",
                subtitle: "RabbitMQ · Processamento contínuo",
                cells: {
                  latency: <span className="text-[13px] text-[#5B6370]">12ms</span>,
                  status: (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-[var(--primary)]">
                      <CheckCircle className="w-3 h-3" /> Online
                    </span>
                  ),
                },
                action: { label: "Config" },
              },
            ]}
          />

          {/* Métricas operacionais */}
          <div className="space-y-6">
            <div className="card-tradox">
              <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px] mb-4">
                Notificações WhatsApp — 24h
              </p>
              <div className="space-y-3">
                {[
                  { label: "Enviadas", value: 234, total: 234, color: "bg-[var(--primary)]" },
                  { label: "Entregues", value: 208, total: 234, color: "bg-[#3B82F6]" },
                  { label: "Lidas", value: 156, total: 234, color: "bg-[#60A5FA]" },
                  { label: "Respondidas", value: 89, total: 234, color: "bg-[#93C5FD]" },
                  { label: "Com erro", value: 3, total: 234, color: "bg-[#E5484D]" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-[#5B6370]">{item.label}</span>
                      <span className="font-semibold text-[#111827]">
                        {item.value} ({Math.round((item.value / item.total) * 100)}%)
                      </span>
                    </div>
                    <div className="h-[6px] rounded-full bg-[#F1F3F5] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-tradox">
              <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px] mb-3">
                Métricas Gerais
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Usuários Ativos", value: "156" },
                  { label: "Concessionárias", value: "23" },
                  { label: "Lojistas", value: "45" },
                  { label: "Matches Hoje", value: "47" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[11px] text-[#9AA0AB] uppercase tracking-[0.3px]">{item.label}</p>
                    <p className="text-[20px] font-bold text-[#111827] mt-0.5">{item.value}</p>
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
