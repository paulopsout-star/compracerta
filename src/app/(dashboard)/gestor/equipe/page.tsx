"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, Loader2, Phone, Mail } from "lucide-react";

export default function EquipePage() {
  const [sellers, setSellers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/dashboard").then(r => r.json()).then(d => setSellers(d.sellers ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <DashboardLayout role="gestor" subtitle="Gerencie sua equipe de vendas">
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Users className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Equipe</h2><span className="text-[13px] text-[#9AA0AB]">{sellers.length} vendedores</span></div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sellers.map((s) => (
              <div key={s.id as string} className="card-tradox">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2563EB] text-white text-[14px] font-bold">{(s.name as string).split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                  <div><p className="text-[14px] font-semibold text-[#111827]">{s.name as string}</p><p className="text-[12px] text-[#9AA0AB]">Vendedor</p></div>
                </div>
                <div className="space-y-1.5 text-[13px] text-[#5B6370]">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#9AA0AB]" />{s.email as string}</div>
                  {s.phone ? <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#9AA0AB]" />{s.phone as string}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
