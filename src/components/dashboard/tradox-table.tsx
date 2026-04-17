"use client";

import { MoreVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
}

interface TableRow {
  id: string;
  avatar?: { text: string; color?: string };
  title: string;
  subtitle: string;
  cells: Record<string, React.ReactNode>;
  action?: { label: string; onClick?: () => void };
  pinned?: boolean;
}

interface TradoxTableProps {
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  className?: string;
}

export function TradoxTable({ title, columns, rows, className }: TradoxTableProps) {
  return (
    <div className={cn("card-tradox !p-0 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      </div>

      {/* Table — horizontal scroll on small screens */}
      <div className="overflow-x-auto">
        {/* Column headers */}
        <div className="px-5 py-2.5 bg-[#F7F8FA] border-y border-[#EEF0F3] min-w-[540px]">
          <div className="flex items-center">
            <div className="w-9 shrink-0 mr-3" /> {/* avatar space */}
            <div className="flex-1 min-w-[120px]">
              <span className="text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
                {columns[0]?.label}
              </span>
            </div>
            {columns.slice(1).map((col) => (
              <div
                key={col.key}
                className={cn(
                  "shrink-0 px-2 text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]",
                  col.width ?? "w-[88px]",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {col.label}
              </div>
            ))}
            <div className="w-[80px] shrink-0 px-2" /> {/* action */}
            <div className="w-[56px] shrink-0" /> {/* star + menu */}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#EEF0F3]">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center px-5 py-3.5 hover:bg-[#F7F8FA]/50 transition-colors min-w-[540px]"
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 mr-3 text-[12px] font-bold text-white"
                style={{ backgroundColor: row.avatar?.color ?? "var(--primary)" }}
              >
                {row.avatar?.text ?? row.title[0]}
              </div>

              {/* Title + subtitle */}
              <div className="flex-1 min-w-[120px] pr-2">
                <p className="text-[13px] font-semibold text-[#111827] truncate leading-tight">{row.title}</p>
                <p className="text-[11px] text-[#9AA0AB] truncate mt-0.5 leading-tight">{row.subtitle}</p>
              </div>

              {/* Data cells */}
              {columns.slice(1).map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "shrink-0 px-2 text-[13px] font-medium",
                    col.width ?? "w-[88px]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {row.cells[col.key]}
                </div>
              ))}

              {/* Action button */}
              <div className="w-[80px] shrink-0 px-2">
                {row.action && (
                  <button
                    onClick={row.action.onClick}
                    className="h-[28px] px-3 rounded-[6px] bg-[var(--primary)] text-white text-[11px] font-medium hover:brightness-90 transition-all whitespace-nowrap"
                  >
                    {row.action.label}
                  </button>
                )}
              </div>

              {/* Star + menu */}
              <div className="flex items-center gap-0.5 w-[56px] shrink-0 justify-end">
                <button
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    row.pinned
                      ? "text-[var(--primary)]"
                      : "text-[#D1D5DB] hover:text-[var(--primary)]"
                  )}
                >
                  <Star className="w-3.5 h-3.5" fill={row.pinned ? "currentColor" : "none"} />
                </button>
                <button className="p-1 rounded-md text-[#9AA0AB] hover:text-[#5B6370] transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
