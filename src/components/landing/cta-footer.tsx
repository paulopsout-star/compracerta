"use client";

import Link from "next/link";
import { MessageSquare, Lock, Shield } from "lucide-react";
import { GlitchText, FadeIn, DiagonalStripes } from "./shared";

export function FinalCTA() {
  return (
    <section className="relative py-[clamp(80px,10vh,160px)] bg-gradient-to-b from-[#0A0D12] to-[#0F1219] overflow-hidden">
      <DiagonalStripes />
      {/* Spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#2563EB]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 text-center">
        <FadeIn>
          <GlitchText text="PRONTO PARA" className="text-[clamp(32px,6vw,72px)] font-black leading-[0.9] tracking-[-2px]" />
          <GlitchText text="O CARRO CERTO?" className="text-[clamp(32px,6vw,72px)] font-black leading-[0.9] tracking-[-2px]" />

          <p className="text-[clamp(15px,1.4vw,18px)] text-white/40 mt-6 max-w-lg mx-auto leading-relaxed">
            Entre para a rede que está transformando o mercado de repasse no Brasil.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/login" className="h-[52px] px-8 rounded-[10px] bg-[#2563EB] text-white text-[15px] font-semibold inline-flex items-center justify-center hover:bg-[#1D4ED8] transition-all shadow-xl shadow-[#2563EB]/25">
              Solicitar acesso
            </Link>
            <button className="h-[52px] px-8 rounded-[10px] border border-[#3B82F6]/30 text-white/80 text-[15px] font-medium inline-flex items-center justify-center gap-2 hover:border-[#3B82F6]/60 hover:text-white transition-all">
              <MessageSquare className="w-4 h-4" /> Falar com especialista
            </button>
          </div>

          <p className="text-[12px] text-white/20 mt-6">
            Sem compromisso &bull; LGPD &bull; Onboarding em 48h
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

export function Footer() {
  const COLS = [
    { title: "Produto", links: [{ label: "Como funciona", href: "#como-funciona" }, { label: "Para quem é", href: "#perfis" }, { label: "Integrações", href: "#ecossistema" }] },
    { title: "Ecossistema", links: [{ label: "Canal do Repasse", href: "#" }, { label: "Avaliador Digital", href: "#" }] },
    { title: "Suporte", links: [{ label: "Central de ajuda", href: "#" }, { label: "Contato", href: "#" }] },
    { title: "Legal", links: [{ label: "Termos de uso", href: "#" }, { label: "Política de privacidade", href: "#" }, { label: "LGPD", href: "#" }] },
  ];

  return (
    <footer className="bg-[#0A0D12] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
        <div className="grid md:grid-cols-5 gap-10">
          {/* Brand col */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-[6px] bg-[#2563EB] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
              <div>
                <span className="text-[14px] font-bold text-white">Compra Certa</span>
                <span className="block text-[10px] text-white/30">by Canal do Repasse</span>
              </div>
            </div>
            <p className="text-[12px] text-white/30 leading-relaxed">
              O match definitivo entre demanda e estoque no mercado automotivo B2B.
            </p>
          </div>

          {/* Link cols */}
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-semibold text-white/50 uppercase tracking-[1.5px] mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-[13px] text-white/30 hover:text-white/60 transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/20">
            &copy; {new Date().getFullYear()} Canal do Repasse. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-white/20">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Conexão segura</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />LGPD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
