"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Para quem é", href: "#perfis" },
  { label: "Integrações", href: "#ecossistema" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center px-6 md:px-10 transition-all duration-300 ${scrolled ? "bg-[#0A0D12]/90 backdrop-blur-xl border-b border-[#3B82F6]/10" : "bg-transparent"}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-[8px] bg-[#2563EB] flex items-center justify-center shadow-lg shadow-[#2563EB]/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <div>
            <span className="text-[15px] font-bold text-white">Compra Certa</span>
            <span className="text-[10px] text-white/30 ml-1.5 hidden sm:inline">by Canal do Repasse</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 ml-12">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="text-[14px] text-white/60 hover:text-white transition-colors relative group">
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#3B82F6] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-[14px] text-white/70 hover:text-white transition-colors px-4 py-2">
            Entrar
          </Link>
          <Link href="/login" className="h-[40px] px-5 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-semibold inline-flex items-center hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-[#2563EB]/20">
            Solicitar acesso
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-white/70 hover:text-white">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#0A0D12]/95 backdrop-blur-xl pt-[80px] px-6 md:hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3B82F6]/60 via-[#3B82F6] to-[#3B82F6]/60" />
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block text-[18px] text-white/80 hover:text-white py-4 border-b border-white/5">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 space-y-3">
            <Link href="/login" className="block w-full h-[48px] rounded-[10px] bg-[#2563EB] text-white text-[15px] font-semibold text-center leading-[48px]">Solicitar acesso</Link>
            <Link href="/login" className="block w-full h-[48px] rounded-[10px] border border-white/20 text-white/70 text-[15px] text-center leading-[48px]">Entrar</Link>
          </div>
        </div>
      )}
    </>
  );
}
