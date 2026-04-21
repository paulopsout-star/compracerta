/**
 * Criação de desejo a partir do canal WhatsApp (ou qualquer contexto sem
 * sessão HTTP). Espelha o insert feito em /api/desejos/route.ts, mantendo
 * o schema mínimo exigido.
 *
 * O matching imediato NÃO é disparado aqui para evitar acoplamento — quem
 * chama decide se dispara, se agenda, ou se confia no próximo ciclo do
 * cron. A FASE de notificações ricas (posterior) vai orquestrar isso.
 */

import { supabase } from "@/lib/db";
import { getNumber, isEnabled } from "@/lib/feature-flags";

export interface WishCreationInput {
  sellerId: string;
  dealershipId?: string | null;
  clientName: string;
  clientPhone: string;
  brand: string;
  model: string;
  version?: string;
  yearMin?: number;
  yearMax?: number;
  kmMax?: number;
  priceMin?: number;
  priceMax?: number;
  colors?: string[];
  transmission?: "manual" | "automatico" | "indiferente";
  fuel?: "flex" | "gasolina" | "diesel" | "hibrido" | "eletrico" | "indiferente";
  cityRef?: string;
  stateRef?: string;
  radiusKm?: number;
  urgency?: "baixa" | "media" | "alta";
  validityDays?: number;
  notes?: string;
  lgpdConsent: boolean;
}

export interface WishCreationResult {
  id: string;
}

/**
 * Rate check — retorna true se o vendedor já atingiu o limite diário.
 */
export async function hasReachedDailyLimit(sellerId: string): Promise<boolean> {
  const limit = await getNumber("wish.max_per_seller_per_day", 20);
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("wish_rate_counters")
    .select("count")
    .eq("seller_id", sellerId)
    .eq("date", today)
    .maybeSingle();
  return (data?.count ?? 0) >= limit;
}

async function bumpDailyCounter(sellerId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  // Upsert incrementando; como supabase-js não tem increment atômico em maybeSingle,
  // fazemos select + update em duas etapas (ok para volumes iniciais).
  const { data } = await supabase
    .from("wish_rate_counters")
    .select("count")
    .eq("seller_id", sellerId)
    .eq("date", today)
    .maybeSingle();
  if (data) {
    await supabase
      .from("wish_rate_counters")
      .update({ count: (data.count ?? 0) + 1 })
      .eq("seller_id", sellerId)
      .eq("date", today);
  } else {
    await supabase.from("wish_rate_counters").insert({ seller_id: sellerId, date: today, count: 1 });
  }
}

/**
 * Detecção simples de duplicata: mesmo vendedor + mesma marca/modelo em status
 * ativo nos últimos 30 dias. Retorna wish existente se achar (ou null).
 */
export async function findDuplicate(sellerId: string, brand: string, model: string): Promise<{ id: string; createdAt: Date } | null> {
  if (!(await isEnabled("wish.duplicate_detection.enabled"))) return null;
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data } = await supabase
    .from("wishes")
    .select("id, created_at")
    .eq("seller_id", sellerId)
    .eq("brand", brand)
    .eq("model", model)
    .in("status", ["procurando", "match_encontrado", "em_negociacao"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id as string, createdAt: new Date(data.created_at as string) } : null;
}

/**
 * Atualiza um desejo existente com os campos não-nulos do input. Usado quando
 * o vendedor escolhe "ATUALIZAR" no fluxo de duplicata detectada.
 */
export async function updateWish(wishId: string, input: Partial<WishCreationInput>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.clientName !== undefined)   update.client_name = input.clientName;
  if (input.clientPhone !== undefined)  update.client_phone = input.clientPhone;
  if (input.brand !== undefined)        update.brand = input.brand;
  if (input.model !== undefined)        update.model = input.model;
  if (input.version !== undefined)      update.version = input.version ?? null;
  if (input.yearMin !== undefined)      update.year_min = input.yearMin ?? null;
  if (input.yearMax !== undefined)      update.year_max = input.yearMax ?? null;
  if (input.kmMax !== undefined)        update.km_max = input.kmMax ?? null;
  if (input.priceMin !== undefined)     update.price_min = input.priceMin ?? null;
  if (input.priceMax !== undefined)     update.price_max = input.priceMax ?? null;
  if (input.colors !== undefined)       update.colors = input.colors ?? [];
  if (input.transmission !== undefined) update.transmission = input.transmission;
  if (input.fuel !== undefined)         update.fuel = input.fuel;
  if (input.cityRef !== undefined)      update.city_ref = input.cityRef ?? null;
  if (input.stateRef !== undefined)     update.state_ref = input.stateRef ?? null;
  if (input.radiusKm !== undefined)     update.radius_km = input.radiusKm;
  if (input.urgency !== undefined)      update.urgency = input.urgency;
  if (input.notes !== undefined)        update.notes = input.notes ?? null;
  if (input.lgpdConsent !== undefined)  update.lgpd_consent = input.lgpdConsent;

  // Renova validade e status para "procurando" — faz sentido pois é uma "reativação"
  if (input.validityDays !== undefined) {
    update.validity_days = input.validityDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.validityDays);
    update.expires_at = expiresAt.toISOString();
  }
  update.status = "procurando";

  const { error } = await supabase.from("wishes").update(update).eq("id", wishId);
  if (error) throw error;
}

export async function createWish(input: WishCreationInput): Promise<WishCreationResult> {
  const validityDays = input.validityDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const { data, error } = await supabase
    .from("wishes")
    .insert({
      seller_id: input.sellerId,
      dealership_id: input.dealershipId ?? null,
      client_name: input.clientName,
      client_phone: input.clientPhone,
      brand: input.brand,
      model: input.model,
      version: input.version ?? null,
      year_min: input.yearMin ?? null,
      year_max: input.yearMax ?? null,
      km_max: input.kmMax ?? null,
      price_min: input.priceMin ?? null,
      price_max: input.priceMax ?? null,
      colors: input.colors ?? [],
      transmission: input.transmission ?? "indiferente",
      fuel: input.fuel ?? "indiferente",
      city_ref: input.cityRef ?? null,
      state_ref: input.stateRef ?? null,
      radius_km: input.radiusKm ?? 100,
      urgency: input.urgency ?? "media",
      validity_days: validityDays,
      notes: input.notes ?? null,
      lgpd_consent: input.lgpdConsent,
      status: "procurando",
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  await bumpDailyCounter(input.sellerId);
  return { id: data.id as string };
}
