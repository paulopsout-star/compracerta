/**
 * FIPE API client (Parallelum) — public, free, no auth required.
 * Provides all official brands and models for Brazilian vehicles.
 *
 * Docs: https://deividfortuna.github.io/fipe/
 */

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

interface FipeBrand { codigo: string; nome: string }
interface FipeModelsResponse { modelos: { codigo: number; nome: string }[]; anos: { codigo: string; nome: string }[] }

export interface BrandOption { value: string; label: string; fipeCode: string }
export interface ModelOption { value: string; label: string; fipeCode: string }

/** Normalize label to proper capitalization (handles FIPE returning random case) */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((word) => {
      // Keep acronyms of 2-3 chars uppercase (BMW, MG, etc.) if original was all caps
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** In-memory cache — brands change rarely, cache for 24h */
interface CacheEntry<T> { data: T; expiresAt: number }
const brandsCache: { current?: CacheEntry<BrandOption[]> } = {};
const modelsCache = new Map<string, CacheEntry<ModelOption[]>>();

const BRANDS_TTL = 24 * 60 * 60 * 1000;
const MODELS_TTL = 24 * 60 * 60 * 1000;

export async function fetchBrands(): Promise<BrandOption[]> {
  if (brandsCache.current && brandsCache.current.expiresAt > Date.now()) {
    return brandsCache.current.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${FIPE_BASE}/marcas`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = (await res.json()) as FipeBrand[];

    const options: BrandOption[] = data
      .map((b) => ({
        value: b.codigo,
        label: titleCase(b.nome),
        fipeCode: b.codigo,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    brandsCache.current = { data: options, expiresAt: Date.now() + BRANDS_TTL };
    return options;
  } catch (error) {
    console.error("[FIPE] Failed to fetch brands:", error);
    return [];
  }
}

/**
 * Group FIPE models by their base model name (first word or first two words
 * if both are capitalized — covers cases like "Corolla Cross", "T-Cross").
 * Returns { baseModel: [versions...] }.
 */
export function groupModelsByBase(models: ModelOption[]): {
  baseModels: { value: string; label: string; count: number }[];
  versionsByBase: Record<string, ModelOption[]>;
} {
  const versionsByBase: Record<string, ModelOption[]> = {};

  for (const m of models) {
    const words = m.label.split(" ");
    let baseName = words[0] ?? m.label;

    // If second word is also capitalized and not a number/digit, include it
    // e.g. "Corolla Cross", "CR V", "T-Cross"
    if (words.length >= 2) {
      const w2 = words[1];
      const isCapitalized = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(w2);
      const isWord = /^[A-Za-zÁ-ú-]+$/.test(w2);
      const isCommonModifier = /^(Cross|Hatch|Sedan|Coupe|Cabrio|GT|Sport)$/i.test(w2);
      if (isCapitalized && isWord && isCommonModifier) {
        baseName = `${words[0]} ${w2}`;
      }
    }

    if (!versionsByBase[baseName]) versionsByBase[baseName] = [];
    // Version = everything after the base model name
    const versionLabel = m.label.slice(baseName.length).trim();
    versionsByBase[baseName].push({
      value: m.value,
      label: versionLabel || "Sem versão específica",
      fipeCode: m.fipeCode,
    });
  }

  const baseModels = Object.entries(versionsByBase)
    .map(([label, versions]) => ({ value: label, label, count: versions.length }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return { baseModels, versionsByBase };
}

export async function fetchModels(brandCode: string): Promise<ModelOption[]> {
  const cached = modelsCache.get(brandCode);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${FIPE_BASE}/marcas/${brandCode}/modelos`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = (await res.json()) as FipeModelsResponse;

    const options: ModelOption[] = (data.modelos ?? [])
      .map((m) => ({
        value: String(m.codigo),
        label: titleCase(m.nome),
        fipeCode: String(m.codigo),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    modelsCache.set(brandCode, { data: options, expiresAt: Date.now() + MODELS_TTL });
    return options;
  } catch (error) {
    console.error(`[FIPE] Failed to fetch models for brand ${brandCode}:`, error);
    return [];
  }
}
