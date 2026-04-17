"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Zap, Loader2, MapPin, X, ArrowLeft } from "lucide-react";

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v); }

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  marketplace: { label: "Marketplace", cls: "bg-purple-50 text-purple-700" },
  avaliador: { label: "Avaliador", cls: "bg-blue-50 text-blue-700" },
  estoque_lojista: { label: "Lojista", cls: "bg-green-50 text-green-700" },
};

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

  function clearFilter() {
    router.push("/vendedor/matches");
  }

  return (
    <DashboardLayout role="vendedor" subtitle={subtitle}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">
              {wishId && wishInfo ? `Matches de ${wishInfo.brand} ${wishInfo.model}` : "Meus Matches"}
            </h2>
            <span className="text-[13px] text-[#9AA0AB]">{matches.length}</span>
          </div>

          {/* Filter indicator + clear button */}
          {wishId && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 h-[32px] pl-3 pr-1 rounded-full bg-[rgba(37,99,235,0.08)] text-[#2563EB] text-[12px] font-medium">
                <span>
                  {wishInfo ? (
                    <>
                      Filtrado por: <span className="font-semibold">{wishInfo.client_name as string}</span>
                    </>
                  ) : (
                    "Filtrado"
                  )}
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
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map((m) => {
              const offer = m.offers as Record<string, unknown> | undefined;
              const wish = m.wishes as Record<string, unknown> | undefined;
              if (!offer || !wish) return null;
              const score = m.score as number;
              const scoreCls = score >= 80 ? "bg-[rgba(37,99,235,0.1)] text-[#2563EB]" : score >= 60 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600";
              const src = SOURCE_LABEL[offer.source as string] ?? SOURCE_LABEL.marketplace;
              return (
                <div key={m.id as string} className="card-tradox">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${scoreCls}`}>{score}%</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${src.cls}`}>{src.label}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#111827]">{offer.brand as string} {offer.model as string}</h3>
                  <p className="text-[13px] text-[#5B6370]">{offer.version as string} · {offer.year as number} · {((offer.km as number) ?? 0).toLocaleString("pt-BR")} km</p>
                  <p className="text-[18px] font-bold text-[#2563EB] mt-2">{fmt(offer.price as number)}</p>
                  <div className="flex items-center gap-1 mt-1 text-[12px] text-[#9AA0AB]"><MapPin className="w-3 h-3" />{offer.city as string}/{offer.state as string}</div>
                  <p className="text-[12px] text-[#9AA0AB] mt-2">Para: {wish.client_name as string}</p>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 h-[36px] rounded-[8px] bg-[#2563EB] text-white text-[13px] font-medium hover:brightness-90 transition-all">Contatar</button>
                    <button className="h-[36px] px-4 rounded-[8px] border border-[#E8EAEE] text-[13px] font-medium text-[#5B6370] hover:border-[#E5484D] hover:text-[#E5484D] transition-colors">Rejeitar</button>
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
