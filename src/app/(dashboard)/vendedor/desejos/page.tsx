"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PlusCircle, Heart, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  procurando: { label: "Procurando", cls: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  match_encontrado: { label: "Match!", cls: "bg-green-50 text-green-700" },
  em_negociacao: { label: "Negociando", cls: "bg-amber-50 text-amber-700" },
  convertido: { label: "Convertido", cls: "bg-green-100 text-green-800" },
  perdido: { label: "Perdido", cls: "bg-red-50 text-[#E5484D]" },
  expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
};
const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-red-50 text-[#E5484D]" },
  media: { label: "Média", cls: "bg-amber-50 text-amber-700" },
  baixa: { label: "Baixa", cls: "bg-green-50 text-green-700" },
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export default function MeusDesejosPage() {
  const [wishes, setWishes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/desejos").then(r => r.json()).then(d => setWishes(d.data ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/desejos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success("Status atualizado");
    load();
  }
  async function deleteWish(id: string) {
    if (!confirm("Deseja excluir este desejo?")) return;
    await fetch(`/api/desejos/${id}`, { method: "DELETE" });
    toast.success("Desejo excluído");
    load();
  }

  return (
    <DashboardLayout role="vendedor" subtitle="Gerencie seus desejos de compra">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Meus Desejos</h2><span className="text-[13px] text-[#9AA0AB]">{wishes.length}</span></div>
          <div className="flex gap-2">
            <button onClick={load} className="h-[36px] px-3 rounded-[8px] border border-[#E8EAEE] text-[13px] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"><RefreshCw className="w-4 h-4" /></button>
            <Link href="/desejos/novo" className="h-[36px] px-4 rounded-[8px] bg-[#2563EB] text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:brightness-90 transition-all"><PlusCircle className="w-4 h-4" />Novo Desejo</Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : wishes.length === 0 ? (
          <div className="card-tradox text-center py-12">
            <Heart className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
            <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Nenhum desejo cadastrado</h3>
            <p className="text-[14px] text-[#5B6370] mb-4">Cadastre o primeiro desejo de compra do seu cliente.</p>
            <Link href="/desejos/novo" className="inline-flex items-center gap-2 h-[40px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:brightness-90 transition-all"><PlusCircle className="w-4 h-4" />Cadastrar Desejo</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {wishes.map((w) => {
              const s = STATUS_BADGE[w.status as string] ?? STATUS_BADGE.procurando;
              const u = URGENCY_BADGE[w.urgency as string] ?? URGENCY_BADGE.media;
              return (
                <div key={w.id as string} className="card-tradox">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[16px] font-semibold text-[#111827]">{w.brand as string} {w.model as string}</p>
                      <p className="text-[13px] text-[#5B6370]">{w.client_name as string} · {(w.year_min as number | null) ?? "—"}–{(w.year_max as number | null) ?? "—"}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.cls}`}>{u.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[13px] text-[#5B6370] mb-4">
                    {w.price_min && w.price_max ? <span>{fmt(w.price_min as number)} – {fmt(w.price_max as number)}</span> : null}
                    {w.km_max ? <span>até {(w.km_max as number).toLocaleString("pt-BR")} km</span> : null}
                    <span>{new Date(w.created_at as string).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link href="/vendedor/matches" className="h-[32px] px-3 rounded-[8px] bg-[#2563EB] text-white text-[12px] font-medium inline-flex items-center hover:brightness-90 transition-all">Ver Matches</Link>
                    {["procurando", "match_encontrado"].includes(w.status as string) && (
                      <button onClick={() => updateStatus(w.id as string, "em_negociacao")} className="h-[32px] px-3 rounded-[8px] border border-[#E8EAEE] text-[12px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">Em Negociação</button>
                    )}
                    {w.status === "em_negociacao" && (
                      <button onClick={() => updateStatus(w.id as string, "convertido")} className="h-[32px] px-3 rounded-[8px] border border-green-200 text-[12px] font-medium text-green-700 hover:bg-green-50 transition-colors">Marcar como Vendido</button>
                    )}
                    <button onClick={() => deleteWish(w.id as string)} className="h-[32px] px-3 rounded-[8px] border border-[#E8EAEE] text-[12px] font-medium text-[#E5484D] hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
