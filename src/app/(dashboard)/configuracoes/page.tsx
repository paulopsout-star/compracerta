"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Settings, User, Shield, Bell, LogOut } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  return (
    <DashboardLayout subtitle="Gerencie sua conta e preferências">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">Dados da Conta</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: "Nome", value: user?.name ?? "—" },
              { label: "E-mail", value: user?.email ?? "—" },
              { label: "Perfil", value: (user as Record<string, unknown>)?.role as string ?? "—" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-3 border-b border-[#EEF0F3] last:border-0">
                <span className="text-[13px] text-[#5B6370]">{item.label}</span>
                <span className="text-[14px] font-medium text-[#111827] capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">Notificações</h2>
          </div>
          <p className="text-[14px] text-[#5B6370]">
            Configurações de notificação WhatsApp e e-mail estarão disponíveis em breve.
          </p>
        </div>

        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">Segurança</h2>
          </div>
          <p className="text-[14px] text-[#5B6370] mb-4">
            Alterar senha e configurações de segurança estarão disponíveis em breve.
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 h-[44px] rounded-[10px] bg-[#E5484D] text-white text-[14px] font-medium hover:brightness-90 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </div>
    </DashboardLayout>
  );
}
