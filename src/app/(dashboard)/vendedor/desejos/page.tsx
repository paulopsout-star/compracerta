"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PlusCircle, Heart, Loader2, Trash2, RefreshCw, MoreHorizontal } from "lucide-react";
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/desejos").then(r => r.json()).then(d => setWishes(d.data ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function updateStatus(id: string, status: string) {
    setOpenMenu(null);
    await fetch(`/api/desejos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success("Status atualizado");
    load();
  }
  async function deleteWish(id: string) {
    setOpenMenu(null);
    if (!confirm("Deseja excluir este desejo?")) return;
    await fetch(`/api/desejos/${id}`, { method: "DELETE" });
    toast.success("Desejo excluído");
    load();
  }

  return (
    <DashboardLayout role="vendedor" subtitle="Gerencie seus desejos de compra">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Meus Desejos</h2>
            <span className="text-[13px] text-[#9AA0AB]">{wishes.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="h-[36px] px-3 rounded-[8px] border border-[#E8EAEE] text-[13px] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link href="/desejos/novo" className="h-[36px] px-4 rounded-[8px] bg-[#2563EB] text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:brightness-90 transition-all">
              <PlusCircle className="w-4 h-4" />Novo Desejo
            </Link>
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : wishes.length === 0 ? (
          <div className="card-tradox text-center py-12">
            <Heart className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
            <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Nenhum desejo cadastrado</h3>
            <p className="text-[14px] text-[#5B6370] mb-4">Cadastre o primeiro desejo de compra do seu cliente.</p>
            <Link href="/desejos/novo" className="inline-flex items-center gap-2 h-[40px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:brightness-90 transition-all">
              <PlusCircle className="w-4 h-4" />Cadastrar Desejo
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Desktop ≥1024px: List view (grid com larguras compactas) ─── */}
            {/* Soma larguras fixas: Cliente 92 + Ano 64 + Preço 150 + KM 96 + Data 74 + Status 108 + Ações 68 = 652 */}
            {/* + Veículo minmax(140,1fr) + 7 gaps (6px=42) + padding horizontal (24) = 858px mínimo */}
            {/* Cabe confortavelmente em qualquer lg (≥1024px) */}
            <div className="card-tradox !p-0 overflow-hidden hidden lg:block w-full min-w-0 max-w-full">
              {/* Header */}
              <div
                className="grid gap-1.5 px-3 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3] items-center w-full max-w-full"
                style={{
                  gridTemplateColumns: "minmax(140px, 1fr) 92px 64px 150px 96px 74px 108px 68px",
                }}
              >
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Veículo</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Cliente</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Ano</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">Preço</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">KM</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Data</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-center min-w-0 overflow-hidden">Status</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">Ações</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F3F4F6]">
                {wishes.map((w) => {
                  const s = STATUS_BADGE[w.status as string] ?? STATUS_BADGE.procurando;
                  const u = URGENCY_BADGE[w.urgency as string] ?? URGENCY_BADGE.media;
                  const yMin = w.year_min as number | null;
                  const yMax = w.year_max as number | null;
                  const pMin = w.price_min as number | null;
                  const pMax = w.price_max as number | null;
                  const kMax = w.km_max as number | null;
                  const isActive = ["procurando", "match_encontrado"].includes(w.status as string);

                  let priceDisplay = "—";
                  if (pMin && pMax) priceDisplay = `${fmt(pMin)}–${fmt(pMax)}`;
                  else if (pMax) priceDisplay = fmt(pMax);
                  else if (pMin) priceDisplay = fmt(pMin);

                  const yearDisplay = yMin && yMax ? (yMin === yMax ? String(yMin) : `${yMin}–${yMax}`) : "—";
                  const kmDisplay = kMax ? `até ${kMax.toLocaleString("pt-BR")} km` : "—";
                  const dateDisplay = new Date(w.created_at as string).toLocaleDateString("pt-BR");

                  return (
                    <div
                      key={w.id as string}
                      className="grid gap-1.5 px-3 items-center min-h-[60px] hover:bg-[#FAFBFC] transition-colors w-full max-w-full"
                      style={{
                        gridTemplateColumns: "minmax(140px, 1fr) 92px 64px 150px 96px 74px 108px 68px",
                      }}
                    >
                      {/* Veículo — único bloco que pode encolher/truncar */}
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate" title={`${w.brand} ${w.model}`}>
                          {w.brand as string} {w.model as string}
                        </p>
                        <p className="text-[11px] text-[#9AA0AB] leading-tight mt-0.5 truncate" title={(w.version as string) || undefined}>
                          {w.version ? (w.version as string) : "—"}
                        </p>
                      </div>

                      {/* Cliente */}
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[12px] text-[#111827] truncate" title={w.client_name as string}>
                          {w.client_name as string}
                        </p>
                      </div>

                      {/* Ano */}
                      <div className="text-[12px] text-[#5B6370] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {yearDisplay}
                      </div>

                      {/* Preço */}
                      <div className="text-right text-[11px] text-[#111827] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" title={priceDisplay}>
                        {priceDisplay}
                      </div>

                      {/* KM */}
                      <div className="text-right text-[11px] text-[#5B6370] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {kmDisplay}
                      </div>

                      {/* Data */}
                      <div className="text-[11px] text-[#5B6370] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {dateDisplay}
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${u.cls}`}>{u.label}</span>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <Link
                          href="/vendedor/matches"
                          className="h-[26px] px-2 rounded-[6px] bg-[#2563EB] text-white text-[11px] font-semibold inline-flex items-center hover:brightness-90 transition-all"
                        >
                          Ver
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === (w.id as string) ? null : (w.id as string))}
                            className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-[#C1C7D0] hover:text-[#6B7280] hover:bg-[#F3F4F6] transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === w.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[10px] shadow-lg shadow-black/10 border border-[#EEF0F3] py-1.5 min-w-[180px]">
                                <Link
                                  href="/vendedor/matches"
                                  onClick={() => setOpenMenu(null)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#2563EB] hover:bg-[#F7F8FA] transition-colors"
                                >
                                  Ver Matches
                                </Link>
                                {isActive && (
                                  <button
                                    onClick={() => updateStatus(w.id as string, "em_negociacao")}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#5B6370] hover:bg-[#F7F8FA] transition-colors text-left"
                                  >
                                    Em Negociação
                                  </button>
                                )}
                                {w.status === "em_negociacao" && (
                                  <button
                                    onClick={() => updateStatus(w.id as string, "convertido")}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-green-700 hover:bg-green-50 transition-colors text-left"
                                  >
                                    Marcar como Vendido
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteWish(w.id as string)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#E5484D] hover:bg-red-50 transition-colors text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Mobile: compact stacked list ─── */}
            <div className="card-tradox !p-0 overflow-hidden lg:hidden">
              <div className="divide-y divide-[#F3F4F6]">
                {wishes.map((w) => {
                  const s = STATUS_BADGE[w.status as string] ?? STATUS_BADGE.procurando;
                  const u = URGENCY_BADGE[w.urgency as string] ?? URGENCY_BADGE.media;
                  const yMin = w.year_min as number | null;
                  const yMax = w.year_max as number | null;
                  const pMin = w.price_min as number | null;
                  const pMax = w.price_max as number | null;
                  const kMax = w.km_max as number | null;
                  const isActive = ["procurando", "match_encontrado"].includes(w.status as string);

                  return (
                    <div key={w.id as string} className="p-4">
                      {/* Linha 1: Veículo + Status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[#111827] leading-snug truncate">
                            {w.brand as string} {w.model as string}
                          </p>
                          <p className="text-[11px] text-[#9AA0AB] truncate mt-0.5">
                            {w.client_name as string}
                            {yMin && yMax ? ` · ${yMin === yMax ? yMin : `${yMin}–${yMax}`}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.cls}`}>{u.label}</span>
                        </div>
                      </div>

                      {/* Linha 2: Preço · KM · Data */}
                      <div className="flex items-center gap-3 text-[11px] text-[#6B7280] mb-3 flex-wrap">
                        {(pMin || pMax) && (
                          <span className="tabular-nums">
                            {pMin && pMax ? `${fmt(pMin)} – ${fmt(pMax)}` : fmt((pMax ?? pMin) as number)}
                          </span>
                        )}
                        {kMax ? <span className="tabular-nums">até {kMax.toLocaleString("pt-BR")} km</span> : null}
                        <span className="tabular-nums text-[#9AA0AB]">
                          {new Date(w.created_at as string).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      {/* Linha 3: Ações */}
                      <div className="flex items-center gap-2">
                        <Link
                          href="/vendedor/matches"
                          className="flex-1 h-[32px] rounded-[7px] bg-[#2563EB] text-white text-[12px] font-semibold inline-flex items-center justify-center hover:brightness-90 transition-all"
                        >
                          Ver Matches
                        </Link>
                        {isActive && (
                          <button
                            onClick={() => updateStatus(w.id as string, "em_negociacao")}
                            className="h-[32px] px-3 rounded-[7px] border border-[#E8EAEE] text-[11px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                          >
                            Em Negociação
                          </button>
                        )}
                        {w.status === "em_negociacao" && (
                          <button
                            onClick={() => updateStatus(w.id as string, "convertido")}
                            className="h-[32px] px-3 rounded-[7px] border border-green-200 text-[11px] font-medium text-green-700 hover:bg-green-50 transition-colors"
                          >
                            Marcar como Vendido
                          </button>
                        )}
                        <button
                          onClick={() => deleteWish(w.id as string)}
                          className="h-[32px] w-[32px] rounded-[7px] border border-[#E8EAEE] text-[#E5484D] hover:bg-red-50 inline-flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
