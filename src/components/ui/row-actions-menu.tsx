"use client";

import { useRef, useState, useEffect, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

interface RowActionsMenuProps {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
}

/**
 * Menu "..." que renderiza o dropdown em portal no document.body
 * com posicionamento fixed calculado a partir do botão.
 *
 * Resolve o problema de dropdowns sendo cortados por containers
 * com overflow-hidden (comum em tabelas/cards).
 */
export function RowActionsMenu({
  children,
  align = "right",
  className = "",
  buttonClassName = "w-[26px] h-[26px] flex items-center justify-center rounded-md text-[#C1C7D0] hover:text-[#6B7280] hover:bg-[#F3F4F6] transition-all",
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Calcular posição quando abrir (e recalcular em scroll/resize)
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 180;
      const gap = 4;

      let left = align === "right"
        ? rect.right - menuWidth
        : rect.left;

      // Clamp para não sair da viewport
      const minLeft = 8;
      const maxLeft = window.innerWidth - menuWidth - 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;

      const menuHeight = menuRef.current?.offsetHeight ?? 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      // Se não cabe embaixo, abre em cima
      const top = spaceBelow < menuHeight + 16
        ? rect.top - menuHeight - gap
        : rect.bottom + gap;

      setPos({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align]);

  // Fechar ao clicar fora / pressionar ESC
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className={`fixed z-[100] bg-white rounded-[10px] shadow-lg shadow-black/10 border border-[#EEF0F3] py-1.5 min-w-[180px] ${className}`}
          style={{ top: pos.top, left: pos.left }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
