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
  const h = 48;
  const w = 120;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-[120px] h-[48px]", className)}>
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
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
      <p className="text-[12px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
        {label}
      </p>

      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[36px] md:text-[44px] font-bold text-[#111827] leading-none">
              {value}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold",
                isPositive
                  ? "bg-[var(--accent)] text-[var(--primary)]"
                  : "bg-red-50 text-[#E5484D]"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositive ? "+" : ""}
              {trend.value}%
            </span>
          </div>
          <p className="text-[13px] text-[#9AA0AB] mt-3">{subtitle}</p>
        </div>

        <Sparkline data={sparklineData} className="hidden sm:block" />
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex-1 h-[44px] rounded-[10px] bg-[#1A1D23] text-white text-[14px] font-medium hover:bg-[#2A2E35] transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex-1 h-[44px] rounded-[10px] bg-[var(--primary)] text-white text-[14px] font-medium hover:brightness-90 transition-all"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
