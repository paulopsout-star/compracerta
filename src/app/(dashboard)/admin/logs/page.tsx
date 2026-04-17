"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ScrollText } from "lucide-react";

export default function AdminLogsPage() {
  return (
    <DashboardLayout role="admin" subtitle="Logs de auditoria do sistema">
      <div className="card-tradox max-w-2xl mx-auto text-center py-12">
        <ScrollText className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">Logs de Auditoria</h2>
        <p className="text-[14px] text-[#5B6370]">
          Sistema de logs em implementação. Todas as ações serão registradas na tabela audit_logs.
        </p>
      </div>
    </DashboardLayout>
  );
}
