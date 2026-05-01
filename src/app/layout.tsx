import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { TENANT_HEADERS, getTenantConfig, type TenantPublicConfig } from "@/lib/tenant";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

async function loadTenantBranding(): Promise<TenantPublicConfig | null> {
  const h = await headers();
  const tenantId = h.get(TENANT_HEADERS.id);
  if (!tenantId) return null;
  return getTenantConfig(tenantId);
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadTenantBranding();
  const appName = config?.appName ?? "Compra Certa";
  const tagline = config?.tagline ?? "Canal do Repasse";
  const description =
    config?.tagline
      ? `${appName} — ${config.tagline}`
      : "Central de desejos ativos — conectando demanda e oferta de veículos no ecossistema Canal do Repasse";

  const metadata: Metadata = {
    title: `${appName} | ${tagline}`,
    description,
  };
  if (config?.faviconUrl) {
    metadata.icons = { icon: config.faviconUrl };
  }
  return metadata;
}

function brandingCssVars(config: TenantPublicConfig): string {
  // Sobrescreve apenas as vars que a UI lê; demais ficam do globals.css.
  return `:root {
    --primary: ${config.primaryColor};
    --secondary: ${config.secondaryColor};
    --accent: ${config.accentColor};
    --sidebar-primary: ${config.sidebarPrimaryColor};
  }`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await loadTenantBranding();

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <head>
        {config && <style dangerouslySetInnerHTML={{ __html: brandingCssVars(config) }} />}
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <BrandingProvider config={config}>
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}
