"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("card-tradox", className)}>
      <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px] mb-4">
        Ações Rápidas
      </p>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="quick-action-circle group-hover:shadow-lg group-hover:shadow-[var(--primary)]/15 active:scale-95">
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium text-[#6B7280] text-center leading-tight group-hover:text-[#111827] transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
