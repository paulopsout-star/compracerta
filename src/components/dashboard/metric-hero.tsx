"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricHeroProps {
  label: string;
  value: string;
  trend: { value: number; label: string };
  subtitle: string;
  sparklineData?: number[];
  primaryAction?: { label: string; onClick?: () => void };
  secondaryAction?: { label: string; onClick?: () => void };
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 44;
  const w = 110;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`);
  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-[110px] h-[44px]", className)}>
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGradient)" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricHero({
  label,
  value,
  trend,
  subtitle,
  sparklineData = [12, 18, 15, 22, 28, 24, 31, 27, 34],
  primaryAction,
  secondaryAction,
}: MetricHeroProps) {
  const isPositive = trend.value >= 0;

  return (
    <div className="card-tradox">
      {/* Label */}
      <p className="text-[11px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px]">
        {label}
      </p>

      {/* Value row */}
      <div className="flex items-end justify-between mt-4 gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[32px] md:text-[40px] font-bold text-[#111827] leading-none tabular-nums">
              {value}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                isPositive
                  ? "bg-[var(--accent)] text-[var(--primary)]"
                  : "bg-red-50 text-[#E5484D]"
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}{trend.value}%
            </span>
          </div>
          <p className="text-[12px] text-[#9AA0AB] mt-2 leading-relaxed">{subtitle}</p>
        </div>

        <Sparkline data={sparklineData} className="hidden sm:block shrink-0" />
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2.5 mt-5 pt-5 border-t border-[#F3F4F6]">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex-1 h-[40px] rounded-[8px] bg-[#1A1D23] text-white text-[13px] font-medium hover:bg-[#2A2E35] active:scale-[0.98] transition-all"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex-1 h-[40px] rounded-[8px] bg-[var(--primary)] text-white text-[13px] font-medium hover:shadow-md hover:shadow-[var(--primary)]/20 active:scale-[0.98] transition-all"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
