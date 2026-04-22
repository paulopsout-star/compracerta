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

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: "vendedor" | "gestor" | "lojista" | "admin";
  active: boolean;
  phone: string | null;
  dealershipId: string | null;
  dealerStoreId: string | null;
}

export type IdentifyResult =
  | { kind: "unknown" }
  | { kind: "inactive"; user: AuthenticatedUser }
  | { kind: "authenticated"; user: AuthenticatedUser; dealershipChoices: Array<{ id: string; name: string }> };

/**
 * Produz variações de string do telefone para tolerar formato gravado no cadastro
 * (alguns usuários cadastraram "(31) 98888-7777", outros "31988887777", etc.).
 */
function phoneCandidates(phoneE164: string): string[] {
  const digits = phoneE164.replace(/\D/g, "");
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  const mobile11 = noDdi.length === 11 ? noDdi : null;
  const landline10 = noDdi.length === 10 ? noDdi : null;

  const variants = new Set<string>([phoneE164, `+${digits}`, digits, noDdi]);
  if (mobile11) {
    variants.add(`(${mobile11.slice(0, 2)}) ${mobile11.slice(2, 7)}-${mobile11.slice(7)}`);
    variants.add(`${mobile11.slice(0, 2)} ${mobile11.slice(2, 7)}-${mobile11.slice(7)}`);
    variants.add(`${mobile11.slice(0, 2)}${mobile11.slice(2, 7)}${mobile11.slice(7)}`);
  }
  if (landline10) {
    variants.add(`(${landline10.slice(0, 2)}) ${landline10.slice(2, 6)}-${landline10.slice(6)}`);
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
  displayName?: string
): Promise<Record<string, unknown> | null> {
  const digits = phoneE164.replace(/\D/g, "");
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  const placeholderEmail = `whatsapp+${noDdi}@compracerta.local`;
  const name = (displayName?.trim() || `Vendedor ${noDdi.slice(0, 2)}-${noDdi.slice(-4)}`).slice(0, 120);

  // Idempotência: se o email placeholder já existe (tentativa anterior), reaproveita
  const { data: existing } = await supabase
    .from("users")
    .select("id, name, role, active, phone, dealership_id, dealer_store_id")
    .eq("email", placeholderEmail)
    .maybeSingle();
  if (existing) {
    // Atualiza phone caso esteja em formato diferente (raro)
    if (existing.phone !== phoneE164) {
      await supabase.from("users").update({ phone: phoneE164 }).eq("id", existing.id as string);
    }
    return existing;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      name,
      email: placeholderEmail,
      phone: phoneE164,
      role: "vendedor",
      active: true,
    })
    .select("id, name, role, active, phone, dealership_id, dealer_store_id")
    .single();

  if (error) {
    console.error("[seller-auth] auto-create falhou:", error.message);
    return null;
  }
  console.log("[seller-auth] vendedor auto-criado via Avaliador:", { id: created.id, phone: phoneE164 });
  return created;
}

export async function identifySender(phoneE164: string, opts?: { displayName?: string }): Promise<IdentifyResult> {
  const candidates = phoneCandidates(phoneE164);
  const inboundDigits = phoneE164.replace(/\D/g, "");
  const inboundNoDdi = inboundDigits.startsWith("55") ? inboundDigits.slice(2) : inboundDigits;

  // 1) Match direto (rápido, usa index em phone) via candidatos comuns
  let userRow: Record<string, unknown> | null = null;
  for (const p of candidates) {
    const { data } = await supabase
      .from("users")
      .select("id, name, role, active, phone, dealership_id, dealer_store_id")
      .eq("phone", p)
      .maybeSingle();
    if (data) {
      userRow = data;
      break;
    }
  }

  // 2) Fallback robusto: compara por dígitos apenas (cobre qualquer formato)
  if (!userRow) {
    const { data: allActive } = await supabase
      .from("users")
      .select("id, name, role, active, phone, dealership_id, dealer_store_id")
      .not("phone", "is", null);
    for (const u of (allActive ?? []) as Array<Record<string, unknown>>) {
      const storedDigits = ((u.phone as string | null) ?? "").replace(/\D/g, "");
      if (!storedDigits) continue;
      const storedNoDdi = storedDigits.startsWith("55") ? storedDigits.slice(2) : storedDigits;
      if (storedDigits === inboundDigits || storedNoDdi === inboundNoDdi) {
        userRow = u;
        break;
      }
    }
  }

  // 3) Não achou no DB → consulta Avaliador Digital. Se autorizar, auto-cria.
  if (!userRow) {
    const authorized = await isPhoneAuthorizedInAvaliador(phoneE164);
    if (authorized) {
      userRow = await autoCreateVendedorFromAvaliador(phoneE164, opts?.displayName);
    }
  }

  if (!userRow) return { kind: "unknown" };

  const user: AuthenticatedUser = {
    id: userRow.id as string,
    name: userRow.name as string,
    role: userRow.role as AuthenticatedUser["role"],
    active: userRow.active as boolean,
    phone: (userRow.phone as string | null) ?? null,
    dealershipId: (userRow.dealership_id as string | null) ?? null,
    dealerStoreId: (userRow.dealer_store_id as string | null) ?? null,
  };

  if (!user.active) return { kind: "inactive", user };

  const dealershipChoices = user.role === "vendedor" ? await getDealerships(user.id, user.dealershipId) : [];
  return { kind: "authenticated", user, dealershipChoices };
}
