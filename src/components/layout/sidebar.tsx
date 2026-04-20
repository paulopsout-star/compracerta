"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Heart,
  Zap,
  Users,
  BarChart3,
  Package,
  Upload,
  Settings,
  ScrollText,
  Plug,
  Wallet,
} from "lucide-react";

export type UserRole = "vendedor" | "gestor" | "lojista" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  vendedor: [
    { label: "Painel", href: "/vendedor", icon: LayoutDashboard },
    { label: "Cadastrar Desejo", href: "/desejos/novo", icon: PlusCircle },
    { label: "Meus Desejos", href: "/vendedor/desejos", icon: Heart },
    { label: "Matches", href: "/vendedor/matches", icon: Zap },
    { label: "Minha Carteira", href: "/vendedor/carteira", icon: Wallet },
  ],
  gestor: [
    { label: "Painel", href: "/gestor", icon: LayoutDashboard },
    { label: "Equipe", href: "/gestor/equipe", icon: Users },
    { label: "Desejos", href: "/gestor/desejos", icon: Heart },
    { label: "Relatórios", href: "/gestor/relatorios", icon: BarChart3 },
  ],
  lojista: [
    { label: "Painel", href: "/lojista", icon: LayoutDashboard },
    { label: "Cadastrar Estoque", href: "/lojista/upload", icon: Upload },
    { label: "Meu Estoque", href: "/lojista/estoque", icon: Package },
    { label: "Matches", href: "/lojista/matches", icon: Zap },
    { label: "Histórico", href: "/lojista/historico", icon: BarChart3 },
  ],
  admin: [
    { label: "Painel", href: "/admin", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/usuarios", icon: Users },
    { label: "Integrações", href: "/admin/integracoes", icon: Plug },
    { label: "Logs", href: "/admin/logs", icon: ScrollText },
    { label: "Parâmetros", href: "/admin/parametros", icon: Settings },
  ],
};

interface SidebarProps {
  role: UserRole;
  className?: string;
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] font-medium transition-all duration-200",
        isActive
          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
          : "text-[var(--sidebar-foreground)] hover:text-[#111827] hover:bg-[#EEF0F3]"
      )}
    >
      <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-[var(--sidebar-primary)]")} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--sidebar-primary)] text-white text-[11px] font-semibold">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  function isActive(href: string) {
    if (href === `/${role}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-[240px] bg-[var(--sidebar)] border-r border-[var(--sidebar-border)]",
        className
      )}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-[var(--sidebar-primary)] text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-bold text-[#111827] leading-tight">Compra Certa</p>
            <p className="text-[11px] text-[#9AA0AB] font-medium">by Canal do Repasse</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-6 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>
    </aside>
  );
}
