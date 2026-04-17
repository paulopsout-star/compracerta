"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WishForm } from "@/components/forms/wish-form";
import { CheckCircle2, Zap, MapPin, Sparkles, PlusCircle, ArrowRight } from "lucide-react";
import type { WishFormData } from "@/lib/validators/wish";

interface ImmediateMatch {
  score: number;
  offer: {
    brand: string;
    model: string;
    version?: string;
    year: number;
    km: number;
    color?: string;
    price: number;
    city: string;
    state: string;
    source: string;
  };
}

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  marketplace: { label: "Marketplace", cls: "bg-purple-50 text-purple-700" },
  avaliador: { label: "Avaliador Digital", cls: "bg-blue-50 text-blue-700" },
  estoque_lojista: { label: "Lojista", cls: "bg-green-50 text-green-700" },
};

function fmt(v: number) {
  if (v === 0) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-[rgba(37,99,235,0.1)] text-[#2563EB]";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export default function NovoDesejoPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<ImmediateMatch[] | null>(null);
  const [wishBrand, setWishBrand] = useState("");
  const [wishModel, setWishModel] = useState("");

  async function handleSubmit(data: WishFormData) {
    const res = await fetch("/api/desejos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erro ao cadastrar desejo");
    }

    const body = await res.json();
    setWishBrand(data.brand);
    setWishModel(data.model);
    setMatches(body.immediateMatches ?? []);
  }

  // Success screen with immediate matches
  if (matches !== null) {
    const hasMatches = matches.length > 0;
    return (
      <DashboardLayout role="vendedor" subtitle="Resultado do cadastro">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Success banner */}
          <div className="card-tradox">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(37,99,235,0.1)] shrink-0">
                {hasMatches ? (
                  <Sparkles className="w-6 h-6 text-[#2563EB]" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-[#2563EB]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-bold text-[#111827]">
                  {hasMatches
                    ? `${matches.length} match${matches.length === 1 ? "" : "es"} encontrado${matches.length === 1 ? "" : "s"} já no cadastro!`
                    : "Desejo cadastrado com sucesso"}
                </h2>
                <p className="text-[14px] text-[#5B6370] mt-1">
                  {hasMatches
                    ? `Encontramos ${wishBrand} ${wishModel} na rede agora mesmo. Confira abaixo.`
                    : `Ainda não há ${wishBrand} ${wishModel} na rede. Vamos notificar você assim que aparecer.`}
                </p>
              </div>
            </div>
          </div>

          {/* Matches list */}
          {hasMatches && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Zap className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Veículos disponíveis agora</h3>
              </div>

              {matches.map((m, i) => {
                const src = SOURCE_LABEL[m.offer.source] ?? SOURCE_LABEL.marketplace;
                return (
                  <div key={i} className="card-tradox hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${scoreColor(m.score)}`}>
                            {m.score}% match
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${src.cls}`}>
                            {src.label}
                          </span>
                        </div>
                        <p className="text-[16px] font-bold text-[#111827]">
                          {m.offer.brand} {m.offer.model}
                        </p>
                        {m.offer.version && (
                          <p className="text-[13px] text-[#5B6370]">{m.offer.version}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[13px] text-[#5B6370] flex-wrap">
                          <span>{m.offer.year}</span>
                          <span>·</span>
                          <span>{m.offer.km.toLocaleString("pt-BR")} km</span>
                          {m.offer.color && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{m.offer.color.toLowerCase()}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-[12px] text-[#9AA0AB]">
                          <MapPin className="w-3 h-3" />
                          {m.offer.city}/{m.offer.state}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[18px] font-bold text-[#2563EB] tabular-nums">
                          {fmt(m.offer.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state for no matches */}
          {!hasMatches && (
            <div className="card-tradox text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F7F8FA] mb-4">
                <Zap className="w-6 h-6 text-[#9AA0AB]" />
              </div>
              <p className="text-[14px] text-[#5B6370] max-w-md mx-auto">
                O motor de matching continua rodando em segundo plano. Você receberá uma notificação
                assim que um veículo compatível for detectado no Avaliador Digital, Marketplace ou no estoque de lojistas.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { setMatches(null); setWishBrand(""); setWishModel(""); }}
              className="h-[44px] px-5 rounded-[10px] border border-[#E8EAEE] text-[14px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-all inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar outro desejo
            </button>
            <Link
              href="/vendedor/desejos"
              className="h-[44px] px-5 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:bg-[#1D4ED8] transition-all inline-flex items-center gap-2"
            >
              Ver meus desejos <ArrowRight className="w-4 h-4" />
            </Link>
            {hasMatches && (
              <button
                onClick={() => router.push("/vendedor/matches")}
                className="h-[44px] px-5 rounded-[10px] bg-[#1A1D23] text-white text-[14px] font-medium hover:bg-[#2A2E35] transition-all inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Todos os matches
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Form
  return (
    <DashboardLayout role="vendedor" subtitle="Cadastre o veículo que seu cliente procura">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-[20px] font-semibold text-[#111827] mb-2">Novo Desejo de Compra</h2>
          <p className="text-[14px] text-[#5B6370]">
            Ao cadastrar, o sistema já varre as bases do ecossistema e mostra aqui mesmo se há veículos compatíveis.
          </p>
        </div>
        <WishForm onSubmit={handleSubmit} />
      </div>
    </DashboardLayout>
  );
}
