"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  icon: React.ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="card-tradox flex items-start gap-4">
      <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--accent)] shrink-0">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <div>
        <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
          {label}
        </p>
        <p className="text-[24px] font-bold text-[#111827] leading-tight mt-1">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[12px] font-semibold",
                isPositive ? "text-[var(--primary)]" : "text-[#E5484D]"
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-[11px] text-[#9AA0AB]">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsCardsProps {
  cards: StatCardProps[];
}

export function StatsCards({ cards }: StatsCardsProps) {
  return (
    <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard key={i} {...card} />
      ))}
    </div>
  );
}
