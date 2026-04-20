"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Search, MessageSquare, Bell, LogOut } from "lucide-react";
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
  const router = useRouter();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hour = new Date().getHours();
  const autoGreeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const displayGreeting = greeting ?? `${autoGreeting}, ${userName}!`;

  /* Avatar dropdown menu */
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const btn = avatarRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 180;
      const left = Math.max(8, rect.right - menuWidth);
      const top = rect.bottom + 8;
      setPos({ top, left });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (avatarRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-[64px] px-4 md:px-8 bg-background border-b border-[#F3F4F6]">
      {/* Mobile toggle */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#F3F4F6] transition-colors mr-3"
      >
        <Menu className="h-5 w-5 text-[#6B7280]" />
      </button>

      {/* Greeting */}
      <div className="hidden md:block shrink-0 mr-6">
        <h1 className="text-[16px] font-semibold text-[#111827] leading-tight">
          {displayGreeting}
        </h1>
        <p className="text-[12px] text-[#B0B7C3] mt-0.5">{subtitle}</p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden lg:block w-full max-w-[260px] mr-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C1C7D0]" />
          <input
            type="search"
            placeholder="Buscar desejos, veículos..."
            className="w-full h-[38px] pl-10 pr-4 rounded-full bg-[#F7F8FA] text-[13px] text-[#111827] placeholder:text-[#C1C7D0] outline-none focus:ring-2 focus:ring-[var(--primary)]/15 focus:bg-white transition-all border border-transparent focus:border-[var(--primary)]/15"
          />
        </div>
      </div>

      {/* Icon cluster */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1A1D23] text-white hover:bg-[#2A2E35] active:scale-95 transition-all">
          <MessageSquare className="h-[16px] w-[16px]" />
        </button>
        <button className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#1A1D23] text-white hover:bg-[#2A2E35] active:scale-95 transition-all">
          <Bell className="h-[16px] w-[16px]" />
          <span className="absolute top-0.5 right-0.5 w-[9px] h-[9px] bg-[var(--primary)] rounded-full border-[1.5px] border-background" />
        </button>

        {/* Avatar com dropdown */}
        <button
          ref={avatarRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-1 rounded-full ring-2 ring-transparent hover:ring-[var(--primary)]/15 transition-all"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-[var(--primary)] text-white text-[12px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Menu dropdown em portal */}
      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] bg-white rounded-[10px] shadow-lg shadow-black/10 border border-[#EEF0F3] py-1.5 min-w-[180px]"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header com nome do usuário */}
          <div className="px-3 py-2 border-b border-[#F3F4F6] mb-1">
            <p className="text-[13px] font-semibold text-[#111827] truncate">{userName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#E5484D] hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>,
        document.body
      )}
    </header>
  );
}
