/**
 * Extrator scripted (regex/heurísticas) — fallback quando o LLM está desligado
 * ou indisponível. Cobre os campos essenciais do desejo em PT-BR informal.
 *
 * Spec seções 9 e 10. NÃO tenta resolver ambiguidade — só extrai o que está
 * explícito; deixa o orquestrador perguntar o resto.
 */

export type Intent =
  | "criar_desejo"
  | "continuar_desejo"
  | "confirmar"
  | "editar"
  | "cancelar"
  | "ver_status"
  | "ver_mais_opcoes"
  | "ajuda"
  | "consentimento_sim"
  | "consentimento_nao"
  | "retomar"
  | "outra";

export interface ExtractedFields {
  marca?: string;
  modelo?: string;
  versao?: string;
  anoMin?: number;
  anoMax?: number;
  kmMax?: number;
  precoMin?: number;
  precoMax?: number;
  cambio?: "manual" | "automatico" | "indiferente";
  combustivel?: "flex" | "gasolina" | "diesel" | "hibrido" | "eletrico" | "indiferente";
  cor?: string[];
  clienteNome?: string;
  clienteTelefone?: string;
  cidadeRef?: string;
  raioKm?: number;
  urgencia?: "baixa" | "media" | "alta";
  observacoes?: string;
}

export interface ExtractionResult {
  intent: Intent;
  confidence: number;
  fields: ExtractedFields;
  ambiguities: string[];
  alternatives?: string[];
}

// ---------- Taxonomia básica de marca/modelo -------------------------------
// Ampliar conforme necessário — cobre os modelos mais comuns do repasse BR.
const MODEL_TO_BRAND: Record<string, string> = {
  // Honda
  civic: "Honda", hrv: "Honda", "hr-v": "Honda", fit: "Honda", city: "Honda", wrv: "Honda", "wr-v": "Honda",
  // Toyota
  corolla: "Toyota", etios: "Toyota", yaris: "Toyota", hilux: "Toyota", rav4: "Toyota", sw4: "Toyota",
  // Volkswagen
  gol: "Volkswagen", polo: "Volkswagen", virtus: "Volkswagen", "t-cross": "Volkswagen", tcross: "Volkswagen",
  nivus: "Volkswagen", jetta: "Volkswagen", taos: "Volkswagen", amarok: "Volkswagen", saveiro: "Volkswagen",
  // Chevrolet
  onix: "Chevrolet", prisma: "Chevrolet", tracker: "Chevrolet", s10: "Chevrolet", spin: "Chevrolet",
  cruze: "Chevrolet", cobalt: "Chevrolet", equinox: "Chevrolet",
  // Hyundai
  hb20: "Hyundai", creta: "Hyundai", tucson: "Hyundai", ix35: "Hyundai",
  // Fiat
  argo: "Fiat", cronos: "Fiat", mobi: "Fiat", uno: "Fiat", toro: "Fiat", strada: "Fiat", pulse: "Fiat", fastback: "Fiat",
  // Jeep
  compass: "Jeep", renegade: "Jeep", commander: "Jeep",
  // Renault
  kwid: "Renault", sandero: "Renault", logan: "Renault", duster: "Renault", captur: "Renault",
  // Nissan
  versa: "Nissan", kicks: "Nissan", frontier: "Nissan",
  // Ford (legado)
  ranger: "Ford", ka: "Ford", ecosport: "Ford",
  // Peugeot/Citroen
  "208": "Peugeot", "2008": "Peugeot", "c3": "Citroen", "c4 cactus": "Citroen",
};

const BRAND_ALIASES: Record<string, string> = {
  vw: "Volkswagen", volks: "Volkswagen", volkswagen: "Volkswagen",
  gm: "Chevrolet", chevrolet: "Chevrolet",
  honda: "Honda", toyota: "Toyota", hyundai: "Hyundai", fiat: "Fiat",
  jeep: "Jeep", renault: "Renault", nissan: "Nissan", ford: "Ford",
  peugeot: "Peugeot", citroen: "Citroen", citroën: "Citroen",
};

const COLORS = ["preto", "branco", "prata", "cinza", "vermelho", "azul", "verde", "amarelo", "bege", "marrom", "dourado"];

// ---------- Helpers --------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractBrandAndModel(text: string): { marca?: string; modelo?: string; alternatives?: string[] } {
  const norm = normalize(text);
  const models: string[] = [];

  // Separações por " ou " indicam alternativas
  const hasOu = / ou /.test(norm);

  for (const [key, brand] of Object.entries(MODEL_TO_BRAND)) {
    const re = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (re.test(norm)) models.push(`${brand}|${key}`);
  }

  if (models.length === 0) {
    // Tenta extrair só a marca
    for (const [alias, brand] of Object.entries(BRAND_ALIASES)) {
      const re = new RegExp(`\\b${alias}\\b`, "i");
      if (re.test(norm)) return { marca: brand };
    }
    return {};
  }

  if (models.length > 1 && hasOu) {
    return {
      alternatives: models.map((m) => {
        const [brand, model] = m.split("|");
        return `${brand} ${capitalize(model)}`;
      }),
    };
  }

  const [brand, model] = models[0].split("|");
  return { marca: brand, modelo: capitalize(model) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parsePrecoToken(raw: string): number | undefined {
  const cleaned = raw.toLowerCase().replace(/[^\d,.kml]/g, "");
  const match = cleaned.match(/^([\d.,]+)(k|mil|m)?$/);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  if (isNaN(num)) return undefined;
  const suffix = match[2];
  if (suffix === "k" || suffix === "mil") return Math.round(num * 1000);
  if (suffix === "m") return Math.round(num * 1_000_000);
  // Número solto grande → BRL; pequeno (< 1000) em contexto de preço → mil
  if (num < 1000) return Math.round(num * 1000);
  return Math.round(num);
}

function extractPreco(text: string): { precoMin?: number; precoMax?: number } {
  const norm = normalize(text);

  // Faixa "entre X e Y", "de X a Y"
  const range = norm.match(/(?:entre|de)\s+([\d.,]+(?:k|mil|m)?)\s+(?:e|a|at[eé])\s+([\d.,]+(?:k|mil|m)?)/i);
  if (range) {
    const a = parsePrecoToken(range[1]);
    const b = parsePrecoToken(range[2]);
    if (a && b) return { precoMin: Math.min(a, b), precoMax: Math.max(a, b) };
  }

  // "até X", "no máximo X"
  const max = norm.match(/(?:at[eé]|no m[aá]ximo|m[aá]x(?:imo)?(?: de)?)\s+(r\$\s*)?([\d.,]+(?:k|mil|m)?)/i);
  if (max) {
    const v = parsePrecoToken(max[2]);
    if (v) return { precoMax: v };
  }

  // "R$ 120000" solto
  const rs = norm.match(/r\$\s*([\d.,]+(?:k|mil|m)?)/i);
  if (rs) {
    const v = parsePrecoToken(rs[1]);
    if (v) return { precoMax: v };
  }

  // "120 mil" solto (sem "até") → assume máximo
  const solo = norm.match(/\b([\d.,]+)\s*(k|mil)\b/i);
  if (solo) {
    const v = parsePrecoToken(`${solo[1]}${solo[2]}`);
    if (v) return { precoMax: v };
  }

  return {};
}

function extractAno(text: string): { anoMin?: number; anoMax?: number } {
  const norm = normalize(text);
  const currentYear = new Date().getFullYear();

  const range = norm.match(/(?:de\s+)?(\d{4})\s*(?:\/|a|at[eé])\s*(\d{4})/);
  if (range) {
    const a = parseInt(range[1]);
    const b = parseInt(range[2]);
    if (a >= 2000 && b <= currentYear + 1 && a <= b) return { anoMin: a, anoMax: b };
  }

  const fromYear = norm.match(/a partir de\s+(\d{4})/);
  if (fromYear) return { anoMin: parseInt(fromYear[1]) };

  const untilYear = norm.match(/at[eé]\s+(\d{4})/);
  if (untilYear && parseInt(untilYear[1]) >= 2000 && parseInt(untilYear[1]) <= currentYear + 1) {
    return { anoMax: parseInt(untilYear[1]) };
  }

  // Ano único "em 2022", "2022 " (evitar falsos positivos com preços)
  const singles = Array.from(norm.matchAll(/\b(20\d{2})\b/g))
    .map((m) => parseInt(m[1]))
    .filter((y) => y >= 2000 && y <= currentYear + 1);
  if (singles.length === 1) return { anoMin: singles[0], anoMax: singles[0] };
  if (singles.length === 2) return { anoMin: Math.min(...singles), anoMax: Math.max(...singles) };

  return {};
}

function extractKm(text: string): number | undefined {
  const norm = normalize(text);
  if (/\b(zerinho|zero km|0 km|novinho)\b/.test(norm)) return 20000;

  const m = norm.match(/at[eé]\s+([\d.,]+)\s*(k|mil)?\s*km/);
  if (m) {
    const v = parsePrecoToken(`${m[1]}${m[2] ?? ""}`);
    if (v) return v;
  }
  const m2 = norm.match(/abaixo de\s+([\d.,]+)\s*(k|mil)?/);
  if (m2) {
    const v = parsePrecoToken(`${m2[1]}${m2[2] ?? ""}`);
    if (v) return v;
  }
  return undefined;
}

function extractCambio(text: string): "manual" | "automatico" | undefined {
  const norm = normalize(text);
  if (/\bautom[aá]tic[oa]\b|\baut\b|\bcvt\b|\bdct\b/.test(norm)) return "automatico";
  if (/\bmanual\b/.test(norm)) return "manual";
  return undefined;
}

function extractCor(text: string): string[] | undefined {
  const norm = normalize(text);
  const found = COLORS.filter((c) => new RegExp(`\\b${c}\\b`).test(norm));
  return found.length ? found : undefined;
}

function extractTelefone(text: string): string | undefined {
  const m = text.match(/(?:\(?(\d{2})\)?\s*)?(?:9\s*)?(\d{4,5})[-\s]?(\d{4})/);
  if (!m) return undefined;
  const digits = (m[0] ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return undefined;
  const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
  if (noDdi.length === 10 || noDdi.length === 11) return `+55${noDdi}`;
  return undefined;
}

function extractNomeCliente(text: string): string | undefined {
  // "Nome Completo - (31) 98888-7777" ou "Nome: João Silva"
  const dashSplit = text.split(/\s+[-–—]\s+/);
  if (dashSplit.length >= 2 && /\d{4}/.test(dashSplit[1])) {
    const candidate = dashSplit[0].trim();
    if (/^[A-Za-zÀ-ÿ\s.'-]{3,60}$/.test(candidate)) return candidate;
  }
  const nomeRotulo = text.match(/nome\s*[:=]\s*([A-Za-zÀ-ÿ\s.'-]{3,60})/i);
  if (nomeRotulo) return nomeRotulo[1].trim();
  return undefined;
}

function extractUrgencia(text: string): "baixa" | "media" | "alta" | undefined {
  const norm = normalize(text);
  if (/\bag[eê]ncia\b|\burgente\b|\bj[aá] precisa\b|\bpra hoje\b|\besta semana\b/.test(norm)) return "alta";
  if (/\btranq(u|ü)ilo\b|\bsem pressa\b/.test(norm)) return "baixa";
  return undefined;
}

function extractObservacoes(text: string): string | undefined {
  const norm = normalize(text);
  const notes: string[] = [];
  if (/\btop de linha\b/.test(norm)) notes.push("Cliente quer versão top de linha");
  if (/\bsegundo dono\b/.test(norm)) notes.push("Preferência por segundo dono");
  if (/\b[uú]nic[oa] dono\b/.test(norm)) notes.push("Preferência por único dono");
  return notes.length ? notes.join("; ") : undefined;
}

// ---------- Detecção de intenção -------------------------------------------

function detectIntent(text: string, state?: string): { intent: Intent; confidence: number } {
  const norm = normalize(text);
  if (!norm) return { intent: "ajuda", confidence: 0.5 };

  // Comandos curtos
  if (state === "confirming") {
    if (/^(1|sim|confirmo|pode|pode cadastrar|ok|beleza|confirmar|isso)$/i.test(norm))
      return { intent: "confirmar", confidence: 0.98 };
    if (/^(2|editar|mudar|alterar|corrigir)$/i.test(norm))
      return { intent: "editar", confidence: 0.95 };
    if (/^(3|cancelar|esquece|deixa pra l[aá])$/i.test(norm))
      return { intent: "cancelar", confidence: 0.97 };
  }

  if (state === "waiting_consent") {
    if (/^(1|sim|s|y|yes|autoriza|autorizo|concordo|aceito|pode|ok)$/i.test(norm)) {
      return { intent: "consentimento_sim", confidence: 0.98 };
    }
    if (/^(2|n[aã]o|nao|n|no|neg|nego|nega|nego o consentimento|recusar)$/i.test(norm)) {
      return { intent: "consentimento_nao", confidence: 0.98 };
    }
  }

  if (/^(ajuda|help|menu|\?|comandos|op[cç][oõ]es)$/i.test(norm)) return { intent: "ajuda", confidence: 0.98 };

  // Status / meus desejos / matches / acompanhar — cobertura ampla
  if (/^(ver (meus |os )?desejos( ativos)?|desejos ativos|meus desejos( ativos)?|status|o que tenho ativo|ativos|(ver |acompanhar )?matches( encontrados)?|meus matches|acompanhar)$/i.test(norm)) {
    return { intent: "ver_status", confidence: 0.95 };
  }

  if (/^(cancelar|cancela|para|esquece|deixa pra l[aá]|desistir)$/i.test(norm)) return { intent: "cancelar", confidence: 0.9 };
  if (/^(retomar|continuar( cadastro)?|de onde parei)$/i.test(norm)) return { intent: "retomar", confidence: 0.9 };
  if (/^(pr[oó]xim[oa]|mais op[cç][oõ]es|\d)$/i.test(norm) && state === "viewing_matches")
    return { intent: "ver_mais_opcoes", confidence: 0.9 };

  // Cadastrar novo desejo — gatilhos explícitos (sem ter que informar marca/modelo já)
  if (/^(cadastrar( um)?( novo)? desejo( de cliente)?|novo desejo|quero cadastrar|registrar desejo|criar desejo|adicionar desejo|tenho (um )?cliente(\b.*)?|novo cliente)$/i.test(norm)) {
    return { intent: "criar_desejo", confidence: 0.9 };
  }

  // Criar/continuar — heurística: se tem marca/modelo/ano/preço/telefone, é criação
  const hasSignal =
    Object.keys(extractBrandAndModel(norm)).length > 0 ||
    Object.keys(extractPreco(norm)).length > 0 ||
    Object.keys(extractAno(norm)).length > 0 ||
    extractTelefone(norm) !== undefined;

  if (hasSignal) {
    if (state === "collecting_wish") return { intent: "continuar_desejo", confidence: 0.85 };
    return { intent: "criar_desejo", confidence: 0.8 };
  }

  return { intent: "outra", confidence: 0.3 };
}

// ---------- API pública ----------------------------------------------------

export function extract(text: string, state?: string): ExtractionResult {
  const { intent, confidence } = detectIntent(text, state);

  const brandModel = extractBrandAndModel(text);
  const preco = extractPreco(text);
  const ano = extractAno(text);
  const kmMax = extractKm(text);
  const cambio = extractCambio(text);
  const cor = extractCor(text);
  const tel = extractTelefone(text);
  const nome = extractNomeCliente(text);
  const urg = extractUrgencia(text);
  const obs = extractObservacoes(text);

  const fields: ExtractedFields = {
    marca: brandModel.marca,
    modelo: brandModel.modelo,
    anoMin: ano.anoMin,
    anoMax: ano.anoMax,
    kmMax,
    precoMin: preco.precoMin,
    precoMax: preco.precoMax,
    cambio,
    cor,
    clienteNome: nome,
    clienteTelefone: tel,
    urgencia: urg,
    observacoes: obs,
  };

  const ambiguities: string[] = [];
  if (brandModel.alternatives) ambiguities.push("modelo_multiplo");
  if (!fields.marca && !fields.modelo && intent === "criar_desejo") ambiguities.push("modelo_indefinido");

  return {
    intent,
    confidence,
    fields,
    ambiguities,
    alternatives: brandModel.alternatives,
  };
}
