"use client";

import { Menu, Search, MessageSquare, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  userName?: string;
  greeting?: string;
  subtitle?: string;
  onMenuToggle: () => void;
}

export function Header({
  userName = "João",
  greeting,
  subtitle = "Vamos encontrar o carro certo hoje",
  onMenuToggle,
}: HeaderProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hour = new Date().getHours();
  const autoGreeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const displayGreeting = greeting ?? `${autoGreeting}, ${userName}!`;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-[72px] px-4 md:px-8 bg-background">
      {/* Mobile toggle */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-[10px] hover:bg-muted transition-colors"
      >
        <Menu className="h-5 w-5 text-[#5B6370]" />
      </button>

      {/* Greeting — TradoX left side */}
      <div className="hidden md:block">
        <h1 className="text-[20px] font-semibold text-[#111827] leading-tight">
          {displayGreeting}
        </h1>
        <p className="text-[13px] text-[#9AA0AB] mt-0.5">{subtitle}</p>
      </div>

      <div className="flex-1" />

      {/* Search — TradoX pill shape */}
      <div className="hidden md:block w-full max-w-[320px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA0AB]" />
          <input
            type="search"
            placeholder="Buscar desejos, veículos, lojistas..."
            className="w-full h-[44px] pl-11 pr-4 rounded-full bg-[var(--surface-muted)] text-[14px] text-[#111827] placeholder:text-[#9AA0AB] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-shadow"
          />
        </div>
      </div>

      {/* Icon cluster — TradoX right side */}
      <div className="flex items-center gap-2 ml-4">
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1A1D23] text-white hover:bg-[#2A2E35] transition-colors">
          <MessageSquare className="h-[18px] w-[18px]" />
        </button>
        <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#1A1D23] text-white hover:bg-[#2A2E35] transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1 right-1 w-[10px] h-[10px] bg-[var(--primary)] rounded-full border-2 border-background" />
        </button>
        <Avatar className="h-10 w-10 ml-1 cursor-pointer ring-2 ring-transparent hover:ring-[var(--primary)]/20 transition-shadow">
          <AvatarFallback className="bg-[var(--primary)] text-white text-[13px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
