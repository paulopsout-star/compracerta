"use client";

import { Eyebrow, FadeIn, GridTexture } from "./shared";
import { Database, Store, Package, MessageCircle, Car } from "lucide-react";

const ORBITAL_ITEMS = [
  { icon: Database, label: "Avaliador Digital", desc: "Veículos em avaliação nas concessionárias", angle: 0 },
  { icon: Store, label: "Marketplace Canal do Repasse", desc: "Anúncios ativos de concessionárias", angle: 120 },
  { icon: Package, label: "Estoque de Lojistas", desc: "Upload via planilha CSV, XLS ou PDF", angle: 240 },
];

const INTEGRATIONS = [
  { label: "WhatsApp Business API", icon: MessageCircle },
  { label: "Tabela FIPE", icon: Car },
  { label: "SSO Canal do Repasse", icon: Store },
];

export function Ecosystem() {
  return (
    <section id="ecossistema" className="relative py-[clamp(80px,10vh,160px)] bg-white overflow-hidden">
      <GridTexture />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
        <FadeIn>
          <div className="text-center mb-16">
            <Eyebrow>Ecossistema integrado</Eyebrow>
            <h2 className="text-[clamp(28px,4vw,48px)] font-bold text-[#111827] leading-tight">
              O Compra Certa não trabalha sozinho.
            </h2>
            <p className="text-[16px] text-[#5B6370] mt-4 max-w-xl mx-auto">
              Ele conecta três bases em tempo real dentro do universo Canal do Repasse.
            </p>
          </div>
        </FadeIn>

        {/* Orbital diagram */}
        <FadeIn delay={200}>
          <div className="relative max-w-[500px] mx-auto aspect-square mb-16">
            {/* Orbital rings */}
            <div className="absolute inset-[15%] rounded-full border-2 border-dashed border-[#2563EB]/10" />
            <div className="absolute inset-[5%] rounded-full border border-[#2563EB]/5" />

            {/* Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full bg-[#2563EB] flex items-center justify-center shadow-xl shadow-[#2563EB]/20 z-10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[50px] text-[12px] font-bold text-[#2563EB] whitespace-nowrap z-10">Compra Certa</p>

            {/* Orbital nodes */}
            {ORBITAL_ITEMS.map((item, i) => {
              const radius = 42; // percentage from center
              const angleRad = ((item.angle - 90) * Math.PI) / 180;
              const x = 50 + radius * Math.cos(angleRad);
              const y = 50 + radius * Math.sin(angleRad);
              return (
                <div key={item.label} className="absolute z-10" style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -50%)" }}>
                  <div className="w-[56px] h-[56px] rounded-full bg-white border-2 border-[#E8EAEE] flex items-center justify-center shadow-md hover:border-[#2563EB]/40 hover:shadow-lg hover:shadow-[#2563EB]/10 transition-all">
                    <item.icon className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <div className="text-center mt-2 w-[140px] -ml-[42px]">
                    <p className="text-[12px] font-bold text-[#111827]">{item.label}</p>
                    <p className="text-[10px] text-[#9AA0AB] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}

            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              {ORBITAL_ITEMS.map((item) => {
                const r = 42;
                const a = ((item.angle - 90) * Math.PI) / 180;
                return <line key={item.label} x1="50" y1="50" x2={50 + r * Math.cos(a)} y2={50 + r * Math.sin(a)} stroke="#2563EB" strokeWidth="0.3" strokeDasharray="1.5 1.5" opacity="0.3" />;
              })}
            </svg>
          </div>
        </FadeIn>

        {/* Integrations */}
        <FadeIn delay={300}>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#9AA0AB] uppercase tracking-[1.5px] mb-6">Compatível com seu fluxo</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {INTEGRATIONS.map((int) => (
                <div key={int.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F7F8FA] border border-[#E8EAEE] text-[13px] font-medium text-[#5B6370]">
                  <int.icon className="w-4 h-4 text-[#2563EB]" />
                  {int.label}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
