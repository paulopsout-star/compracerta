"use client";

import { CheckCircle } from "lucide-react";
import { Eyebrow, FadeIn, Particles } from "./shared";

const PERSONAS = [
  {
    tag: "VENDEDORES", title: "Converta o que seria perdido", color: "#2563EB",
    items: ["Cadastre o desejo em 1 minuto", "Receba matches direto no WhatsApp", "Acompanhe conversão em dashboard"],
  },
  {
    tag: "GESTORES", title: "Visibilidade total da equipe", color: "#3B82F6",
    items: ["Ranking de performance por vendedor", "Oportunidades perdidas mapeadas", "Insights de demanda da sua região"],
  },
  {
    tag: "LOJISTAS MULTIMARCAS", title: "Seu estoque ativamente procurado", color: "#60A5FA",
    items: ["Upload simples via PDF, CSV ou XLS", "Compradores qualificados chegam até você", "Aumento real de giro de estoque"],
  },
  {
    tag: "AVALIADORES", title: "Decida com demanda em mãos", color: "#93C5FD",
    items: ["Saiba se o carro tem demanda antes de precificar", "Notificação no próprio Avaliador Digital", "Captação mais assertiva e rentável"],
  },
];

export function Personas() {
  return (
    <section id="perfis" className="relative py-[clamp(80px,10vh,160px)] bg-gradient-to-b from-[#0A0D12] to-[#0F1219] overflow-hidden">
      <Particles count={30} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
        <FadeIn>
          <div className="text-center mb-16">
            <Eyebrow>Para quem é</Eyebrow>
            <h2 className="text-[clamp(28px,4vw,48px)] font-bold text-white leading-tight">
              Um produto, <span className="text-[#3B82F6]">quatro papéis</span> no jogo.
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          {PERSONAS.map((p, i) => (
            <FadeIn key={p.tag} delay={i * 150}>
              <div
                className="relative group rounded-[16px] bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-7 hover:border-[#3B82F6]/25 transition-all duration-300 overflow-hidden"
                style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/0 to-[#3B82F6]/0 group-hover:from-[#3B82F6]/[0.03] group-hover:to-transparent transition-all duration-500 rounded-[16px]" />

                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[1.5px] mb-4" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                    {p.tag}
                  </span>
                  <h3 className="text-[20px] font-bold text-white mb-4">{p.title}</h3>
                  <ul className="space-y-2.5">
                    {p.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/50">
                        <CheckCircle className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
