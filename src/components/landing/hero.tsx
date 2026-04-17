"use client";

import Link from "next/link";
import { Play, ChevronDown, Car } from "lucide-react";
import { GlitchText, Eyebrow, Particles, DiagonalStripes, TopoTexture } from "./shared";

const BRAND_CARDS = [
  { brand: "Honda Civic", caption: "ALTA DEMANDA", initial: "H", color: "#E40521" },
  { brand: "Toyota Corolla", caption: "TOP MATCH DA SEMANA", initial: "T", color: "#1A1A1A" },
  { brand: "Jeep Compass", caption: "MAIS PROCURADO", initial: "J", color: "#3D5A1E" },
  { brand: "VW T-Cross", caption: "TENDÊNCIA 2026", initial: "V", color: "#001E50" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#0A0D12] via-[#0F1219] to-[#141822] overflow-hidden flex flex-col">
      <TopoTexture />
      <DiagonalStripes />
      <Particles count={55} />

      {/* Concentric rings */}
      <div className="absolute right-[8%] top-[40%] -translate-y-1/2 hidden lg:block pointer-events-none">
        {[180, 260, 340].map((s, i) => (
          <div key={s} className="absolute rounded-full border border-dashed border-[#3B82F6]/15 animate-spin-slow" style={{ width: s, height: s, top: `calc(50% - ${s / 2}px)`, left: `calc(50% - ${s / 2}px)`, animationDuration: `${20 + i * 10}s` }} />
        ))}
        <div className="absolute w-32 h-32 rounded-full bg-[#3B82F6]/8 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-24 h-24 rounded-full bg-[#3B82F6]/15 backdrop-blur-md flex items-center justify-center border border-[#3B82F6]/20">
            <Car className="w-12 h-12 text-[#3B82F6]" />
          </div>
        </div>
      </div>

      {/* Coordinate labels */}
      <div className="absolute bottom-32 left-6 md:left-10 text-[10px] font-mono text-white/10 space-y-1 pointer-events-none hidden md:block">
        <p>BELO HORIZONTE 19°55&apos;S 43°56&apos;W</p>
        <p>GOIÂNIA 16°40&apos;S 49°15&apos;W</p>
        <p>REDE ATIVA • 24/7</p>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-16 pt-[100px] pb-8">
        <div className="max-w-[720px]">
          <Eyebrow>Plataforma B2B de matching automotivo</Eyebrow>

          <div className="space-y-1">
            <GlitchText text="TRANSFORME" className="text-[clamp(40px,8vw,120px)] font-black leading-[0.9] tracking-[-2px]" />
            <GlitchText text="DESEJOS EM" className="text-[clamp(40px,8vw,120px)] font-black leading-[0.9] tracking-[-2px]" />
            <GlitchText text="VENDAS REAIS" className="text-[clamp(40px,8vw,120px)] font-black leading-[0.9] tracking-[-2px]" />
          </div>

          <p className="text-[clamp(15px,1.4vw,20px)] text-white/50 max-w-[540px] leading-relaxed mt-6">
            A rede que conecta o carro que seu cliente quer com o estoque que a rede tem.
            Match automático em tempo real, notificação direta no WhatsApp.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/login" className="h-[52px] px-8 rounded-[10px] bg-[#2563EB] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-all shadow-xl shadow-[#2563EB]/25 hover:shadow-2xl hover:shadow-[#2563EB]/30">
              Solicitar acesso
            </Link>
            <a href="#como-funciona" className="h-[52px] px-8 rounded-[10px] border border-[#3B82F6]/30 text-white/80 text-[15px] font-medium inline-flex items-center justify-center gap-2 hover:border-[#3B82F6]/60 hover:text-white transition-all">
              <Play className="w-4 h-4 fill-current" /> Ver como funciona
            </a>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-2 mt-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3B82F6]" />
            </span>
            <span className="text-[13px] text-white/40">2.847 desejos ativos agora</span>
          </div>
        </div>
      </div>

      {/* Brand cards */}
      <div className="relative z-10 px-6 md:px-10 lg:px-16 pb-8">
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-hide">
          {BRAND_CARDS.map((card, i) => (
            <div key={card.brand} className="shrink-0 w-[180px] md:w-[200px] bg-white rounded-[12px] p-4 shadow-lg shadow-black/20 snap-start hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3B82F6]/10 transition-all duration-300" style={{ transform: `rotate(${-3 + i * 1.5}deg)` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: card.color }}>{card.initial}</div>
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#3B82F6]" /></span>
              </div>
              <p className="text-[14px] font-bold text-[#111827]">{card.brand}</p>
              <p className="text-[9px] font-semibold text-[#3B82F6] uppercase tracking-[1.5px] mt-0.5">{card.caption}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex flex-col items-center pb-6 text-white/20">
        <span className="text-[11px] mb-2">Role para explorar</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </div>
    </section>
  );
}
