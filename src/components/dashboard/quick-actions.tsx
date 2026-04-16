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
      <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px] mb-5">
        Ações Rápidas
      </p>
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2.5 group"
          >
            <div className="quick-action-circle group-hover:shadow-md">
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[12px] font-medium text-[#5B6370] text-center leading-tight group-hover:text-[#111827] transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
