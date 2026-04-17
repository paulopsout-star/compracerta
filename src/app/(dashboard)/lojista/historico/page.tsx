"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Clock } from "lucide-react";

export default function HistoricoPage() {
  return (
    <DashboardLayout role="lojista" subtitle="Histórico de matches e conversões">
      <div className="card-tradox max-w-2xl mx-auto text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">Histórico</h2>
        <p className="text-[14px] text-[#5B6370]">Em breve: histórico completo de matches, conversões e métricas do seu estoque.</p>
      </div>
    </DashboardLayout>
  );
}
