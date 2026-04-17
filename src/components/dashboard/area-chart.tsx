"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  title: string;
  subtitle?: string;
  currentValue: string;
  trend: { value: number; label: string };
  data: DataPoint[];
  periods?: string[];
  className?: string;
}

const DEFAULT_PERIODS = ["1S", "1M", "3M", "6M", "1A"];

export function AreaChart({
  title,
  subtitle,
  currentValue,
  trend,
  data,
  periods = DEFAULT_PERIODS,
  className,
}: AreaChartProps) {
  const [activePeriod, setActivePeriod] = useState(periods[1] ?? "1M");

  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const padding = range * 0.1;

  const chartH = 200;
  const chartW = 600;
  const stepX = chartW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - ((d.value - (min - padding)) / (range + padding * 2)) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${chartW},${chartH} L0,${chartH} Z`;

  const isPositive = trend.value >= 0;

  // Y-axis labels
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = min - padding + ((range + padding * 2) / ySteps) * (ySteps - i);
    return Math.round(val);
  });

  return (
    <div className={cn("card-tradox", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <button className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827] hover:text-[var(--primary)] transition-colors">
            {title}
            <ChevronDown className="w-3.5 h-3.5 text-[#B0B7C3]" />
          </button>
          {subtitle && (
            <p className="text-[11px] text-[#B0B7C3] mt-0.5">{subtitle}</p>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[26px] font-bold text-[#111827] tabular-nums">{currentValue}</span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[12px] font-semibold",
                isPositive
                  ? "bg-[var(--accent)] text-[var(--primary)]"
                  : "bg-red-50 text-[#E5484D]"
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-[12px] text-[#9AA0AB]">{trend.label}</span>
          </div>
        </div>

        {/* Period selector — TradoX style */}
        <div className="flex items-center gap-1 bg-[var(--surface-muted)] rounded-full p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
                activePeriod === p
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#9AA0AB] hover:text-[#5B6370]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg viewBox={`-60 -10 ${chartW + 70} ${chartH + 40}`} className="w-full h-[220px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-axis labels */}
          {yLabels.map((val, i) => {
            const y = (i / ySteps) * chartH;
            return (
              <g key={i}>
                <line x1="0" y1={y} x2={chartW} y2={y} stroke="#EEF0F3" strokeWidth="1" />
                <text x="-10" y={y + 4} textAnchor="end" className="fill-[#9AA0AB] text-[11px]">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--primary)" stroke="white" strokeWidth="2" opacity="0" className="hover:opacity-100 transition-opacity" />
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={i * stepX}
              y={chartH + 24}
              textAnchor="middle"
              className="fill-[#9AA0AB] text-[11px]"
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
