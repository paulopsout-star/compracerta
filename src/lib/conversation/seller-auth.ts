/**
 * Identificação de remetente WhatsApp — spec gap 2 + gap 3.
 *
 * Regras:
 * - Não persistir dados de número desconhecido (LGPD).
 * - Inativo recebe mensagem específica.
 * - Múltiplos vínculos: hoje o schema tem 1 dealershipId por usuário, então
 *   `dealershipChoices` retorna 0 ou 1. Já deixamos a API pronta para quando
 *   surgirem vínculos N-para-N.
 * - Validação dupla: se não achar no DB, consulta Avaliador Digital.
 *   Se Avaliador autoriza, auto-cria usuário vendedor (acesso liberado).
 */

import { supabase } from "@/lib/db";
import { isPhoneAuthorizedInAvaliador } from "@/lib/services/avaliador-api";
import { brazilianPhoneVariants, phoneE164Variants, toCanonicalE164 } from "@/lib/phone";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: "vendedor" | "gestor" | "lojista" | "admin" | "superadmin";
  active: boolean;
  phone: string | null;
  tenantId: string;
  dealershipId: string | null;
  dealerStoreId: string | null;
}

async function resolveDefaultTenantId(): Promise<string | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export type IdentifyResult =
  | { kind: "unknown" }
  | { kind: "inactive"; user: AuthenticatedUser }
  | { kind: "authenticated"; user: AuthenticatedUser; dealershipChoices: Array<{ id: string; name: string }> };

/**
 * Produz variações de string do telefone para tolerar formato gravado no cadastro
 * (alguns usuários cadastraram "(31) 98888-7777", outros "31988887777", etc.) e
 * a regra do 9 brasileira (provedor WhatsApp pode entregar o número sem o 9).
 */
function phoneCandidates(phoneE164: string): string[] {
  const variants = new Set<string>([phoneE164]);

  for (const e164 of phoneE164Variants(phoneE164)) {
    const digits = e164.replace(/\D/g, "");
    const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
    variants.add(e164);
    variants.add(`+${digits}`);
    variants.add(digits);
    variants.add(noDdi);

    if (noDdi.length === 11) {
      variants.add(`(${noDdi.slice(0, 2)}) ${noDdi.slice(2, 7)}-${noDdi.slice(7)}`);
      variants.add(`${noDdi.slice(0, 2)} ${noDdi.slice(2, 7)}-${noDdi.slice(7)}`);
      variants.add(`${noDdi.slice(0, 2)}${noDdi.slice(2, 7)}${noDdi.slice(7)}`);
    } else if (noDdi.length === 10) {
      variants.add(`(${noDdi.slice(0, 2)}) ${noDdi.slice(2, 6)}-${noDdi.slice(6)}`);
      variants.add(`${noDdi.slice(0, 2)} ${noDdi.slice(2, 6)}-${noDdi.slice(6)}`);
      variants.add(`${noDdi.slice(0, 2)}${noDdi.slice(2, 6)}${noDdi.slice(6)}`);
    }
  }
  return Array.from(variants);
}

async function getDealerships(userId: string, dealershipId: string | null): Promise<Array<{ id: string; name: string }>> {
  if (!dealershipId) return [];
  const { data } = await supabase
    .from("dealerships")
    .select("id, name, active")
    .eq("id", dealershipId)
    .eq("active", true)
    .maybeSingle();
  void userId;
  return data ? [{ id: data.id, name: data.name }] : [];
}

/**
 * Auto-cria um usuário vendedor com phone normalizado quando o Avaliador
 * Digital autorizou o acesso. Email/password placeholder; perfil pode ser
 * completado depois pelo admin via /admin/usuarios.
 */
async function autoCreateVendedorFromAvaliador(
  phoneE164: string,
  tenantId: string,
  displayName?: string
): Promise<Record<string, unknown> | null> {
  // Persiste sempre na forma canônica (com 9), independente do que o provedor
  // entregou. Email placeholder também usa a forma canônica para idempotência.
  const canonicalE164 = toCanonicalE164(phoneE164) ?? phoneE164;
  const canonicalDigits = canonicalE164.replace(/\D/g, "");
  const canonicalNoDdi = canonicalDigits.startsWith("55") ? canonicalDigits.slice(2) : canonicalDigits;
  const placeholderEmail = `whatsapp+${canonicalNoDdi}@compracerta.local`;
  const name = (displayName?.trim() || `Vendedor ${canonicalNoDdi.slice(0, 2)}-${canonicalNoDdi.slice(-4)}`).slice(0, 120);

  // Idempotência: também olha o e-mail legado (sem o 9) caso já exista cadastro
  // criado antes desta normalização.
  const legacyVariant = brazilianPhoneVariants(phoneE164).find((d) => d !== canonicalNoDdi);
  const placeholderEmails = [placeholderEmail];
  if (legacyVariant) placeholderEmails.push(`whatsapp+${legacyVariant}@compracerta.local`);

  const { data: existing } = await supabase
    .from("users")
    .select("id, name, role, active, phone, tenant_id, dealership_id, dealer_store_id, email")
    .eq("tenant_id", tenantId)
    .in("email", placeholderEmails)
    .maybeSingle();
  if (existing) {
    const updates: Record<string, unknown> = {};
    if (existing.phone !== canonicalE164) updates.phone = canonicalE164;
    if (existing.email !== placeholderEmail) updates.email = placeholderEmail;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", existing.id as string);
    }
    return existing;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      tenant_id: tenantId,
      name,
      email: placeholderEmail,
      phone: canonicalE164,
      role: "vendedor",
      active: true,
    })
    .select("id, name, role, active, phone, tenant_id, dealership_id, dealer_store_id")
    .single();

  if (error) {
    console.error("[seller-auth] auto-create falhou:", error.message);
    return null;
  }
  console.log("[seller-auth] vendedor auto-criado via Avaliador:", { id: created.id, phone: canonicalE164, tenantId });
  return created;
}

export async function identifySender(
  phoneE164: string,
  opts?: { displayName?: string; tenantId?: string }
): Promise<IdentifyResult> {
  const candidates = phoneCandidates(phoneE164);
  const inboundDigits = phoneE164.replace(/\D/g, "");
  const inboundNoDdi = inboundDigits.startsWith("55") ? inboundDigits.slice(2) : inboundDigits;

  // 1) Match direto (rápido, usa index em phone) via candidatos comuns
  let userRow: Record<string, unknown> | null = null;
  for (const p of candidates) {
    let q = supabase
      .from("users")
      .select("id, name, role, active, phone, tenant_id, dealership_id, dealer_store_id")
      .eq("phone", p);
    if (opts?.tenantId) q = q.eq("tenant_id", opts.tenantId);
    const { data } = await q.maybeSingle();
    if (data) {
      userRow = data;
      break;
    }
  }

  // 2) Fallback robusto: compara por dígitos apenas (cobre qualquer formato)
  // e tolera a regra do 9 (com e sem o nono dígito mobile).
  if (!userRow) {
    const inboundVariantsNoDdi = new Set<string>(brazilianPhoneVariants(phoneE164));
    inboundVariantsNoDdi.add(inboundNoDdi);
    inboundVariantsNoDdi.add(inboundDigits);

    let q = supabase
      .from("users")
      .select("id, name, role, active, phone, tenant_id, dealership_id, dealer_store_id")
      .not("phone", "is", null);
    if (opts?.tenantId) q = q.eq("tenant_id", opts.tenantId);
    const { data: allActive } = await q;
    for (const u of (allActive ?? []) as Array<Record<string, unknown>>) {
      const storedDigits = ((u.phone as string | null) ?? "").replace(/\D/g, "");
      if (!storedDigits) continue;
      const storedNoDdi = storedDigits.startsWith("55") ? storedDigits.slice(2) : storedDigits;
      const storedVariants = new Set<string>([storedDigits, storedNoDdi, ...brazilianPhoneVariants(storedDigits)]);
      let matched = false;
      for (const v of storedVariants) {
        if (inboundVariantsNoDdi.has(v)) { matched = true; break; }
      }
      if (matched) {
        userRow = u;
        break;
      }
    }
  }

  // 3) Não achou no DB → consulta Avaliador Digital. Se autorizar, auto-cria
  // dentro do tenant fornecido (default tenant em fallback até PR2.3 popular
  // tenant_whatsapp_numbers).
  if (!userRow) {
    const authorized = await isPhoneAuthorizedInAvaliador(phoneE164);
    if (authorized) {
      const tenantId = opts?.tenantId ?? (await resolveDefaultTenantId());
      if (!tenantId) {
        console.error("[seller-auth] sem tenantId para auto-create — abortando");
        return { kind: "unknown" };
      }
      userRow = await autoCreateVendedorFromAvaliador(phoneE164, tenantId, opts?.displayName);
    }
  }

  if (!userRow) return { kind: "unknown" };

  const user: AuthenticatedUser = {
    id: userRow.id as string,
    name: userRow.name as string,
    role: userRow.role as AuthenticatedUser["role"],
    active: userRow.active as boolean,
    phone: (userRow.phone as string | null) ?? null,
    tenantId: userRow.tenant_id as string,
    dealershipId: (userRow.dealership_id as string | null) ?? null,
    dealerStoreId: (userRow.dealer_store_id as string | null) ?? null,
  };

  if (!user.active) return { kind: "inactive", user };

  const dealershipChoices = user.role === "vendedor" ? await getDealerships(user.id, user.dealershipId) : [];
  return { kind: "authenticated", user, dealershipChoices };
}
