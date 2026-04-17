"use client";

import { Database, Radar, MessageCircle, TrendingUp } from "lucide-react";
import { Eyebrow, FadeIn, DiagonalStripes } from "./shared";

const PILLARS = [
  { icon: Database, title: "Três bases conectadas", desc: "Avaliador Digital, Marketplace Canal do Repasse e estoque de lojistas parceiros — tudo em um só lugar." },
  { icon: Radar, title: "Matching em tempo real", desc: "Score 0-100 calculado com 8 critérios: marca, modelo, ano, km, preço, cor, câmbio e localização." },
  { icon: MessageCircle, title: "Notificação via WhatsApp", desc: "Vendedores, lojistas e avaliadores recebem os matches direto no celular." },
  { icon: TrendingUp, title: "Feito para escalar", desc: "Arquitetura preparada para expansão nacional. De MG e GO para todo o Brasil." },
];

export function ProofOfNetwork() {
  return (
    <section className="relative py-[clamp(80px,10vh,140px)] bg-gradient-to-b from-[#0F1219] to-[#141822] overflow-hidden">
      <DiagonalStripes />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
        <FadeIn>
          <Eyebrow>Por que Compra Certa</Eyebrow>
          <h2 className="text-[clamp(28px,4vw,48px)] font-bold text-white leading-tight max-w-2xl">
            Um ecossistema pensado para não perder oportunidade.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {PILLARS.map((p, i) => (
            <FadeIn key={p.title} delay={i * 120}>
              <div className="relative p-7 rounded-[16px] bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:border-[#3B82F6]/25 transition-colors h-full">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#3B82F6]/10 mb-4">
                  <p.icon className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <p className="text-[18px] font-bold text-white">{p.title}</p>
                <p className="text-[14px] text-white/50 mt-2 leading-relaxed">{p.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
