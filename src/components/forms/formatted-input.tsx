"use client";

import { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Format = "integer" | "currency" | "km" | "year" | "cpf" | "phone";

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  format: Format;
  value?: string | number;
  onValueChange: (rawValue: string) => void;
  prefix?: string;
  suffix?: string;
}

function formatInteger(digits: string): string {
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("pt-BR");
}

function formatCurrency(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  return n.toLocaleString("pt-BR");
}

function formatCPF(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function applyFormat(raw: string, format: Format): string {
  const digits = raw.replace(/\D/g, "");
  switch (format) {
    case "integer": return formatInteger(digits);
    case "currency": return formatCurrency(digits);
    case "km": return formatInteger(digits);
    case "year": return digits.slice(0, 4);
    case "cpf": return formatCPF(digits);
    case "phone": return formatPhone(digits);
  }
}

export const FormattedInput = forwardRef<HTMLInputElement, FormattedInputProps>(
  ({ format, value, onValueChange, prefix, suffix, className, placeholder, ...rest }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>(() =>
      value != null && value !== "" ? applyFormat(String(value), format) : ""
    );

    // Sync with external value changes
    useEffect(() => {
      if (value == null || value === "") {
        setDisplayValue("");
      } else {
        setDisplayValue(applyFormat(String(value), format));
      }
    }, [value, format]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, "");
      setDisplayValue(applyFormat(raw, format));
      onValueChange(raw);
    }

    const hasPrefix = Boolean(prefix);
    const hasSuffix = Boolean(suffix);

    return (
      <div className="relative">
        {hasPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9AA0AB] pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode={format === "year" || format === "integer" || format === "km" || format === "currency" ? "numeric" : "text"}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 rounded-[10px] bg-[#F7F8FA] text-[14px] text-[#111827] placeholder:text-[#D1D5DB] outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white transition-all border border-transparent focus:border-[#2563EB]/40",
            hasPrefix ? "pl-10" : "pl-3",
            hasSuffix ? "pr-10" : "pr-3",
            className
          )}
          {...rest}
        />
        {hasSuffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9AA0AB] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

FormattedInput.displayName = "FormattedInput";
