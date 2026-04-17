"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Zap, Loader2, X, ArrowLeft, MapPin } from "lucide-react";

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

function MatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wishId = searchParams.get("wishId");

  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [wishInfo, setWishInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Soma fixa: 56 + 92 + 56 + 82 + 62 + 100 + 90 + 130 = 668
  // + veiculo min 140 + gaps + padding = ~856
  const gridTemplate = "minmax(140px, 1fr) 56px 92px 56px 82px 62px 100px 90px 130px";

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
          <>
            {/* ─── Desktop ≥1024px: List view ─── */}
            <div className="card-tradox !p-0 overflow-hidden hidden lg:block w-full min-w-0 max-w-full">
              {/* Header */}
              <div
                className="grid gap-1.5 px-3 py-3 bg-[#F7F8FA] border-b border-[#EEF0F3] items-center w-full max-w-full"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Veículo</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-center min-w-0 overflow-hidden">Score</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-center min-w-0 overflow-hidden">Status</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-center min-w-0 overflow-hidden">Ano</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">KM</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-center min-w-0 overflow-hidden">Data aval.</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] min-w-0 overflow-hidden">Localização</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">Preço</span>
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.4px] text-right min-w-0 overflow-hidden">Ações</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F3F4F6]">
                {matches.map((m) => {
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
                      {/* Veículo (+ versão como subtexto, SEM "Para cliente") */}
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate" title={`${offer.brand} ${offer.model}`}>
                          {offer.brand as string} {offer.model as string}
                        </p>
                        <p className="text-[11px] text-[#9AA0AB] leading-tight mt-0.5 truncate" title={(offer.version as string) || undefined}>
                          {offer.version ? (offer.version as string) : "—"}
                        </p>
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
                        <button className="h-[26px] px-2.5 rounded-[6px] bg-[#2563EB] text-white text-[11px] font-semibold hover:brightness-90 transition-all">
                          Contatar
                        </button>
                        <button className="h-[26px] px-2.5 rounded-[6px] border border-[#E8EAEE] text-[11px] font-medium text-[#5B6370] hover:border-[#E5484D] hover:text-[#E5484D] transition-colors">
                          Rejeitar
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
                {matches.map((m) => {
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
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 h-[34px] rounded-[8px] bg-[#2563EB] text-white text-[12px] font-semibold hover:brightness-90 transition-all">
                          Contatar
                        </button>
                        <button className="h-[34px] px-4 rounded-[8px] border border-[#E8EAEE] text-[12px] font-medium text-[#5B6370] hover:border-[#E5484D] hover:text-[#E5484D] transition-colors">
                          Rejeitar
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
