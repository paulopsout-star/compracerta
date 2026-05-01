"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BarChart3, Loader2, Search, TrendingUp, Zap, CheckCircle2, XCircle } from "lucide-react";

type WishStatus =
  | "procurando"
  | "match_encontrado"
  | "em_negociacao"
  | "convertido"
  | "perdido"
  | "expirado";

interface ReportWish {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  yearMin: number | null;
  yearMax: number | null;
  status: WishStatus;
  clientName: string;
  clientPhone: string;
  sellerName: string | null;
  sellerEmail: string | null;
  dealershipName: string | null;
  dealershipCity: string | null;
  dealershipState: string | null;
  matchesCount: number;
  topScore: number | null;
  createdAt: string;
  expiresAt: string;
  updatedAt: string | null;
}

interface ReportSummary {
  total: number;
  byStatus: Record<WishStatus, number>;
  conversionRate: number;
  matchRate: number;
  wishesWithMatch: number;
}

interface ReportData {
  summary: ReportSummary;
  wishes: ReportWish[];
}

const STATUS_BADGE: Record<WishStatus, { label: string; cls: string }> = {
  procurando: { label: "Procurando", cls: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" },
  match_encontrado: { label: "Match!", cls: "bg-green-50 text-green-700" },
  em_negociacao: { label: "Negociando", cls: "bg-amber-50 text-amber-700" },
  convertido: { label: "Convertido", cls: "bg-green-100 text-green-800" },
  perdido: { label: "Perdido", cls: "bg-red-50 text-[#E5484D]" },
  expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
};

const STATUS_FILTERS: Array<{ key: "todos" | WishStatus; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "procurando", label: "Procurando" },
  { key: "match_encontrado", label: "Match" },
  { key: "em_negociacao", label: "Negociando" },
  { key: "convertido", label: "Convertido" },
  { key: "perdido", label: "Perdido" },
  { key: "expirado", label: "Expirado" },
];

export default function AdminRelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | WishStatus>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/relatorios")
      .then((r) => r.json())
      .then((d: ReportData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const list = data?.wishes ?? [];
    const byStatus = filter === "todos" ? list : list.filter((w) => w.status === filter);
    const term = search.trim().toLowerCase();
    if (!term) return byStatus;
    return byStatus.filter((w) =>
      [w.brand, w.model, w.version, w.clientName, w.sellerName, w.dealershipName]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(term))
    );
  }, [data, filter, search]);

  const summary = data?.summary;

  return (
    <DashboardLayout role="admin" subtitle="Visão gerencial dos desejos cadastrados e seus resultados">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[#2563EB]" />
          <h2 className="text-[20px] font-semibold text-[#111827]">Relatórios</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <KpiCard
                icon={<BarChart3 className="w-4 h-4 text-[#2563EB]" />}
                label="Total de Desejos"
                value={String(summary?.total ?? 0)}
                hint={`${summary?.byStatus?.procurando ?? 0} procurando agora`}
              />
              <KpiCard
                icon={<TrendingUp className="w-4 h-4 text-green-700" />}
                label="Taxa de Conversão"
                value={`${summary?.conversionRate ?? 0}%`}
                hint={`Convertidos ÷ encerrados`}
              />
              <KpiCard
                icon={<Zap className="w-4 h-4 text-amber-700" />}
                label="Taxa de Match"
                value={`${summary?.matchRate ?? 0}%`}
                hint={`${summary?.wishesWithMatch ?? 0} desejos com ao menos 1 match`}
              />
              <KpiCard
                icon={<CheckCircle2 className="w-4 h-4 text-green-800" />}
                label="Em Negociação"
                value={String(summary?.byStatus?.em_negociacao ?? 0)}
                hint={`${summary?.byStatus?.match_encontrado ?? 0} aguardando contato`}
              />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <DistroPill label="Convertidos" count={summary?.byStatus?.convertido ?? 0} cls={STATUS_BADGE.convertido.cls} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
              <DistroPill label="Perdidos" count={summary?.byStatus?.perdido ?? 0} cls={STATUS_BADGE.perdido.cls} icon={<XCircle className="w-3.5 h-3.5" />} />
              <DistroPill label="Expirados" count={summary?.byStatus?.expirado ?? 0} cls={STATUS_BADGE.expirado.cls} icon={<XCircle className="w-3.5 h-3.5" />} />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex gap-2 flex-wrap flex-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`h-[32px] px-4 rounded-full text-[13px] font-medium transition-all ${
                      filter === f.key
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F7F8FA] text-[#5B6370] hover:bg-[#EEF0F3]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0AB]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar marca, cliente, vendedor…"
                  className="w-full h-[36px] pl-9 pr-3 rounded-[8px] bg-white border border-[#EEF0F3] text-[13px] text-[#111827] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="card-tradox !p-0 overflow-hidden">
              <div className="px-6 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3]">
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_0.7fr_1fr] gap-4 text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
                  <span>Veículo / Cliente</span>
                  <span>Vendedor</span>
                  <span>Concessionária</span>
                  <span>Status</span>
                  <span className="text-right">Matches</span>
                  <span>Criado em</span>
                </div>
              </div>
              <div className="divide-y divide-[#EEF0F3]">
                {filtered.length === 0 ? (
                  <div className="px-6 py-12 text-center text-[13px] text-[#9AA0AB]">
                    Nenhum desejo encontrado para os filtros selecionados.
                  </div>
                ) : (
                  filtered.map((w) => {
                    const badge = STATUS_BADGE[w.status];
                    const yearLabel =
                      w.yearMin && w.yearMax && w.yearMin !== w.yearMax
                        ? `${w.yearMin}–${w.yearMax}`
                        : w.yearMin ?? w.yearMax ?? "";
                    return (
                      <div
                        key={w.id}
                        className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_0.7fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[#F7F8FA]/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#111827] truncate">
                            {w.brand} {w.model}{w.version ? ` ${w.version}` : ""}{yearLabel ? ` · ${yearLabel}` : ""}
                          </p>
                          <p className="text-[12px] text-[#9AA0AB] truncate">{w.clientName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#111827] truncate">{w.sellerName ?? "—"}</p>
                          {w.sellerEmail && (
                            <p className="text-[11px] text-[#9AA0AB] truncate">{w.sellerEmail}</p>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#111827] truncate">{w.dealershipName ?? "—"}</p>
                          {(w.dealershipCity || w.dealershipState) && (
                            <p className="text-[11px] text-[#9AA0AB] truncate">
                              {w.dealershipCity ?? ""}{w.dealershipCity && w.dealershipState ? "/" : ""}{w.dealershipState ?? ""}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="text-right">
                          <p className="text-[14px] font-semibold text-[#111827] tabular-nums">{w.matchesCount}</p>
                          {w.topScore != null && (
                            <p className="text-[11px] text-[#9AA0AB] tabular-nums">top {Math.round(w.topScore)}</p>
                          )}
                        </div>
                        <span className="text-[13px] text-[#5B6370]">
                          {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              {data && data.wishes.length >= 500 && (
                <div className="px-6 py-3 text-[11px] text-[#9AA0AB] border-t border-[#EEF0F3]">
                  Mostrando os 500 desejos mais recentes.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-tradox">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[11px] font-semibold text-[#9AA0AB] uppercase tracking-[0.4px]">{label}</p>
      </div>
      <p className="text-[24px] font-bold text-[#111827] tabular-nums leading-none">{value}</p>
      {hint && <p className="text-[12px] text-[#9AA0AB] mt-2">{hint}</p>}
    </div>
  );
}

function DistroPill({ label, count, cls, icon }: { label: string; count: number; cls: string; icon: React.ReactNode }) {
  return (
    <div className="card-tradox flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${cls}`}>{icon}</span>
        <span className="text-[13px] font-medium text-[#111827]">{label}</span>
      </div>
      <span className="text-[18px] font-bold text-[#111827] tabular-nums">{count}</span>
    </div>
  );
}
