"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, Loader2 } from "lucide-react";

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  vendedor: { label: "Vendedor", className: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  gestor: { label: "Gestor", className: "bg-purple-50 text-purple-700" },
  lojista: { label: "Lojista", className: "bg-green-50 text-green-700" },
  admin: { label: "Admin", className: "bg-red-50 text-[#E5484D]" },
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin" subtitle="Gerencie os usuários da plataforma">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Usuários</h2>
          </div>
          <span className="text-[13px] text-[#9AA0AB]">{users.length} usuários</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" />
          </div>
        ) : (
          <div className="card-tradox !p-0 overflow-hidden">
            <div className="px-6 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3]">
              <div className="grid grid-cols-5 gap-4 text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
                <span className="col-span-2">Nome / E-mail</span>
                <span>Perfil</span>
                <span>Status</span>
                <span>Criado em</span>
              </div>
            </div>
            <div className="divide-y divide-[#EEF0F3]">
              {users.map((user) => {
                const badge = ROLE_BADGES[user.role as string] ?? ROLE_BADGES.vendedor;
                return (
                  <div key={user.id as string} className="grid grid-cols-5 gap-4 items-center px-6 py-4 hover:bg-[#F7F8FA]/50 transition-colors">
                    <div className="col-span-2">
                      <p className="text-[14px] font-medium text-[#111827]">{user.name as string}</p>
                      <p className="text-[12px] text-[#9AA0AB]">{user.email as string}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${user.active ? "bg-green-50 text-green-700" : "bg-red-50 text-[#E5484D]"}`}>
                      {user.active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-[13px] text-[#5B6370]">
                      {new Date(user.created_at as string).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
