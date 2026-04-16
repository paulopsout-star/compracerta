"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  LayoutDashboard,
  PlusCircle,
  Heart,
  Zap,
  Bell,
  Users,
  FileText,
  BarChart3,
  Package,
  Upload,
  Settings,
  ScrollText,
  Plug,
  LogOut,
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
    { label: "Dashboard", href: "/vendedor", icon: LayoutDashboard },
    { label: "Novo Desejo", href: "/desejos/novo", icon: PlusCircle },
    { label: "Meus Desejos", href: "/vendedor/desejos", icon: Heart },
    { label: "Matches", href: "/vendedor/matches", icon: Zap },
    { label: "Notificações", href: "/vendedor/notificacoes", icon: Bell, badge: 3 },
  ],
  gestor: [
    { label: "Dashboard", href: "/gestor", icon: LayoutDashboard },
    { label: "Equipe", href: "/gestor/equipe", icon: Users },
    { label: "Desejos", href: "/gestor/desejos", icon: Heart },
    { label: "Relatórios", href: "/gestor/relatorios", icon: BarChart3 },
  ],
  lojista: [
    { label: "Dashboard", href: "/lojista", icon: LayoutDashboard },
    { label: "Meu Estoque", href: "/lojista/estoque", icon: Package },
    { label: "Upload", href: "/lojista/upload", icon: Upload },
    { label: "Matches", href: "/lojista/matches", icon: Zap },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/usuarios", icon: Users },
    { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
    { label: "Logs", href: "/admin/logs", icon: ScrollText },
    { label: "Integrações", href: "/admin/integracoes", icon: Plug },
  ],
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  className?: string;
}

export function Sidebar({ role, userName, className }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground w-64",
        className
      )}
    >
      {/* Brand */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Compra Certa</h1>
            <p className="text-xs text-sidebar-foreground/60">Canal do Repasse</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="bg-sidebar-primary text-sidebar-primary-foreground text-xs px-1.5 py-0.5 min-w-[20px] text-center"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
          </div>
          <button className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
