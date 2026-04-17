"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Users, Loader2, Phone } from "lucide-react";

export default function CarteiraPage() {
  const [clients, setClients] = useState<{ name: string; phone: string; count: number; lastDate: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/desejos").then(r => r.json()).then(d => {
      const map = new Map<string, { name: string; phone: string; count: number; lastDate: string }>();
      for (const w of (d.data ?? [])) {
        const key = w.client_phone as string;
        const existing = map.get(key);
        if (existing) { existing.count++; if (w.created_at > existing.lastDate) existing.lastDate = w.created_at as string; }
        else map.set(key, { name: w.client_name as string, phone: key, count: 1, lastDate: w.created_at as string });
      }
      setClients(Array.from(map.values()).sort((a, b) => b.count - a.count));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="vendedor" subtitle="Seus clientes com desejos ativos">
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Users className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Minha Carteira</h2><span className="text-[13px] text-[#9AA0AB]">{clients.length} clientes</span></div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : clients.length === 0 ? (
          <div className="card-tradox text-center py-12"><Users className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" /><p className="text-[14px] text-[#5B6370]">Cadastre desejos para ver seus clientes aqui.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <div key={c.phone} className="card-tradox">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2563EB] text-white text-[14px] font-bold">{c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                  <div><p className="text-[14px] font-semibold text-[#111827]">{c.name}</p><div className="flex items-center gap-1 text-[12px] text-[#9AA0AB]"><Phone className="w-3 h-3" />{c.phone}</div></div>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#5B6370]">{c.count} {c.count === 1 ? "desejo" : "desejos"}</span>
                  <span className="text-[#9AA0AB]">{new Date(c.lastDate).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
