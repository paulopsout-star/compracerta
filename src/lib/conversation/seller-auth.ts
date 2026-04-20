/**
 * Identificação de remetente WhatsApp — spec gap 2 + gap 3.
 *
 * Regras:
 * - Não persistir dados de número desconhecido (LGPD).
 * - Inativo recebe mensagem específica.
 * - Múltiplos vínculos: hoje o schema tem 1 dealershipId por usuário, então
 *   `dealershipChoices` retorna 0 ou 1. Já deixamos a API pronta para quando
 *   surgirem vínculos N-para-N.
 */

import { supabase } from "@/lib/db";

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

export async function identifySender(phoneE164: string): Promise<IdentifyResult> {
  const candidates = phoneCandidates(phoneE164);

  // Tenta cada formato; quebra no primeiro achado
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
