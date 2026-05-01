#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Env obrigatoria ausente: ${name}`);
  }
  return value;
}

function normalizeHex(value, fallback) {
  const color = (value || fallback).trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error(`Cor invalida: ${color}. Use formato #RRGGBB.`);
  }
  return color.toUpperCase();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = args.name?.trim();

  if (!name) {
    console.error(`
Uso:
  npm run tenant:create -- --name "Grupo Exemplo" --domain exemplo.com.br --primary-color "#2563EB"

Opcoes:
  --name                Nome publico da empresa/marca. Obrigatorio.
  --legal-name          Razao social.
  --cnpj                CNPJ sem mascara ou com mascara.
  --slug                Slug do tenant. Padrao: gerado a partir do nome.
  --domain              Dominio principal do white label.
  --support-email       Email de suporte.
  --support-phone       Telefone de suporte.
  --app-name            Nome exibido na aplicacao. Padrao: --name.
  --tagline             Subtitulo/selo da marca.
  --logo-url            URL do logo.
  --favicon-url         URL do favicon.
  --login-background-url URL da imagem do login.
  --primary-color       Cor primaria. Padrao: #2563EB.
  --secondary-color     Cor secundaria. Padrao: #111827.
  --accent-color        Cor de destaque. Padrao: #10B981.
`);
    process.exit(1);
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const slug = (args.slug?.trim() || slugify(name));
  if (!slug) throw new Error("Slug invalido.");

  const primaryDomain = args.domain?.trim().toLowerCase() || null;

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .upsert(
      {
        name,
        legal_name: args["legal-name"]?.trim() || name,
        cnpj: args.cnpj?.replace(/\D/g, "") || null,
        slug,
        primary_domain: primaryDomain,
        support_email: args["support-email"]?.trim() || null,
        support_phone: args["support-phone"]?.trim() || null,
        active: true,
        metadata: { source: "scripts/create-tenant.mjs" },
      },
      { onConflict: "slug" }
    )
    .select("id, name, slug")
    .single();

  if (tenantError) throw tenantError;

  const { error: brandingError } = await supabase
    .from("tenant_branding")
    .upsert(
      {
        tenant_id: tenant.id,
        app_name: args["app-name"]?.trim() || name,
        tagline: args.tagline?.trim() || null,
        logo_url: args["logo-url"]?.trim() || null,
        favicon_url: args["favicon-url"]?.trim() || null,
        login_background_url: args["login-background-url"]?.trim() || null,
        primary_color: normalizeHex(args["primary-color"], "#2563EB"),
        secondary_color: normalizeHex(args["secondary-color"], "#111827"),
        accent_color: normalizeHex(args["accent-color"], "#10B981"),
        sidebar_primary_color: normalizeHex(args["primary-color"], "#2563EB"),
        font_family: "Inter",
      },
      { onConflict: "tenant_id" }
    );

  if (brandingError) throw brandingError;

  if (primaryDomain) {
    const { error: domainError } = await supabase
      .from("tenant_domains")
      .upsert(
        {
          tenant_id: tenant.id,
          domain: primaryDomain,
          verified: false,
          is_primary: true,
        },
        { onConflict: "domain" }
      );

    if (domainError) throw domainError;
  }

  console.log(`Tenant pronto: ${tenant.name} (${tenant.slug})`);
  console.log(`ID: ${tenant.id}`);
  if (primaryDomain) console.log(`Dominio: ${primaryDomain}`);
}

main().catch((error) => {
  console.error("Falha ao criar tenant:", error.message);
  process.exit(1);
});
