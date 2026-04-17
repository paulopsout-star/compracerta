"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Heart, Loader2 } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  procurando: { label: "Procurando", cls: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  match_encontrado: { label: "Match!", cls: "bg-green-50 text-green-700" },
  em_negociacao: { label: "Negociando", cls: "bg-amber-50 text-amber-700" },
  convertido: { label: "Convertido", cls: "bg-green-100 text-green-800" },
  perdido: { label: "Perdido", cls: "bg-red-50 text-[#E5484D]" },
  expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
};

export default function GestorDesejosPage() {
  const [wishes, setWishes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  useEffect(() => { fetch("/api/desejos?limit=50").then(r => r.json()).then(d => setWishes(d.data ?? [])).finally(() => setLoading(false)); }, []);

  const filtered = filter === "todos" ? wishes : wishes.filter(w => w.status === filter);

  return (
    <DashboardLayout role="gestor" subtitle="Desejos de toda a equipe">
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Desejos da Equipe</h2></div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: "todos", label: "Todos" }, { key: "procurando", label: "Procurando" }, { key: "match_encontrado", label: "Match" }, { key: "em_negociacao", label: "Negociando" }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`h-[32px] px-4 rounded-full text-[13px] font-medium transition-all ${filter === f.key ? "bg-[#2563EB] text-white" : "bg-[#F7F8FA] text-[#5B6370] hover:bg-[#EEF0F3]"}`}>{f.label}</button>
          ))}
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : (
          <div className="card-tradox !p-0 divide-y divide-[#EEF0F3]">
            {filtered.map(w => { const s = STATUS_BADGE[w.status as string] ?? STATUS_BADGE.procurando; return (
              <div key={w.id as string} className="flex items-center justify-between p-5 hover:bg-[#F7F8FA]/50 transition-colors">
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">{w.brand as string} {w.model as string}</p>
                  <p className="text-[12px] text-[#9AA0AB]">{w.client_name as string} · {new Date(w.created_at as string).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
              </div>
            ); })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
