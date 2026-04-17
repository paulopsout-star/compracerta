"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Settings } from "lucide-react";

export default function AdminParametrosPage() {
  return (
    <DashboardLayout role="admin" subtitle="Parâmetros do motor de matching">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-[20px] font-semibold text-[#111827]">Parâmetros de Match</h2>
        </div>
        <div className="card-tradox space-y-5">
          {[
            { label: "Score mínimo para notificação automática", value: "70", unit: "pontos" },
            { label: "Score mínimo para sugestão", value: "50", unit: "pontos" },
            { label: "Tolerância de preço", value: "5", unit: "%" },
            { label: "Raio de busca padrão", value: "100", unit: "km" },
            { label: "Intervalo de varredura", value: "5", unit: "minutos" },
            { label: "Validade padrão do desejo", value: "30", unit: "dias" },
          ].map((param) => (
            <div key={param.label} className="flex items-center justify-between py-3 border-b border-[#EEF0F3] last:border-0">
              <span className="text-[14px] text-[#5B6370]">{param.label}</span>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={param.value} className="w-20 h-[36px] px-3 rounded-[8px] bg-[#F7F8FA] text-[14px] text-[#111827] text-right outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
                <span className="text-[13px] text-[#9AA0AB] w-16">{param.unit}</span>
              </div>
            </div>
          ))}
          <button className="w-full h-[44px] rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:brightness-90 transition-all mt-4">
            Salvar Parâmetros
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
