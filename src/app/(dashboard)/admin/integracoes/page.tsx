"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Plug, CheckCircle, Clock, Wifi, Database, MessageSquare, Zap } from "lucide-react";

const INTEGRATIONS = [
  { name: "Canal do Repasse (Marketplace)", desc: "Integração aguardando definição", icon: Wifi, status: "pendente", latency: "—" },
  { name: "Avaliador Digital", desc: "Via API REST — aguardando endpoints", icon: Database, status: "pendente", latency: "—" },
  { name: "WhatsApp Business API", desc: "Meta Cloud API com templates pré-aprovados", icon: MessageSquare, status: "pendente", latency: "—" },
  { name: "Motor de Matching", desc: "Score 0-100 com 8 critérios ponderados", icon: Zap, status: "online", latency: "12ms" },
];

export default function AdminIntegracoesPage() {
  return (
    <DashboardLayout role="admin" subtitle="Status das integrações do ecossistema">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Plug className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-[20px] font-semibold text-[#111827]">Integrações</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <div key={item.name} className="card-tradox">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(37,99,235,0.08)]">
                    <item.icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#111827]">{item.name}</p>
                    <p className="text-[12px] text-[#9AA0AB] mt-0.5">{item.desc}</p>
                    {item.latency !== "—" && <p className="text-[12px] text-[#5B6370] mt-1">Latência: {item.latency}</p>}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  item.status === "online"
                    ? "bg-[rgba(37,99,235,0.1)] text-[#2563EB]"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {item.status === "online" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {item.status === "online" ? "Online" : "Pendente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
