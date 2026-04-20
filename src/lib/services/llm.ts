/**
 * Extração via Claude (Anthropic) — spec seção 10.
 *
 * Uso direto da API via fetch para evitar dep nova. Modelo lido da flag
 * conversation.llm.model. Fallback é responsabilidade do caller (orchestrator).
 *
 * Prompt + few-shot 1:1 com a seção 10 do prompt-final.
 */

import { getString } from "@/lib/feature-flags";
import type { ExtractionResult, Intent, ExtractedFields } from "@/lib/conversation/extractor";

const SYSTEM_PROMPT = `Você é um assistente especializado em extração de dados sobre desejos de compra de veículos para a plataforma Compra Certa, do ecossistema Canal do Repasse.

Seu papel é processar mensagens informais de vendedores de concessionárias brasileiras e retornar um JSON estruturado com a intenção identificada e os campos extraídos.

## Saída obrigatória
Retorne APENAS um objeto JSON válido, sem texto adicional, sem markdown, sem blocos de código. Exemplo de formato:

{
  "intent": "criar_desejo | continuar_desejo | confirmar | editar | cancelar | ver_status | ver_mais_opcoes | ver_detalhes | encaminhar | ajuda | relatorio | feedback_conversao | retomar | consentimento_sim | consentimento_nao | outra",
  "confianca_intent": 0.0 a 1.0,
  "campos_extraidos": {
    "marca": "string ou null",
    "modelo": "string ou null",
    "versao": "string ou null",
    "ano_min": "int ou null",
    "ano_max": "int ou null",
    "km_max": "int ou null",
    "cor": ["array de strings"] ou null,
    "preco_min": "int ou null (em BRL)",
    "preco_max": "int ou null (em BRL)",
    "cambio": "manual | automatico | indiferente | null",
    "combustivel": "flex | gasolina | diesel | hibrido | eletrico | indiferente | null",
    "cliente_nome": "string ou null",
    "cliente_telefone": "string E.164 ou null",
    "cidade_ref": "string ou null",
    "raio_km": "int ou null",
    "urgencia": "baixa | media | alta | null",
    "observacoes": "string ou null"
  },
  "ambiguidades": ["lista de campos com interpretação ambígua"],
  "alternativas_modelo": ["array de modelos se houve 'ou' na mensagem"]
}

## Regras

1. NÃO invente dados. Se o vendedor disser "um Civic", NÃO preencha ano, versão, câmbio etc.
2. Preços informais devem ser convertidos: "120 mil" → 120000, "R$ 85k" → 85000, "150" (no contexto de preço) → 150000.
3. Faixas de ano: "2020 a 2023" → ano_min=2020, ano_max=2023. "Até 2022" → ano_max=2022, ano_min=null. "2022" → ano_min=2022, ano_max=2022.
4. Quilometragem: "até 50 mil km" → km_max=50000. "abaixo de 80k" → km_max=80000.
5. Telefones: normalize para E.164 brasileiro. "31988887777" → "+5531988887777". "(31) 9 8888-7777" → "+5531988887777".
6. Se a mensagem tem "ou" entre modelos ("Civic ou Corolla"), registre em alternativas_modelo e NÃO escolha um.
7. Ambiguidades devem ser sinalizadas (ex: "preto ou branco?" → ambiguidades: ["cor_indefinida"]).
8. Gírias e regionalismos:
   - "zerinho" / "zero" → preferência por veículo com baixa km (km_max=20000)
   - "segundo dono" → observacao
   - "top de linha" → versao de ponta, observacao
9. Se a mensagem não tem relação com cadastro (ex: "bom dia"), intent="outra".
10. Confirmações ambíguas: "ok", "beleza", "pode ser" no contexto de confirmação → intent="confirmar".
11. Números soltos em contexto de navegação ("2", "3") → intent="ver_mais_opcoes".
12. "sim"/"não" em contexto de consentimento LGPD → intent="consentimento_sim" ou "consentimento_nao".
13. Sempre preencha intent e confianca_intent, mesmo que campos_extraidos esteja vazio.`;

interface FewShot {
  role: "user" | "assistant";
  content: string;
}

const FEW_SHOTS: FewShot[] = [
  { role: "user", content: "Oi, tenho um cliente que quer um Civic EXL 2022 automático preto, até 130 mil, até 50 mil km. Nome João Silva, telefone 31988887777" },
  { role: "assistant", content: JSON.stringify({
    intent: "criar_desejo", confianca_intent: 0.98,
    campos_extraidos: {
      marca: "Honda", modelo: "Civic", versao: "EXL", ano_min: 2022, ano_max: 2022,
      km_max: 50000, cor: ["preto"], preco_min: null, preco_max: 130000, cambio: "automatico",
      combustivel: null, cliente_nome: "João Silva", cliente_telefone: "+5531988887777",
      cidade_ref: null, raio_km: null, urgencia: null, observacoes: null,
    },
    ambiguidades: [], alternativas_modelo: [],
  }) },

  { role: "user", content: "quero um corolla" },
  { role: "assistant", content: JSON.stringify({
    intent: "criar_desejo", confianca_intent: 0.85,
    campos_extraidos: {
      marca: "Toyota", modelo: "Corolla", versao: null, ano_min: null, ano_max: null,
      km_max: null, cor: null, preco_min: null, preco_max: null, cambio: null,
      combustivel: null, cliente_nome: null, cliente_telefone: null,
      cidade_ref: null, raio_km: null, urgencia: null, observacoes: null,
    },
    ambiguidades: ["ano_indefinido", "preco_indefinido", "cliente_indefinido"],
    alternativas_modelo: [],
  }) },

  { role: "user", content: "cliente tá procurando um Compass ou T-Cross 2021/2022 até 150k, automático" },
  { role: "assistant", content: JSON.stringify({
    intent: "criar_desejo", confianca_intent: 0.95,
    campos_extraidos: {
      marca: null, modelo: null, versao: null, ano_min: 2021, ano_max: 2022,
      km_max: null, cor: null, preco_min: null, preco_max: 150000, cambio: "automatico",
      combustivel: null, cliente_nome: null, cliente_telefone: null,
      cidade_ref: null, raio_km: null, urgencia: null, observacoes: null,
    },
    ambiguidades: ["modelo_multiplo"],
    alternativas_modelo: ["Jeep Compass", "Volkswagen T-Cross"],
  }) },

  { role: "user", content: "[contexto: current_state=confirming]\npode cadastrar" },
  { role: "assistant", content: JSON.stringify({
    intent: "confirmar", confianca_intent: 0.99,
    campos_extraidos: {}, ambiguidades: [], alternativas_modelo: [],
  }) },

  { role: "user", content: "meu cliente quer um compass zerinho top de linha" },
  { role: "assistant", content: JSON.stringify({
    intent: "criar_desejo", confianca_intent: 0.92,
    campos_extraidos: {
      marca: "Jeep", modelo: "Compass", versao: null, ano_min: null, ano_max: null,
      km_max: 20000, cor: null, preco_min: null, preco_max: null, cambio: null,
      combustivel: null, cliente_nome: null, cliente_telefone: null,
      cidade_ref: null, raio_km: null, urgencia: null,
      observacoes: "Cliente quer versão top de linha",
    },
    ambiguidades: ["versao_top_mas_nao_especificada"],
    alternativas_modelo: [],
  }) },

  { role: "user", content: "[contexto: current_state=collecting_wish, draft={marca:Honda,modelo:Civic}]\nde 2020 a 2023" },
  { role: "assistant", content: JSON.stringify({
    intent: "continuar_desejo", confianca_intent: 0.97,
    campos_extraidos: { ano_min: 2020, ano_max: 2023 },
    ambiguidades: [], alternativas_modelo: [],
  }) },

  { role: "user", content: "o cara tem entre 80 e 100k pra gastar" },
  { role: "assistant", content: JSON.stringify({
    intent: "continuar_desejo", confianca_intent: 0.95,
    campos_extraidos: { preco_min: 80000, preco_max: 100000 },
    ambiguidades: [], alternativas_modelo: [],
  }) },

  { role: "user", content: "deixa pra lá, cancelar" },
  { role: "assistant", content: JSON.stringify({
    intent: "cancelar", confianca_intent: 0.99,
    campos_extraidos: {}, ambiguidades: [], alternativas_modelo: [],
  }) },

  { role: "user", content: "[contexto: current_state=waiting_consent]\nsim" },
  { role: "assistant", content: JSON.stringify({
    intent: "consentimento_sim", confianca_intent: 0.98,
    campos_extraidos: {}, ambiguidades: [], alternativas_modelo: [],
  }) },
];

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

async function callClaude(prompt: string, model: string, timeoutMs = 10_000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ausente");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [
    ...FEW_SHOTS.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: prompt },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as ClaudeResponse;
    const text = data.content?.find((b) => b.type === "text")?.text?.trim();
    if (!text) throw new Error("Resposta vazia do Claude");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

interface LLMRaw {
  intent?: string;
  confianca_intent?: number;
  campos_extraidos?: Record<string, unknown>;
  ambiguidades?: string[];
  alternativas_modelo?: string[];
}

function mapIntent(raw: string | undefined): Intent {
  const valid: Intent[] = [
    "criar_desejo", "continuar_desejo", "confirmar", "editar", "cancelar",
    "ver_status", "ver_mais_opcoes", "ajuda", "consentimento_sim", "consentimento_nao",
    "retomar", "outra",
  ];
  const candidate = (raw ?? "outra").trim() as Intent;
  return valid.includes(candidate) ? candidate : "outra";
}

function mapFields(raw: Record<string, unknown> | undefined): ExtractedFields {
  if (!raw) return {};
  const f: ExtractedFields = {};
  if (typeof raw.marca === "string") f.marca = raw.marca;
  if (typeof raw.modelo === "string") f.modelo = raw.modelo;
  if (typeof raw.versao === "string") f.versao = raw.versao;
  if (typeof raw.ano_min === "number") f.anoMin = raw.ano_min;
  if (typeof raw.ano_max === "number") f.anoMax = raw.ano_max;
  if (typeof raw.km_max === "number") f.kmMax = raw.km_max;
  if (typeof raw.preco_min === "number") f.precoMin = raw.preco_min;
  if (typeof raw.preco_max === "number") f.precoMax = raw.preco_max;
  if (raw.cambio === "manual" || raw.cambio === "automatico" || raw.cambio === "indiferente") f.cambio = raw.cambio;
  if (["flex", "gasolina", "diesel", "hibrido", "eletrico", "indiferente"].includes(raw.combustivel as string))
    f.combustivel = raw.combustivel as ExtractedFields["combustivel"];
  if (Array.isArray(raw.cor)) f.cor = raw.cor.filter((x) => typeof x === "string") as string[];
  if (typeof raw.cliente_nome === "string") f.clienteNome = raw.cliente_nome;
  if (typeof raw.cliente_telefone === "string") f.clienteTelefone = raw.cliente_telefone;
  if (typeof raw.cidade_ref === "string") f.cidadeRef = raw.cidade_ref;
  if (typeof raw.raio_km === "number") f.raioKm = raw.raio_km;
  if (raw.urgencia === "baixa" || raw.urgencia === "media" || raw.urgencia === "alta") f.urgencia = raw.urgencia;
  if (typeof raw.observacoes === "string") f.observacoes = raw.observacoes;
  return f;
}

function parseLLM(jsonText: string): ExtractionResult {
  // Remove acidentais ```json fences
  const cleaned = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const data = JSON.parse(cleaned) as LLMRaw;
  return {
    intent: mapIntent(data.intent),
    confidence: typeof data.confianca_intent === "number" ? data.confianca_intent : 0.5,
    fields: mapFields(data.campos_extraidos),
    ambiguities: Array.isArray(data.ambiguidades) ? data.ambiguidades.filter((s): s is string => typeof s === "string") : [],
    alternatives: Array.isArray(data.alternativas_modelo) ? data.alternativas_modelo.filter((s): s is string => typeof s === "string") : undefined,
  };
}

export interface LLMContext {
  state?: string;
  draftWish?: Record<string, unknown> | null;
  expectedField?: string | null;
}

export async function extractWithClaude(text: string, ctx: LLMContext = {}): Promise<ExtractionResult> {
  const model = await getString("conversation.llm.model", "claude-sonnet-4-5");

  const contextHeader = `[contexto: current_state=${ctx.state ?? "idle"}${
    ctx.draftWish && Object.keys(ctx.draftWish).length > 0 ? `, draft=${JSON.stringify(ctx.draftWish)}` : ""
  }${ctx.expectedField ? `, expected_field=${ctx.expectedField}` : ""}]`;
  const prompt = `${contextHeader}\n${text}`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callClaude(prompt, model);
      return parseLLM(raw);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastErr ?? new Error("LLM extraction failed");
}
