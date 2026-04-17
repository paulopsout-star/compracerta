"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BarChart3, FileDown } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <DashboardLayout role="gestor" subtitle="Relatórios e análises da equipe">
      <div className="card-tradox max-w-2xl mx-auto text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">Relatórios</h2>
        <p className="text-[14px] text-[#5B6370] mb-6">Em breve: exportação de relatórios com performance da equipe, conversões e insights de mercado.</p>
        <button disabled className="h-[44px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium opacity-50 cursor-not-allowed inline-flex items-center gap-2"><FileDown className="w-4 h-4" />Exportar Relatório</button>
      </div>
    </DashboardLayout>
  );
}
