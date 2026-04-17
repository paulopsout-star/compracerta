"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Package, Loader2, MapPin } from "lucide-react";

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v); }

export default function EstoquePage() {
  const [offers, setOffers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/ofertas").then(r => r.json()).then(d => setOffers(d.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <DashboardLayout role="lojista" subtitle="Veículos do seu estoque na plataforma">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Package className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Meu Estoque</h2><span className="text-[13px] text-[#9AA0AB]">{offers.length} veículos</span></div>
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : offers.length === 0 ? (
          <div className="card-tradox text-center py-12"><Package className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" /><p className="text-[14px] text-[#5B6370]">Nenhum veículo no estoque. Faça upload de uma planilha ou cadastre manualmente.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map(o => (
              <div key={o.id as string} className="card-tradox">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[15px] font-semibold text-[#111827]">{o.brand as string} {o.model as string}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${o.active ? "bg-green-50 text-green-700" : "bg-red-50 text-[#E5484D]"}`}>{o.active ? "Ativo" : "Inativo"}</span>
                </div>
                <p className="text-[13px] text-[#5B6370]">{o.version as string} · {o.year as number}</p>
                <p className="text-[13px] text-[#5B6370]">{((o.km as number) ?? 0).toLocaleString("pt-BR")} km · {o.color as string ?? "—"}</p>
                {o.plate ? <p className="text-[12px] text-[#9AA0AB] font-mono">{(o.plate as string).slice(0, 3)}****</p> : null}
                <p className="text-[18px] font-bold text-[#2563EB] mt-2">{fmt(o.price as number)}</p>
                <div className="flex items-center gap-1 mt-1 text-[12px] text-[#9AA0AB]"><MapPin className="w-3 h-3" />{o.city as string}/{o.state as string}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
