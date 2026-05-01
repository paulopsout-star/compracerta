"use client";

import { createContext, useContext } from "react";
import type { TenantPublicConfig } from "@/lib/tenant";

const BrandingContext = createContext<TenantPublicConfig | null>(null);

export function BrandingProvider({
  config,
  children,
}: {
  config: TenantPublicConfig | null;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={config}>{children}</BrandingContext.Provider>;
}

/**
 * Branding do tenant resolvido pelo proxy/host. null em rotas onde o layout
 * raiz não conseguiu carregar (não deveria acontecer fora de erro de DB).
 */
export function useBranding(): TenantPublicConfig | null {
  return useContext(BrandingContext);
}

export interface BrandingFallback {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
}

const DEFAULT_FALLBACK: BrandingFallback = {
  appName: "Compra Certa",
  tagline: "by Canal do Repasse",
  logoUrl: null,
  primaryColor: "#2563EB",
};

/**
 * Versão com fallback para textos visíveis. Use sempre que o componente
 * render é fora do `(dashboard)` ou pode rodar antes do Provider estar pronto
 * (ex: SSR de páginas estáticas).
 */
export function useBrandingOrFallback(): BrandingFallback {
  const cfg = useContext(BrandingContext);
  if (!cfg) return DEFAULT_FALLBACK;
  return {
    appName: cfg.appName,
    tagline: cfg.tagline,
    logoUrl: cfg.logoUrl,
    primaryColor: cfg.primaryColor,
  };
}
