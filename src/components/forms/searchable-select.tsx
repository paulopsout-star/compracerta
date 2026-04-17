"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onChange: (option: SearchableOption) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  emptyMessage = "Nenhum resultado",
  disabled,
  loading,
  className,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, search]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-10 px-3 flex items-center justify-between rounded-[10px] bg-[#F7F8FA] text-[14px] text-left outline-none border border-transparent transition-all",
          disabled || loading ? "text-[#C1C7D0] cursor-not-allowed" : "text-[#111827] hover:bg-[#EEF0F3] focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white focus:border-[#2563EB]/40",
          open && "ring-2 ring-[#2563EB]/25 bg-white border-[#2563EB]/40"
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-[#C1C7D0]")}>
          {loading ? "Carregando..." : selectedLabel ?? placeholder}
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#C1C7D0] shrink-0" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-[#C1C7D0] shrink-0" />
        )}
      </button>

      {open && !disabled && !loading && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white rounded-[10px] shadow-xl shadow-black/10 border border-[#EEF0F3] overflow-hidden">
          {/* Search */}
          <div className="relative border-b border-[#F3F4F6]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C1C7D0]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-10 pl-9 pr-3 text-[13px] text-[#111827] placeholder:text-[#C1C7D0] outline-none bg-transparent"
            />
          </div>

          {/* Options */}
          <div className="max-h-[260px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-[13px] text-[#9AA0AB] py-4">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-[13px] text-left flex items-center gap-2 hover:bg-[#F7F8FA] transition-colors",
                      isSelected && "bg-[#F7F8FA] font-medium text-[#2563EB]"
                    )}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100 text-[#2563EB]" : "opacity-0")} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
