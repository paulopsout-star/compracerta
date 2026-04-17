"use client";

import { FileText, Radar, MessageCircle } from "lucide-react";
import { Eyebrow, FadeIn, GridTexture } from "./shared";

const STEPS = [
  {
    num: "01",
    icon: FileText,
    title: "Cadastre o desejo",
    desc: "O vendedor registra o veículo que o cliente procura: marca, modelo, faixa de preço, ano, quilometragem e região. Leva menos de 1 minuto.",
    iconColor: "#2563EB",
  },
  {
    num: "02",
    icon: Radar,
    title: "Matching automático",
    desc: "O motor de inteligência varre continuamente 3 bases do ecossistema: Avaliador Digital, Marketplace Canal do Repasse e estoque de lojistas parceiros.",
    iconColor: "#3B82F6",
  },
  {
    num: "03",
    icon: MessageCircle,
    title: "Notificação instantânea",
    desc: "Assim que há match, o vendedor, o avaliador ou o lojista recebe a notificação direto no WhatsApp. Conexão imediata, negócio mais rápido.",
    iconColor: "#25D366",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative py-[clamp(80px,10vh,160px)] bg-white overflow-hidden">
      <GridTexture />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
        <FadeIn>
          <div className="text-center mb-16">
            <Eyebrow>Como funciona</Eyebrow>
            <h2 className="text-[clamp(28px,4vw,48px)] font-bold text-[#111827] leading-tight">
              Três passos para transformar<br className="hidden md:block" /> desejo em venda.
            </h2>
          </div>
        </FadeIn>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-[2px]">
            <div className="w-full h-full border-t-2 border-dashed border-[#2563EB]/20" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 200}>
                <div className="relative text-center md:text-left" style={{ transform: `translateY(${i * 20}px)` }}>
                  {/* Large watermark number */}
                  <span className="absolute -top-4 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 text-[100px] font-black text-[#F1F3F5] leading-none select-none pointer-events-none">{step.num}</span>

                  {/* Icon circle */}
                  <div className="relative z-10 w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto md:mx-0 mb-5" style={{ backgroundColor: `${step.iconColor}15` }}>
                    <step.icon className="w-6 h-6" style={{ color: step.iconColor }} />
                    {/* Pulse dot on line */}
                    <div className="hidden md:block absolute -top-[2px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white shadow" />
                  </div>

                  <h3 className="relative z-10 text-[20px] font-bold text-[#111827] mb-3">{step.title}</h3>
                  <p className="relative z-10 text-[14px] text-[#5B6370] leading-relaxed max-w-[320px] mx-auto md:mx-0">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
