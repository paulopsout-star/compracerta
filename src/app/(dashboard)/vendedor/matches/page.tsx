"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Zap, Loader2, X, ArrowLeft, MapPin, ArrowUp, ArrowDown, ChevronsUpDown, Info } from "lucide-react";

type SortDir = "asc" | "desc" | null;
type SortKey = "vehicle" | "score" | "status" | "year" | "km" | "date" | "location" | "price" | null;

function fmt(v: number) {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const STATUS_CLS: Record<string, string> = {
  Avaliado: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]",
  Publicado: "bg-green-50 text-green-700",
  Pendente: "bg-amber-50 text-amber-700",
  Comprado: "bg-purple-50 text-purple-700",
};

function scoreCls(score: number) {
  if (score >= 80) return "bg-[rgba(37,99,235,0.1)] text-[#2563EB]";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

/* Header clicavel com indicador de ordenacao */
function SortHeader({
  label, sortKey, currentKey, currentDir, onSort, align = "left",
}: {
  label: string;
  sortKey: Exclude<SortKey, null>;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: Exclude<SortKey, null>) => void;
  align?: "left" | "center" | "right";
}) {
  const isActive = currentKey === sortKey;
  const alignCls = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 ${alignCls} text-[10px] font-semibold uppercase tracking-[0.4px] min-w-0 overflow-hidden transition-colors cursor-pointer select-none
        ${isActive ? "text-[#2563EB]" : "text-[#B0B7C3] hover:text-[#6B7280]"}`}
      aria-label={`Ordenar por ${label}`}
    >
      <span className="truncate">{label}</span>
      {isActive ? (
        currentDir === "asc" ? <ArrowUp className="w-3 h-3 shrink-0" /> : <ArrowDown className="w-3 h-3 shrink-0" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-40" />
      )}
    </button>
  );
}

function MatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wishId = searchParams.get("wishId");

  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [wishInfo, setWishInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsOffer, setDetailsOffer] = useState<Record<string, unknown> | null>(null);

  // Sorting — default: por score descendente
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const url = wishId ? `/api/matching?wishId=${encodeURIComponent(wishId)}` : "/api/matching";
    fetch(url).then(r => r.json()).then(d => setMatches(d.data ?? [])).finally(() => setLoading(false));
    if (wishId) {
      fetch(`/api/desejos/${wishId}`).then(r => r.json()).then(d => setWishInfo(d ?? null)).catch(() => {});
    } else {
      setWishInfo(null);
    }
  }, [wishId]);

  const subtitle = wishId && wishInfo
    ? `Matches para ${wishInfo.brand as string} ${wishInfo.model as string}`
    : "Veículos encontrados para seus clientes";

  function clearFilter() { router.push("/vendedor/matches"); }

  // Handler de sort: asc → desc → null (sem ordenação)
  function handleSort(key: Exclude<SortKey, null>) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    }
  }

  // Extrair valores ordenáveis por chave
  function getSortValue(m: Record<string, unknown>, key: Exclude<SortKey, null>): string | number {
    const offer = m.offers as Record<string, unknown> | undefined;
    if (!offer) return "";
    switch (key) {
      case "vehicle": return `${offer.brand ?? ""} ${offer.model ?? ""}`.toLowerCase();
      case "score": return (m.score as number) ?? 0;
      case "status": return (offer.external_status as string) ?? "";
      case "year": return (offer.year as number) ?? 0;
      case "km": return (offer.km as number) ?? 0;
      case "date": return offer.synced_at ? new Date(offer.synced_at as string).getTime() : 0;
      case "location": return `${offer.state ?? ""}-${offer.city ?? ""}`.toLowerCase();
      case "price": return (offer.price as number) ?? 0;
    }
  }

  const sortedMatches = useMemo(() => {
    if (!sortKey || !sortDir) return matches;
    const sorted = [...matches].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [matches, sortKey, sortDir]);

  // Agrupa por desejo quando não há filtro explícito — evita misturar matches
  // de clientes diferentes na mesma lista.
  interface MatchGroup {
    wishId: string;
    wish: Record<string, unknown>;
    items: Record<string, unknown>[];
  }
  const matchGroups = useMemo<MatchGroup[]>(() => {
    if (wishId) return [{ wishId, wish: wishInfo ?? {}, items: sortedMatches }];
    const map = new Map<string, MatchGroup>();
    for (const m of sortedMatches) {
      const wish = m.wishes as Record<string, unknown> | undefined;
      if (!wish) continue;
      const wid = wish.id as string;
      const g = map.get(wid);
      if (g) g.items.push(m);
      else map.set(wid, { wishId: wid, wish, items: [m] });
    }
    // Ordena grupos por score do top match descendente (maior relevância primeiro)
    return Array.from(map.values()).sort((a, b) => {
      const sa = (a.items[0]?.score as number) ?? 0;
      const sb = (b.items[0]?.score as number) ?? 0;
      return sb - sa;
    });
  }, [wishId, wishInfo, sortedMatches]);

  // Soma fixa: 56 + 92 + 56 + 82 + 62 + 100 + 90 + 118 = 656
  // + veiculo min 140 + gaps + padding = ~844
  const gridTemplate = "minmax(140px, 1fr) 56px 92px 56px 82px 62px 100px 90px 118px";

  return (
    <DashboardLayout role="vendedor" subtitle={subtitle}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">
              {wishId && wishInfo ? `Matches de ${wishInfo.brand} ${wishInfo.model}` : "Meus Matches"}
            </h2>
            <span className="text-[13px] text-[#9AA0AB]">{matches.length}</span>
          </div>

          {wishId && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 h-[32px] pl-3 pr-1 rounded-full bg-[rgba(37,99,235,0.08)] text-[#2563EB] text-[12px] font-medium">
                <span>
                  {wishInfo ? (
                    <>Filtrado por: <span className="font-semibold">{wishInfo.client_name as string}</span></>
                  ) : "Filtrado"}
                </span>
                <button
                  onClick={clearFilter}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[rgba(37,99,235,0.15)] transition-colors"
                  aria-label="Limpar filtro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Link
                href="/vendedor/desejos"
                className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[8px] border border-[#E8EAEE] text-[12px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar aos desejos
              </Link>
            </div>
          )}
        </div>

        {/* States */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
        ) : matches.length === 0 ? (
          <div className="card-tradox text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" />
            <h3 className="text-[16px] font-semibold text-[#111827] mb-2">
              {wishId ? "Nenhum match para este desejo ainda" : "Nenhum match ainda"}
            </h3>
            <p className="text-[14px] text-[#5B6370]">
              {wishId
                ? "O motor de matching continua rodando. Você será notificado assim que aparecer um veículo compatível."
                : "O motor de matching está buscando veículos para seus clientes."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
          {matchGroups.map((group) => (
          <section key={group.wishId} className="space-y-2">
            {/* Cabeçalho do grupo — só aparece quando não há filtro explícito por desejo */}
            {!wishId && (
              <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-[14px] font-semibold text-[#111827] truncate">
                    {(group.wish.brand as string) ?? "—"} {(group.wish.model as string) ?? ""}
                  </h3>
                  {(group.wish.client_name as string) ? (
                    <span className="text-[12px] text-[#9AA0AB]">
                      · {group.wish.client_name as string}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-[#9AA0AB]">
                    · {group.items.length} match{group.items.length === 1 ? "" : "es"}
                  </span>
                </div>
                <Link
                  href={`/vendedor/matches?wishId=${encodeURIComponent(group.wishId)}`}
                  className="text-[11px] font-medium text-[#2563EB] hover:underline whitespace-nowrap"
                >
                  Ver só este desejo →
                </Link>
              </div>
            )}

            {/* ─── Desktop ≥1024px: List view ─── */}
            <div className="card-tradox !p-0 overflow-hidden hidden lg:block w-full min-w-0 max-w-full">
              {/* Header — ordenavel */}
              <div
                className="grid gap-1.5 px-3 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3] items-center w-full max-w-full"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <SortHeader label="Veículo" sortKey="vehicle" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Score" sortKey="score" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
                <SortHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
                <SortHeader label="Ano" sortKey="year" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
                <SortHeader label="KM" sortKey="km" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Data aval." sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
                <SortHeader label="Localização" sortKey="location" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Preço" sortKey="price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">Ações</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F3F4F6]">
                {group.items.map((m) => {
                  const offer = m.offers as Record<string, unknown> | undefined;
                  const wish = m.wishes as Record<string, unknown> | undefined;
                  if (!offer || !wish) return null;

                  const score = m.score as number;
                  const externalStatus = offer.external_status as string | null;
                  const statusCls = externalStatus ? (STATUS_CLS[externalStatus] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-500";
                  const syncedAt = offer.synced_at as string | undefined;

                  return (
                    <div
                      key={m.id as string}
                      className="grid gap-1.5 px-3 items-center min-h-[60px] hover:bg-[#FAFBFC] transition-colors w-full max-w-full"
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      {/* Veículo + concessionaria/vendedor como subtexto */}
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate" title={`${offer.brand} ${offer.model}${offer.version ? " · " + offer.version : ""}`}>
                          {offer.brand as string} {offer.model as string}
                        </p>
                        {(() => {
                          const dealership = offer.external_dealership_name as string | null;
                          const seller = offer.external_seller_name as string | null;
                          const parts: string[] = [];
                          if (seller) parts.push(seller);
                          if (dealership) parts.push(dealership);
                          const sub = parts.length > 0 ? parts.join(" · ") : (offer.version as string) || "—";
                          const fullTitle = parts.length > 0
                            ? [seller ? `Vendedor: ${seller}` : null, dealership ? `Concessionária: ${dealership}` : null].filter(Boolean).join("\n")
                            : sub;
                          return (
                            <p className="text-[11px] text-[#9AA0AB] leading-tight mt-0.5 truncate" title={fullTitle}>
                              {sub}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Score */}
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${scoreCls(score)}`}>
                          {score}%
                        </span>
                      </div>

                      {/* Status (do Avaliador Digital) */}
                      <div className="flex items-center justify-center min-w-0 overflow-hidden">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${statusCls}`}>
                          {externalStatus ?? "—"}
                        </span>
                      </div>

                      {/* Ano */}
                      <div className="text-[12px] text-[#5B6370] tabular-nums whitespace-nowrap text-center">
                        {(offer.year as number) ?? "—"}
                      </div>

                      {/* KM */}
                      <div className="text-right text-[11px] text-[#5B6370] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {((offer.km as number) ?? 0).toLocaleString("pt-BR")} km
                      </div>

                      {/* Data avaliação */}
                      <div className="text-[11px] text-[#5B6370] tabular-nums whitespace-nowrap text-center overflow-hidden text-ellipsis">
                        {syncedAt ? formatDate(syncedAt) : "—"}
                      </div>

                      {/* Localização */}
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <MapPin className="w-3 h-3 text-[#C1C7D0] shrink-0" />
                        <span className="text-[11px] text-[#5B6370] truncate" title={`${offer.city}/${offer.state}`}>
                          {offer.city as string}/{offer.state as string}
                        </span>
                      </div>

                      {/* Preço */}
                      <div className="text-right text-[12px] font-semibold text-[#2563EB] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {fmt(offer.price as number)}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailsOffer(offer)}
                          className="w-[28px] h-[28px] rounded-[6px] border border-[#E8EAEE] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center shrink-0"
                          aria-label="Ver detalhes completos"
                          title="Ver detalhes"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button className="h-[28px] px-3 rounded-[6px] bg-[#2563EB] text-white text-[11px] font-semibold hover:brightness-90 transition-all">
                          Contatar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Mobile / Tablet <1024px: stacked ─── */}
            <div className="card-tradox !p-0 overflow-hidden lg:hidden">
              <div className="divide-y divide-[#F3F4F6]">
                {group.items.map((m) => {
                  const offer = m.offers as Record<string, unknown> | undefined;
                  const wish = m.wishes as Record<string, unknown> | undefined;
                  if (!offer || !wish) return null;
                  const score = m.score as number;
                  const externalStatus = offer.external_status as string | null;
                  const statusCls = externalStatus ? (STATUS_CLS[externalStatus] ?? "bg-gray-100 text-gray-600") : "";
                  const syncedAt = offer.synced_at as string | undefined;

                  return (
                    <div key={m.id as string} className="p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${scoreCls(score)}`}>{score}%</span>
                        {externalStatus && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls}`}>{externalStatus}</span>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-[#111827] truncate">{offer.brand as string} {offer.model as string}</p>
                      {offer.version ? (
                        <p className="text-[12px] text-[#9AA0AB] truncate">{offer.version as string}</p>
                      ) : null}
                      {(offer.external_dealership_name || offer.external_seller_name) ? (
                        <p className="text-[12px] text-[#5B6370] truncate mt-0.5">
                          {[offer.external_seller_name as string | null, offer.external_dealership_name as string | null].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      <p className="text-[12px] text-[#9AA0AB] truncate mt-1">
                        {offer.year as number} · {((offer.km as number) ?? 0).toLocaleString("pt-BR")} km
                        {syncedAt ? ` · avaliado em ${formatDate(syncedAt)}` : ""}
                      </p>
                      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                        <p className="text-[16px] font-bold text-[#2563EB] tabular-nums">{fmt(offer.price as number)}</p>
                        <div className="flex items-center gap-1 text-[11px] text-[#9AA0AB]">
                          <MapPin className="w-3 h-3" />{offer.city as string}/{offer.state as string}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsOffer(offer)}
                          className="h-[34px] px-3 rounded-[8px] border border-[#E8EAEE] text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-1.5 text-[12px] font-medium shrink-0"
                          aria-label="Ver detalhes completos"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Detalhes
                        </button>
                        <button className="flex-1 h-[34px] rounded-[8px] bg-[#2563EB] text-white text-[12px] font-semibold hover:brightness-90 transition-all">
                          Contatar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes — exibe dados completos sem comprometer a lista */}
      {detailsOffer ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDetailsOffer(null)}
        >
          <div
            className="bg-white rounded-[12px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#EEF0F3]">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] font-semibold">Detalhes do veículo</p>
                <h3 className="text-[16px] font-semibold text-[#111827] mt-1 leading-tight">
                  {detailsOffer.brand as string} {detailsOffer.model as string}
                </h3>
                {detailsOffer.version ? (
                  <p className="text-[12px] text-[#5B6370] mt-0.5">{detailsOffer.version as string}</p>
                ) : null}
              </div>
              <button
                onClick={() => setDetailsOffer(null)}
                className="w-8 h-8 rounded-[8px] hover:bg-[#F3F4F6] text-[#5B6370] flex items-center justify-center shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Ano</p>
                  <p className="text-[#111827] font-medium">{(detailsOffer.year as number) ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">KM</p>
                  <p className="text-[#111827] font-medium">{((detailsOffer.km as number) ?? 0).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Cor</p>
                  <p className="text-[#111827] font-medium">{(detailsOffer.color as string) || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Preço</p>
                  <p className="text-[#2563EB] font-semibold">{fmt(detailsOffer.price as number)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Localização</p>
                  <p className="text-[#111827] font-medium">{detailsOffer.city as string}/{detailsOffer.state as string}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Data da avaliação</p>
                  <p className="text-[#111827] font-medium">
                    {detailsOffer.synced_at ? formatDate(detailsOffer.synced_at as string) : "—"}
                  </p>
                </div>
              </div>

              {(detailsOffer.external_seller_name || detailsOffer.external_dealership_name || detailsOffer.external_status) ? (
                <div className="border-t border-[#EEF0F3] pt-4 space-y-3">
                  {detailsOffer.external_status ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Status da avaliação</p>
                      <p className="text-[#111827] font-medium">{detailsOffer.external_status as string}</p>
                    </div>
                  ) : null}
                  {detailsOffer.external_seller_name ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Vendedor</p>
                      <p className="text-[#111827] font-medium break-words">{detailsOffer.external_seller_name as string}</p>
                    </div>
                  ) : null}
                  {detailsOffer.external_dealership_name ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4px] text-[#9AA0AB] mb-1">Concessionária</p>
                      <p className="text-[#111827] font-medium break-words">{detailsOffer.external_dealership_name as string}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="px-5 pb-5 pt-2 flex items-center gap-2">
              <button
                onClick={() => setDetailsOffer(null)}
                className="flex-1 h-[40px] rounded-[8px] border border-[#E8EAEE] text-[#5B6370] text-[13px] font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                Fechar
              </button>
              <button
                className="flex-1 h-[40px] rounded-[8px] bg-[#2563EB] text-white text-[13px] font-semibold hover:brightness-90 transition-all"
              >
                Contatar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout role="vendedor" subtitle="Carregando matches">
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div>
      </DashboardLayout>
    }>
      <MatchesContent />
    </Suspense>
  );
}
