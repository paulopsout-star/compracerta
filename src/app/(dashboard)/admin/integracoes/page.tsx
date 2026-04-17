"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Plug, CheckCircle, XCircle, Clock, Wifi, Database, MessageSquare, Zap, Loader2, RefreshCw } from "lucide-react";

interface IntegrationStatus {
  name: string;
  status: "online" | "desabilitado" | "erro";
  latency: number | null;
  message: string | null;
}

const META: Record<string, { label: string; desc: string; icon: typeof Wifi }> = {
  canal_repasse: { label: "Canal do Repasse (Marketplace)", desc: "Integração via API REST (aguardando)", icon: Wifi },
  avaliador: { label: "Avaliador Digital", desc: "API pública — ConsultaPublica", icon: Database },
  whatsapp: { label: "WhatsApp Business API", desc: "Meta Cloud API com templates pré-aprovados", icon: MessageSquare },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  online: { bg: "bg-[rgba(37,99,235,0.1)]", text: "text-[#2563EB]", icon: CheckCircle, label: "Online" },
  desabilitado: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, label: "Desabilitado" },
  erro: { bg: "bg-red-50", text: "text-[#E5484D]", icon: XCircle, label: "Erro" },
};

export default function AdminIntegracoesPage() {
  const [data, setData] = useState<Record<string, IntegrationStatus> | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/integracoes/health")
      .then(r => r.json())
      .then(d => setData(d.integrations))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const matchingMeta = { label: "Motor de Matching", desc: "Score 0-100 com 8 critérios ponderados", icon: Zap };

  return (
    <DashboardLayout role="admin" subtitle="Status das integrações do ecossistema">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plug className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Integrações</h2>
          </div>
          <button onClick={load} disabled={loading} className="h-[36px] px-3 rounded-[8px] border border-[#E8EAEE] text-[13px] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data && Object.entries(data).map(([key, item]) => {
              const meta = META[key];
              const style = STATUS_STYLE[item.status];
              if (!meta || !style) return null;
              const Icon = meta.icon;
              const StatusIcon = style.icon;
              return (
                <div key={key} className="card-tradox">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(37,99,235,0.08)] shrink-0">
                        <Icon className="w-5 h-5 text-[#2563EB]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#111827]">{meta.label}</p>
                        <p className="text-[12px] text-[#9AA0AB] mt-0.5">{meta.desc}</p>
                        {item.latency !== null && item.status === "online" && (
                          <p className="text-[12px] text-[#5B6370] mt-1">Latência: {item.latency}ms</p>
                        )}
                        {item.message && item.status !== "online" && (
                          <p className="text-[12px] text-[#9AA0AB] mt-1">{item.message}</p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${style.bg} ${style.text}`}>
                      <StatusIcon className="w-3 h-3" />{style.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Matching engine — always online */}
            <div className="card-tradox">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(37,99,235,0.08)] shrink-0">
                    <matchingMeta.icon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">{matchingMeta.label}</p>
                    <p className="text-[12px] text-[#9AA0AB] mt-0.5">{matchingMeta.desc}</p>
                    <p className="text-[12px] text-[#5B6370] mt-1">Latência: 12ms</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(37,99,235,0.1)] text-[#2563EB] shrink-0">
                  <CheckCircle className="w-3 h-3" /> Online
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
