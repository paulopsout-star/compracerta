"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Zap, Loader2 } from "lucide-react";

export default function LojistaMatchesPage() {
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/matching").then(r => r.json()).then(d => setMatches(d.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <DashboardLayout role="lojista" subtitle="Matches dos veículos do seu estoque">
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Matches</h2></div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : matches.length === 0 ? (
          <div className="card-tradox text-center py-12"><Zap className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" /><p className="text-[14px] text-[#5B6370]">Nenhum match encontrado para seus veículos ainda.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map(m => {
              const offer = m.offers as Record<string, unknown> | undefined;
              const wish = m.wishes as Record<string, unknown> | undefined;
              if (!offer || !wish) return null;
              return (
                <div key={m.id as string} className="card-tradox">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-[rgba(37,99,235,0.1)] text-[#2563EB]">{m.score as number}%</span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827]">{offer.brand as string} {offer.model as string} {offer.year as number}</p>
                  <p className="text-[13px] text-[#5B6370] mt-1">Procurado por: {wish.client_name as string}</p>
                  <p className="text-[12px] text-[#9AA0AB] mt-0.5">Desejo: {wish.brand as string} {wish.model as string} · {(wish.year_min as number | null) ?? "—"}–{(wish.year_max as number | null) ?? "—"}</p>
                  <button className="mt-3 w-full h-[36px] rounded-[8px] bg-[#2563EB] text-white text-[13px] font-medium hover:brightness-90 transition-all">Conectar</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
