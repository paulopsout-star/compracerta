"use client";

import { MoreVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
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
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      </div>

      {/* Table header */}
      <div className="px-6 py-3 bg-[#F7F8FA] border-y border-[#EEF0F3]">
        <div className="flex items-center gap-4">
          <div className="w-10" /> {/* avatar space */}
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]">
              {columns[0]?.label}
            </span>
          </div>
          {columns.slice(1).map((col) => (
            <div
              key={col.key}
              className={cn(
                "w-[100px] text-[11px] font-medium text-[#9AA0AB] uppercase tracking-[0.4px]",
                col.align === "right" && "text-right",
                col.align === "center" && "text-center"
              )}
            >
              {col.label}
            </div>
          ))}
          <div className="w-[100px]" /> {/* action */}
          <div className="w-16" /> {/* icons */}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#EEF0F3]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-4 px-6 py-4 hover:bg-[#F7F8FA]/50 transition-colors"
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-[13px] font-bold text-white"
              style={{ backgroundColor: row.avatar?.color ?? "var(--primary)" }}
            >
              {row.avatar?.text ?? row.title[0]}
            </div>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#111827] truncate">{row.title}</p>
              <p className="text-[12px] text-[#9AA0AB] truncate">{row.subtitle}</p>
            </div>

            {/* Data cells */}
            {columns.slice(1).map((col) => (
              <div
                key={col.key}
                className={cn(
                  "w-[100px] text-[14px] font-medium",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {row.cells[col.key]}
              </div>
            ))}

            {/* Action button */}
            <div className="w-[100px]">
              {row.action && (
                <button
                  onClick={row.action.onClick}
                  className="h-[32px] px-4 rounded-[8px] bg-[var(--primary)] text-white text-[12px] font-medium hover:brightness-90 transition-all"
                >
                  {row.action.label}
                </button>
              )}
            </div>

            {/* Star + menu */}
            <div className="flex items-center gap-1 w-16 justify-end">
              <button
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  row.pinned
                    ? "text-[var(--primary)]"
                    : "text-[#D1D5DB] hover:text-[var(--primary)]"
                )}
              >
                <Star className="w-4 h-4" fill={row.pinned ? "currentColor" : "none"} />
              </button>
              <button className="p-1.5 rounded-md text-[#9AA0AB] hover:text-[#5B6370] transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
