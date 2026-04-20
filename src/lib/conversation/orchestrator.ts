/**
 * Orquestrador de conversa — state machine simplificada.
 * Spec seções 4.2, 9.1, 9.2.
 *
 * Esta versão usa o extrator scripted (extractor.ts). A FASE 9 substitui o
 * extrator por LLM + few-shot, mantendo a mesma interface (processTurn).
 */

import { supabase } from "@/lib/db";
import { isEnabled } from "@/lib/feature-flags";
import { sendText } from "@/lib/services/whatsapp";
import { createWish, findDuplicate, hasReachedDailyLimit } from "@/lib/services/wish-service";
import { extract, type ExtractedFields, type ExtractionResult } from "@/lib/conversation/extractor";
import { extractWithClaude } from "@/lib/services/llm";
import { touchSession, type ConversationSessionRow, type SessionState } from "@/lib/conversation/session-store";
import { formatBRL, formatPhoneBR, renderTemplate } from "@/lib/whatsapp-templates";
import type { AuthenticatedUser } from "@/lib/conversation/seller-auth";

export interface TurnInput {
  user: AuthenticatedUser;
  session: ConversationSessionRow;
  text: string;
}

export interface DraftWish extends ExtractedFields {
  lgpdConsent?: boolean;
}

const REQUIRED_FIELDS: Array<{
  key: keyof DraftWish;
  ask: () => string;
  validator?: (d: DraftWish) => boolean;
}> = [
  { key: "modelo", ask: () => renderTemplate("pergunta_marca_modelo") },
  {
    key: "anoMin",
    ask: () => renderTemplate("pergunta_ano"),
    validator: (d) => d.anoMin !== undefined && d.anoMax !== undefined,
  },
  { key: "precoMax", ask: () => renderTemplate("pergunta_preco") },
  {
    key: "clienteNome",
    ask: () => renderTemplate("pergunta_cliente"),
    validator: (d) => !!d.clienteNome && !!d.clienteTelefone,
  },
  {
    key: "lgpdConsent",
    ask: () => renderTemplate("pergunta_consentimento_lgpd"),
    validator: (d) => d.lgpdConsent === true,
  },
];

function asJson(draft: DraftWish): Record<string, unknown> {
  return draft as unknown as Record<string, unknown>;
}

async function runExtraction(text: string, state: string, draft: DraftWish): Promise<ExtractionResult> {
  if (await isEnabled("conversation.llm.enabled")) {
    try {
      return await extractWithClaude(text, { state, draftWish: asJson(draft) });
    } catch (err) {
      console.warn("[Orchestrator] LLM extraction failed, usando fallback regex:", err instanceof Error ? err.message : err);
    }
  }
  return extract(text, state);
}

function nextMissingField(draft: DraftWish): { ask: string; key: string } | null {
  for (const f of REQUIRED_FIELDS) {
    const ok = f.validator ? f.validator(draft) : draft[f.key] !== undefined && draft[f.key] !== null;
    if (!ok) return { ask: f.ask(), key: String(f.key) };
  }
  return null;
}

function mergeDraft(current: DraftWish, fields: ExtractedFields): DraftWish {
  const next: DraftWish = { ...current };
  for (const [k, v] of Object.entries(fields) as Array<[keyof ExtractedFields, unknown]>) {
    if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === "string" && v === "")) {
      (next as Record<string, unknown>)[k] = v;
    }
  }
  return next;
}

function buildConfirmationText(draft: DraftWish, fallbackCity?: string): string {
  const km_max_linha = draft.kmMax ? `Km máx: ${draft.kmMax.toLocaleString("pt-BR")} km` : "";
  const cambio_linha = draft.cambio && draft.cambio !== "indiferente" ? `Câmbio: ${draft.cambio}` : "";
  const cor_linha = draft.cor?.length ? `Cor: ${draft.cor.join(", ")}` : "";
  const preco_min_linha = draft.precoMin ? `De ${formatBRL(draft.precoMin)} ` : "";
  return renderTemplate("confirmacao_desejo", {
    marca: draft.marca ?? "",
    modelo: draft.modelo ?? "",
    versao: draft.versao ?? "",
    ano_min: draft.anoMin ?? "",
    ano_max: draft.anoMax ?? "",
    km_max_linha,
    cambio_linha,
    cor_linha,
    preco_min_linha,
    preco_max_formatted: draft.precoMax ? draft.precoMax.toLocaleString("pt-BR") : "",
    cliente_nome: draft.clienteNome ?? "",
    cliente_telefone_formatted: draft.clienteTelefone ? formatPhoneBR(draft.clienteTelefone) : "",
    cidade_ref: draft.cidadeRef ?? fallbackCity ?? "",
    estado: "",
    raio_km: draft.raioKm ?? 100,
    urgencia: draft.urgencia ?? "media",
    validade_dias: 30,
  });
}

async function handleVerStatus(user: AuthenticatedUser, session: ConversationSessionRow): Promise<void> {
  const { data } = await supabase
    .from("wishes")
    .select("id, brand, model, year_min, year_max, status, created_at")
    .eq("seller_id", user.id)
    .in("status", ["procurando", "match_encontrado", "em_negociacao"])
    .order("created_at", { ascending: false })
    .limit(10);

  const wishes = (data ?? []) as Array<{ id: string; brand: string; model: string; year_min?: number; year_max?: number; status: string }>;
  if (!wishes.length) {
    await sendText(
      session.phoneE164,
      "Você ainda não tem desejos ativos. Quer cadastrar agora? Me diga o modelo que o cliente procura.",
      { recipientId: user.id, recipientType: "vendedor", templateName: "status_empty" }
    );
    return;
  }
  const lines = wishes.map((w, i) => {
    const ano = w.year_min ? `${w.year_min}${w.year_max && w.year_max !== w.year_min ? `–${w.year_max}` : ""}` : "?";
    const statusLabel = w.status === "procurando" ? "🔍 Buscando" : w.status === "match_encontrado" ? "🎯 Match" : "💬 Negociando";
    return `${i + 1}. ${w.brand} ${w.model} ${ano} — ${statusLabel}`;
  });
  await sendText(
    session.phoneE164,
    `📊 *Seus desejos ativos (${wishes.length}):*\n\n${lines.join("\n")}`,
    { recipientId: user.id, recipientType: "vendedor", templateName: "status_list" }
  );
}

async function persistWish(user: AuthenticatedUser, draft: DraftWish): Promise<string> {
  const result = await createWish({
    sellerId: user.id,
    dealershipId: user.dealershipId,
    clientName: draft.clienteNome!,
    clientPhone: draft.clienteTelefone!,
    brand: draft.marca!,
    model: draft.modelo!,
    version: draft.versao,
    yearMin: draft.anoMin,
    yearMax: draft.anoMax,
    kmMax: draft.kmMax,
    priceMin: draft.precoMin,
    priceMax: draft.precoMax,
    colors: draft.cor,
    transmission: draft.cambio ?? "indiferente",
    fuel: draft.combustivel ?? "indiferente",
    cityRef: draft.cidadeRef,
    urgency: draft.urgencia ?? "media",
    lgpdConsent: draft.lgpdConsent === true,
    notes: draft.observacoes,
  });
  return result.id;
}

/**
 * Ponto único de processamento de turno — chamado pelo inbound-processor.
 */
export async function processTurn(input: TurnInput): Promise<void> {
  const { user, session, text } = input;
  const draft = (session.draftWish as DraftWish) ?? {};
  const state = session.state as SessionState;

  // Pseudo-estado para o extrator entender contexto de "sim/não" do consentimento
  const extractorState = draft.clienteNome && draft.clienteTelefone && draft.lgpdConsent !== true
    ? "waiting_consent"
    : state;

  const extraction = await runExtraction(text, extractorState, draft);

  // --- Intents universais ------------------------------------------------
  if (extraction.intent === "ajuda") {
    await sendText(session.phoneE164, renderTemplate("ajuda_menu"), {
      recipientId: user.id, recipientType: "vendedor", templateName: "ajuda_menu",
    });
    return;
  }
  if (extraction.intent === "ver_status") {
    await touchSession(session.id, { state: "viewing_status" });
    await handleVerStatus(user, session);
    await touchSession(session.id, { state: "idle" });
    return;
  }
  if (extraction.intent === "cancelar") {
    await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null });
    await sendText(
      session.phoneE164,
      "Ok, cancelei o cadastro. Quando quiser, é só me mandar o que o cliente procura.",
      { recipientId: user.id, recipientType: "vendedor", templateName: "cancel_ack" }
    );
    return;
  }

  // --- Estado: confirming -----------------------------------------------
  if (state === "confirming") {
    if (extraction.intent === "confirmar") {
      try {
        if (await hasReachedDailyLimit(user.id)) {
          await sendText(session.phoneE164, renderTemplate("limite_diario", { limite: "20" }), {
            recipientId: user.id, recipientType: "vendedor", templateName: "limite_diario",
          });
          return;
        }
        const dup = await findDuplicate(user.id, draft.marca!, draft.modelo!);
        if (dup) {
          const dias = Math.floor((Date.now() - dup.createdAt.getTime()) / 86_400_000);
          await sendText(
            session.phoneE164,
            renderTemplate("duplicata_detectada", {
              dias_atras: dias,
              resumo_desejo_existente: `${draft.marca} ${draft.modelo}`,
            }),
            { recipientId: user.id, recipientType: "vendedor", templateName: "duplicata_detectada" }
          );
          // Mantém estado confirming — próximo turno decide 1/2/3
          return;
        }
        const id = await persistWish(user, draft);
        await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null });
        await sendText(
          session.phoneE164,
          renderTemplate("cadastro_confirmado", {
            desejo_id_short: id.slice(-6),
            marca: draft.marca ?? "",
            modelo: draft.modelo ?? "",
            ano_min: draft.anoMin ?? "",
            ano_max: draft.anoMax ?? "",
          }),
          { recipientId: user.id, recipientType: "vendedor", templateName: "cadastro_confirmado" }
        );
      } catch (err) {
        console.error("[Orchestrator] persistWish failed:", err);
        await sendText(
          session.phoneE164,
          "Tive um problema ao salvar o desejo. Pode tentar de novo em alguns segundos?",
          { recipientId: user.id, recipientType: "vendedor", templateName: "error_persist" }
        );
      }
      return;
    }
    if (extraction.intent === "editar") {
      await touchSession(session.id, { state: "collecting_wish" });
      await sendText(
        session.phoneE164,
        "Ok, o que você quer ajustar? Me manda só o campo que precisa trocar (ex.: 'preço até 140 mil' ou 'ano 2023').",
        { recipientId: user.id, recipientType: "vendedor", templateName: "edit_prompt" }
      );
      return;
    }
    // Caso não identifique nada, reapresenta confirmação
    await sendText(session.phoneE164, buildConfirmationText(draft, user.dealerStoreId ? undefined : undefined), {
      recipientId: user.id, recipientType: "vendedor", templateName: "confirmacao_desejo",
    });
    return;
  }

  // --- Estados coletando/idle -------------------------------------------
  if (extraction.intent === "consentimento_sim") {
    const newDraft: DraftWish = { ...draft, lgpdConsent: true };
    const missing = nextMissingField(newDraft);
    if (!missing) {
      await touchSession(session.id, { state: "confirming", draftWish: asJson(newDraft) });
      await sendText(session.phoneE164, buildConfirmationText(newDraft), {
        recipientId: user.id, recipientType: "vendedor", templateName: "confirmacao_desejo",
      });
    } else {
      await touchSession(session.id, { state: "collecting_wish", draftWish: asJson(newDraft) });
      await sendText(session.phoneE164, missing.ask, {
        recipientId: user.id, recipientType: "vendedor", templateName: `ask_${missing.key}`,
      });
    }
    return;
  }
  if (extraction.intent === "consentimento_nao") {
    await touchSession(session.id, { state: "idle", draftWish: null });
    await sendText(
      session.phoneE164,
      "Sem o consentimento do cliente não posso cadastrar. Quando tiver o ok dele, é só voltar aqui.",
      { recipientId: user.id, recipientType: "vendedor", templateName: "lgpd_denied" }
    );
    return;
  }

  if (extraction.intent === "criar_desejo" || extraction.intent === "continuar_desejo" || state === "collecting_wish") {
    if (!(await isEnabled("wish.creation.enabled"))) {
      await sendText(
        session.phoneE164,
        "O cadastro de desejos está temporariamente indisponível. Tente novamente em alguns minutos.",
        { recipientId: user.id, recipientType: "vendedor", templateName: "wish_creation_disabled" }
      );
      return;
    }
    const newDraft = mergeDraft(draft, extraction.fields);
    const missing = nextMissingField(newDraft);
    if (!missing) {
      await touchSession(session.id, { state: "confirming", draftWish: asJson(newDraft) });
      await sendText(session.phoneE164, buildConfirmationText(newDraft), {
        recipientId: user.id, recipientType: "vendedor", templateName: "confirmacao_desejo",
      });
      return;
    }
    await touchSession(session.id, { state: "collecting_wish", draftWish: asJson(newDraft) });
    await sendText(session.phoneE164, missing.ask, {
      recipientId: user.id, recipientType: "vendedor", templateName: `ask_${missing.key}`,
    });
    return;
  }

  // --- Fallback ---------------------------------------------------------
  await sendText(
    session.phoneE164,
    renderTemplate("boas_vindas", { vendedor_nome: user.name }),
    { recipientId: user.id, recipientType: "vendedor", templateName: "boas_vindas" }
  );
}
