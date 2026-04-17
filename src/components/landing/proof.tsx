"use client";

import { Car, Building2, Target, Clock } from "lucide-react";
import { Counter, Eyebrow, FadeIn, DiagonalStripes } from "./shared";

const METRICS = [
  { icon: Car, target: 12500, prefix: "+", suffix: "", label: "Veículos na rede" },
  { icon: Building2, target: 2800, prefix: "", suffix: "+", label: "Concessionárias e lojistas" },
  { icon: Target, target: 87, prefix: "", suffix: "%", label: "Taxa média de match" },
  { icon: Clock, target: 24, prefix: "< ", suffix: "h", label: "Até a primeira notificação" },
];

export function ProofOfNetwork() {
  return (
    <section className="relative py-[clamp(80px,10vh,140px)] bg-gradient-to-b from-[#0F1219] to-[#141822] overflow-hidden">
      <DiagonalStripes />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
        <FadeIn>
          <Eyebrow>A rede em números</Eyebrow>
          <h2 className="text-[clamp(28px,4vw,48px)] font-bold text-white leading-tight max-w-lg">
            Um ecossistema em movimento constante.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {METRICS.map((m, i) => (
            <FadeIn key={m.label} delay={i * 150}>
              <div className="relative p-6 rounded-[16px] bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:border-[#3B82F6]/20 transition-colors">
                <m.icon className="w-5 h-5 text-[#3B82F6] mb-4" />
                <p className="text-[clamp(36px,5vw,64px)] font-black text-white leading-none" style={{ textShadow: "0 0 30px rgba(59,130,246,0.15)" }}>
                  <Counter target={m.target} prefix={m.prefix} suffix={m.suffix} />
                </p>
                <p className="text-[12px] text-white/40 uppercase tracking-[1.5px] font-medium mt-3">{m.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Mapa estilizado do Brasil */}
        <FadeIn delay={400}>
          <div className="mt-16 flex items-center justify-center">
            <div className="relative w-[280px] h-[200px]">
              {/* Simplified Brazil shape with active cities */}
              <svg viewBox="0 0 280 200" className="w-full h-full text-white/[0.06]" fill="currentColor">
                <path d="M140 10 C200 20 250 60 260 100 C270 140 240 170 200 185 C160 195 120 190 80 180 C40 165 20 140 15 110 C10 80 30 40 70 25 C100 15 120 8 140 10Z" />
              </svg>
              {/* BH point */}
              <div className="absolute" style={{ top: "45%", left: "60%" }}>
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-50" /><span className="relative inline-flex rounded-full h-3 w-3 bg-[#3B82F6]" /></span>
                <span className="absolute top-4 -left-6 text-[9px] text-white/30 whitespace-nowrap font-mono">BH</span>
              </div>
              {/* Goiânia point */}
              <div className="absolute" style={{ top: "38%", left: "45%" }}>
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-50" style={{ animationDelay: "1s" }} /><span className="relative inline-flex rounded-full h-3 w-3 bg-[#3B82F6]" /></span>
                <span className="absolute top-4 -left-6 text-[9px] text-white/30 whitespace-nowrap font-mono">GOI</span>
              </div>
              {/* Connection line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 200">
                <line x1="126" y1="76" x2="168" y2="90" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              </svg>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
