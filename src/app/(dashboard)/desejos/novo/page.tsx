"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WishForm } from "@/components/forms/wish-form";
import { CheckCircle2, Zap, MapPin, Sparkles, PlusCircle, ArrowRight, Pencil, CalendarClock } from "lucide-react";
import type { WishFormData } from "@/lib/validators/wish";

interface ImmediateMatch {
  score: number;
  offer: {
    brand: string; model: string; version?: string; year: number; km: number;
    color?: string; price: number; city: string; state: string; source: string;
    externalStatus?: string;
    syncedAt?: string;
  };
}

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  marketplace: { label: "Marketplace", cls: "bg-purple-50 text-purple-700" },
  avaliador: { label: "Avaliador Digital", cls: "bg-blue-50 text-blue-700" },
  estoque_lojista: { label: "Lojista", cls: "bg-green-50 text-green-700" },
};

const STATUS_CLS: Record<string, string> = {
  Avaliado: "bg-[rgba(37,99,235,0.1)] text-[#2563EB]",
  Publicado: "bg-green-50 text-green-700",
  Pendente: "bg-amber-50 text-amber-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmt(v: number) {
  if (v === 0) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-[rgba(37,99,235,0.1)] text-[#2563EB]";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

type Mode =
  | { kind: "form" }
  | { kind: "result"; matches: ImmediateMatch[]; wishId: string; lastData: WishFormData }
  | { kind: "edit"; wishId: string; data: WishFormData };

export default function NovoDesejoPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "form" });

  async function handleCreate(data: WishFormData) {
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
    setMode({
      kind: "result",
      matches: body.immediateMatches ?? [],
      wishId: body.wish.id,
      lastData: data,
    });
  }

  function makeEditHandler(wishId: string) {
    return async (data: WishFormData) => {
      const res = await fetch(`/api/desejos/${wishId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao atualizar desejo");
      }
      const body = await res.json();
      setMode({
        kind: "result",
        matches: body.immediateMatches ?? [],
        wishId,
        lastData: data,
      });
    };
  }

  // ─── Modo edição ───
  if (mode.kind === "edit") {
    const editSubmit = makeEditHandler(mode.wishId);
    return (
      <DashboardLayout role="vendedor" subtitle="Editar o desejo cadastrado">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-[20px] font-semibold text-[#111827] mb-2">Editar Desejo</h2>
              <p className="text-[14px] text-[#5B6370]">
                Ao salvar, o matching será refeito com os novos critérios.
              </p>
            </div>
            <button
              onClick={() => setMode({ kind: "result", matches: [], wishId: mode.wishId, lastData: mode.data })}
              className="text-[13px] text-[#5B6370] hover:text-[#111827] transition-colors"
            >
              Cancelar
            </button>
          </div>
          <WishForm
            onSubmit={editSubmit}
            initialData={mode.data}
            submitLabel="Salvar alterações"
          />
        </div>
      </DashboardLayout>
    );
  }

  // ─── Tela de resultado ───
  if (mode.kind === "result") {
    const { matches, wishId, lastData } = mode;
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
                    ? `${matches.length} match${matches.length === 1 ? "" : "es"} encontrado${matches.length === 1 ? "" : "s"}!`
                    : "Desejo salvo"}
                </h2>
                <p className="text-[14px] text-[#5B6370] mt-1">
                  {hasMatches
                    ? `Encontramos ${lastData.brand} ${lastData.model} na rede. Confira abaixo.`
                    : `Ainda não há ${lastData.brand} ${lastData.model} disponível. Vamos notificar você quando aparecer.`}
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
                const statusCls = m.offer.externalStatus ? (STATUS_CLS[m.offer.externalStatus] ?? "bg-gray-100 text-gray-600") : "";
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
                          {m.offer.externalStatus && (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls}`}>
                              {m.offer.externalStatus}
                            </span>
                          )}
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
                        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#9AA0AB] flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {m.offer.city}/{m.offer.state}
                          </span>
                          {m.offer.syncedAt && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                Avaliado em {formatDate(m.offer.syncedAt)}
                              </span>
                            </>
                          )}
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

          {/* Empty state */}
          {!hasMatches && (
            <div className="card-tradox text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F7F8FA] mb-4">
                <Zap className="w-6 h-6 text-[#9AA0AB]" />
              </div>
              <p className="text-[14px] text-[#5B6370] max-w-md mx-auto">
                O motor de matching continua rodando em segundo plano. Você receberá uma notificação
                assim que um veículo compatível for detectado no Avaliador Digital, Marketplace ou no estoque de lojistas.
              </p>
              <p className="text-[13px] text-[#9AA0AB] mt-3">
                Dica: ampliar a faixa de ano ou km pode gerar mais resultados.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setMode({ kind: "edit", wishId, data: lastData })}
              className="h-[44px] px-5 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium hover:bg-[#1D4ED8] transition-all inline-flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar desejo
            </button>
            <button
              onClick={() => setMode({ kind: "form" })}
              className="h-[44px] px-5 rounded-[10px] border border-[#E8EAEE] text-[14px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-all inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar outro
            </button>
            <Link
              href="/vendedor/desejos"
              className="h-[44px] px-5 rounded-[10px] border border-[#E8EAEE] text-[14px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-all inline-flex items-center gap-2"
            >
              Meus desejos <ArrowRight className="w-4 h-4" />
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

  // ─── Modo formulário (novo) ───
  return (
    <DashboardLayout role="vendedor" subtitle="Cadastre o veículo que seu cliente procura">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-[20px] font-semibold text-[#111827] mb-2">Novo Desejo de Compra</h2>
          <p className="text-[14px] text-[#5B6370]">
            Ao cadastrar, o sistema já varre as bases do ecossistema e mostra aqui mesmo se há veículos compatíveis.
          </p>
        </div>
        <WishForm onSubmit={handleCreate} />
      </div>
    </DashboardLayout>
  );
}
