"use client";

import { useState } from "react";
import { MoreHorizontal, Star, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
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

/* Inline dropdown for secondary actions */
function RowMenu({ pinned }: { pinned?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-[#C1C7D0] hover:text-[#6B7280] hover:bg-[#F3F4F6] transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[10px] shadow-lg shadow-black/8 border border-[#EEF0F3] py-1.5 min-w-[140px]">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#5B6370] hover:bg-[#F7F8FA] transition-colors">
              <Pin className="w-3.5 h-3.5" /> {pinned ? "Desafixar" : "Fixar"}
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#5B6370] hover:bg-[#F7F8FA] transition-colors">
              <Star className="w-3.5 h-3.5" /> Favoritar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TradoxTable({ title, columns, rows, className }: TradoxTableProps) {
  return (
    <div className={cn("card-tradox !p-0 overflow-hidden", className)}>
      {/* Title */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          {/* Column headers */}
          <thead>
            <tr className="bg-[#F7F8FA] border-y border-[#EEF0F3]">
              <th className="w-[48px] pl-5 pr-1 py-2.5" /> {/* avatar */}
              <th className="text-left py-2.5 pr-3">
                <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px]">
                  {columns[0]?.label}
                </span>
              </th>
              {columns.slice(1).map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "py-2.5 px-3",
                    col.minWidth ?? "min-w-[80px]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                  style={{ width: col.width }}
                >
                  <span className="text-[10px] font-semibold text-[#B0B7C3] uppercase tracking-[0.5px]">
                    {col.label}
                  </span>
                </th>
              ))}
              <th className="w-[76px] py-2.5 px-2" /> {/* action */}
              <th className="w-[40px] pr-4 py-2.5" /> {/* menu */}
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group hover:bg-[#FAFBFC] transition-colors"
              >
                {/* Avatar */}
                <td className="pl-5 pr-1 py-3">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-[11px] font-bold text-white"
                    style={{ backgroundColor: row.avatar?.color ?? "var(--primary)" }}
                  >
                    {row.avatar?.text ?? row.title[0]}
                  </div>
                </td>

                {/* Title + subtitle */}
                <td className="py-3 pr-3">
                  <p className="text-[13px] font-semibold text-[#111827] truncate leading-snug max-w-[180px]">
                    {row.title}
                  </p>
                  <p className="text-[11px] text-[#9AA0AB] truncate mt-0.5 leading-snug max-w-[180px]">
                    {row.subtitle}
                  </p>
                </td>

                {/* Data cells */}
                {columns.slice(1).map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-3 px-3 text-[13px]",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {row.cells[col.key]}
                  </td>
                ))}

                {/* CTA — single primary action */}
                <td className="py-3 px-2">
                  {row.action && (
                    <button
                      onClick={row.action.onClick}
                      className="h-[28px] px-3.5 rounded-[7px] bg-[var(--primary)] text-white text-[11px] font-semibold whitespace-nowrap hover:shadow-md hover:shadow-[var(--primary)]/15 active:scale-[0.97] transition-all"
                    >
                      {row.action.label}
                    </button>
                  )}
                </td>

                {/* Secondary actions — grouped in menu */}
                <td className="pr-4 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <RowMenu pinned={row.pinned} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
