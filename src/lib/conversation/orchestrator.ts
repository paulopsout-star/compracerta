/**
 * Orquestrador de conversa — state machine simplificada.
 * Spec seções 4.2, 9.1, 9.2.
 *
 * Esta versão usa o extrator scripted (extractor.ts). A FASE 9 substitui o
 * extrator por LLM + few-shot, mantendo a mesma interface (processTurn).
 */

import { supabase } from "@/lib/db";
import { getNumber, isEnabled } from "@/lib/feature-flags";
import { sendText } from "@/lib/services/whatsapp";
import { createWish, findDuplicate, hasReachedDailyLimit, updateWish } from "@/lib/services/wish-service";
import { runMatchingForWish, type MatchSummary } from "@/lib/services/match-runner";
import { hasBeenNotified, recordNotification } from "@/lib/services/notification-log";
import type { Offer } from "@/types";
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

/**
 * Parser contextual: quando o bot acabou de perguntar um campo específico,
 * interpreta a resposta livre do usuário nesse contexto. Evita loop quando
 * o extrator genérico não pega (ex: "João Silva" solto não dispara
 * extractNomeCliente, que espera formato "Nome - telefone").
 */
function parseForExpectedField(text: string, fieldKey: string): Partial<DraftWish> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  if (fieldKey === "clienteNome") {
    // "João Silva - 31988887777" → captura ambos
    const dashSplit = trimmed.split(/\s+[-–—]\s+/);
    if (dashSplit.length >= 2) {
      const out: Partial<DraftWish> = {};
      const namePart = dashSplit[0].trim();
      if (/^[A-Za-zÀ-ÿ\s.'-]{3,60}$/.test(namePart) && namePart.split(/\s+/).length >= 1) {
        out.clienteNome = namePart;
      }
      const phoneDigits = dashSplit.slice(1).join(" ").replace(/\D/g, "");
      if (phoneDigits.length >= 10 && phoneDigits.length <= 13) {
        const noDdi = phoneDigits.startsWith("55") ? phoneDigits.slice(2) : phoneDigits;
        out.clienteTelefone = `+55${noDdi}`;
      }
      return out;
    }
    // Nome cru: 1+ palavras, só letras/acentos/espaços/pontos. Mínimo 3 caracteres.
    if (/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,59}$/.test(trimmed)) {
      return { clienteNome: trimmed };
    }
  }

  if (fieldKey === "clienteTelefone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) {
      const noDdi = digits.startsWith("55") ? digits.slice(2) : digits;
      return { clienteTelefone: `+55${noDdi}` };
    }
  }

  if (fieldKey === "precoMax") {
    const m = trimmed.match(/^([\d.,]+)\s*(k|mil|m)?$/i);
    if (m) {
      const num = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(num)) {
        const suffix = m[2]?.toLowerCase();
        const v =
          suffix === "k" || suffix === "mil" ? num * 1000 :
          suffix === "m" ? num * 1_000_000 :
          num < 1000 ? num * 1000 : num;
        return { precoMax: Math.round(v) };
      }
    }
  }

  if (fieldKey === "anoMin") {
    const years = (trimmed.match(/20\d{2}/g) ?? [])
      .map((y) => parseInt(y))
      .filter((y) => y >= 2000 && y <= new Date().getFullYear() + 1);
    if (years.length === 1) return { anoMin: years[0], anoMax: years[0] };
    if (years.length >= 2) return { anoMin: Math.min(...years), anoMax: Math.max(...years) };
  }

  if (fieldKey === "modelo") {
    // Fallback: quando o extrator genérico não reconhece o modelo (taxonomia
    // limitada), aceita texto livre no formato "Marca Modelo" ou só "Modelo".
    // Ex: "Ford Fiesta Sedan 1.6", "Onix Plus", "HB20".
    const words = trimmed.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ0-9][\w\-.]{0,29}$/.test(w));
    if (words.length === 1 && words[0].length >= 2) {
      return { modelo: words[0] };
    }
    if (words.length === 2) {
      return { marca: capitalize(words[0]), modelo: capitalize(words[1]) };
    }
    if (words.length >= 3 && words.length <= 6) {
      return {
        marca: capitalize(words[0]),
        modelo: capitalize(words[1]),
        versao: words.slice(2).join(" "),
      };
    }
  }

  return {};
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function fieldHint(fieldKey: string): string {
  switch (fieldKey) {
    case "modelo":         return 'Me manda marca e modelo. Ex: "Honda Civic", "Fiat Argo", "Renault Kwid".';
    case "anoMin":         return 'Me manda o ano. Ex: "2022", "2020 a 2023", "a partir de 2021", "até 2022".';
    case "precoMax":       return 'Me manda o orçamento. Ex: "120 mil", "R$ 130000", "até 100k".';
    case "clienteNome":    return 'Me manda o nome do cliente, ou "Nome - telefone" se já tiver o telefone. Ex: "Renata Oliveira - (31) 98888-7777".';
    case "clienteTelefone":return 'Me manda só o telefone do cliente. Ex: "(31) 98888-7777" ou "31988887777".';
    default:               return "Pode reformular pra mim?";
  }
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

function draftToWishInput(user: AuthenticatedUser, draft: DraftWish) {
  return {
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
    transmission: draft.cambio ?? "indiferente" as const,
    fuel: draft.combustivel ?? "indiferente" as const,
    cityRef: draft.cidadeRef,
    urgency: draft.urgencia ?? "media" as const,
    lgpdConsent: true, // etapa LGPD removida do fluxo conversacional
    notes: draft.observacoes,
  };
}

async function persistWish(user: AuthenticatedUser, draft: DraftWish): Promise<string> {
  const result = await createWish(draftToWishInput(user, draft));
  return result.id;
}

async function sendCadastroConfirmado(session: ConversationSessionRow, user: AuthenticatedUser, draft: DraftWish, id: string): Promise<void> {
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
}

function originLabel(offer: Offer): { label: string; detalhes: string } {
  switch (offer.source) {
    case "avaliador":
      return {
        label: "Avaliador Digital",
        detalhes: `${offer.externalDealershipName ?? "—"} (${offer.city}/${offer.state})`,
      };
    case "marketplace":
      return { label: "Marketplace", detalhes: `${offer.city}/${offer.state}` };
    case "estoque_lojista":
      return { label: "Estoque lojista", detalhes: `${offer.city}/${offer.state}` };
    default:
      return { label: "Fonte externa", detalhes: `${offer.city}/${offer.state}` };
  }
}

async function notifyMatch(
  session: ConversationSessionRow,
  user: AuthenticatedUser,
  matches: MatchSummary[]
): Promise<void> {
  if (!(await isEnabled("match.auto_notify.enabled"))) return;
  if (matches.length === 0) return;
  const minScore = await getNumber("match.min_score_threshold", 70);
  const top = matches[0];
  if (top.score < minScore) return;

  // Idempotência: se já notificamos este match via WhatsApp, não re-envia
  if (top.matchId && await hasBeenNotified(top.matchId, "whatsapp")) {
    return;
  }

  const { label: origemLabel, detalhes: origemDetalhes } = originLabel(top.offer);
  const alt = matches.length - 1;

  const body = renderTemplate("match_encontrado", {
    marca: top.offer.brand,
    modelo: top.offer.model,
    versao: top.offer.version ?? "",
    ano: top.offer.year,
    km_formatted: top.offer.km.toLocaleString("pt-BR"),
    cor: top.offer.color ?? "—",
    preco_formatted: top.offer.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    score: Math.round(top.score),
    score_detalhamento_bullets: "",
    origem_label: origemLabel,
    origem_detalhes: origemDetalhes,
    status_veiculo: top.offer.externalStatus ?? "Ativo",
    contato_nome: top.offer.externalSellerName ?? "—",
    contato_telefone: "—",
    alternativas_linha: alt > 0 ? `_Temos mais ${alt} alternativa${alt > 1 ? "s" : ""} — envie *próximo* para ver._` : "",
    alt_count: alt,
  });

  const result = await sendText(session.phoneE164, body, {
    recipientId: user.id,
    recipientType: "vendedor",
    templateName: "match_encontrado",
  });

  if (top.matchId) {
    await recordNotification({
      matchId: top.matchId,
      recipientId: user.id,
      channel: "whatsapp",
      template: "match_encontrado",
      content: body,
      status: result.status === "sent" ? "enviado" : result.status === "failed" ? "erro" : "pendente",
    });
  }
}

async function runMatchAndNotify(
  wishId: string,
  session: ConversationSessionRow,
  user: AuthenticatedUser,
  draft: DraftWish
): Promise<void> {
  try {
    const matches = await runMatchingForWish(wishId);
    if (matches.length > 0) {
      await notifyMatch(session, user, matches);
    } else {
      await sendSemMatch(session, user, draft);
    }
  } catch (err) {
    console.error("[Orchestrator] runMatching falhou:", err instanceof Error ? err.message : err);
    // não-fatal: cadastro já foi confirmado em mensagem anterior
  }
}

async function sendSemMatch(
  session: ConversationSessionRow,
  user: AuthenticatedUser,
  draft: DraftWish
): Promise<void> {
  const anoRange = draft.anoMin && draft.anoMax
    ? (draft.anoMin === draft.anoMax ? `${draft.anoMin}` : `${draft.anoMin}–${draft.anoMax}`)
    : "—";
  await sendText(
    session.phoneE164,
    renderTemplate("sem_match", {
      marca: draft.marca ?? "",
      modelo: draft.modelo ?? "",
      ano_range: anoRange,
      validade_dias: 30,
    }),
    { recipientId: user.id, recipientType: "vendedor", templateName: "sem_match" }
  );
}

/**
 * Ponto único de processamento de turno — chamado pelo inbound-processor.
 */
export async function processTurn(input: TurnInput): Promise<void> {
  const { user, session, text } = input;
  const draft = (session.draftWish as DraftWish) ?? {};
  const state = session.state as SessionState;

  const extraction = await runExtraction(text, state, draft);

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
    await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null, context: null });
    await sendText(
      session.phoneE164,
      "Ok, cancelei o cadastro. Quando quiser, é só me mandar o que o cliente procura.",
      { recipientId: user.id, recipientType: "vendedor", templateName: "cancel_ack" }
    );
    return;
  }

  // --- Estado: confirming -----------------------------------------------
  if (state === "confirming") {
    // Resolução de duplicata (contexto setado quando findDuplicate achou match).
    // Interpreta "1/ATUALIZAR", "2/NOVO", "3/CANCELAR" SEM depender do extrator,
    // que mapearia "1" para intent=confirmar (loop) ou "2" para intent=editar.
    const pendingDupId = (session.context as Record<string, unknown> | null)?.pendingDuplicateId as string | undefined;
    if (pendingDupId) {
      const cmd = text.trim().toLowerCase();
      if (/^(1|atualizar|update|atualiza)$/i.test(cmd)) {
        try {
          await updateWish(pendingDupId, draftToWishInput(user, draft));
          await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null, context: null });
          await sendText(
            session.phoneE164,
            `✅ Desejo atualizado com sucesso!\n\n*${draft.marca} ${draft.modelo}*\nID: #${pendingDupId.slice(-6)}\n\nVou recomeçar a busca com os novos dados.`,
            { recipientId: user.id, recipientType: "vendedor", templateName: "duplicata_atualizado" }
          );
          await runMatchAndNotify(pendingDupId, session, user, draft);
        } catch (err) {
          console.error("[Orchestrator] updateWish failed:", err);
          await sendText(session.phoneE164, "Tive um problema ao atualizar. Pode tentar de novo em alguns segundos?", {
            recipientId: user.id, recipientType: "vendedor", templateName: "error_update",
          });
        }
        return;
      }
      if (/^(2|novo|new|criar|outro)$/i.test(cmd)) {
        try {
          if (await hasReachedDailyLimit(user.id)) {
            await sendText(session.phoneE164, renderTemplate("limite_diario", { limite: "20" }), {
              recipientId: user.id, recipientType: "vendedor", templateName: "limite_diario",
            });
            return;
          }
          const id = await persistWish(user, draft);
          await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null, context: null });
          await sendCadastroConfirmado(session, user, draft, id);
          await runMatchAndNotify(id, session, user, draft);
        } catch (err) {
          console.error("[Orchestrator] force-create wish failed:", err);
          await sendText(session.phoneE164, "Tive um problema ao cadastrar. Pode tentar de novo em alguns segundos?", {
            recipientId: user.id, recipientType: "vendedor", templateName: "error_persist",
          });
        }
        return;
      }
      if (/^(3|cancelar|cancela)$/i.test(cmd)) {
        await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null, context: null });
        await sendText(session.phoneE164, "Ok, cancelei. Quando quiser, é só me mandar um novo desejo.", {
          recipientId: user.id, recipientType: "vendedor", templateName: "cancel_ack",
        });
        return;
      }
      // Resposta não reconhecida — reenvia a pergunta
      await sendText(session.phoneE164, "Por favor, responda *1* (atualizar), *2* (criar novo) ou *3* (cancelar).", {
        recipientId: user.id, recipientType: "vendedor", templateName: "duplicata_retry",
      });
      return;
    }

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
          // Salva id da duplicata no contexto; próximo turno resolve
          await touchSession(session.id, {
            state: "confirming",
            context: { pendingDuplicateId: dup.id },
          });
          return;
        }
        const id = await persistWish(user, draft);
        await touchSession(session.id, { state: "idle", draftWish: null, currentIntent: null, context: null });
        await sendCadastroConfirmado(session, user, draft, id);
        await runMatchAndNotify(id, session, user, draft);
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

  if (extraction.intent === "criar_desejo" || extraction.intent === "continuar_desejo" || state === "collecting_wish") {
    if (!(await isEnabled("wish.creation.enabled"))) {
      await sendText(
        session.phoneE164,
        "O cadastro de desejos está temporariamente indisponível. Tente novamente em alguns minutos.",
        { recipientId: user.id, recipientType: "vendedor", templateName: "wish_creation_disabled" }
      );
      return;
    }

    let newDraft = mergeDraft(draft, extraction.fields);
    let missing = nextMissingField(newDraft);

    // Parser contextual: se o extrator genérico não preencheu o campo que
    // estávamos aguardando, tenta interpretar o texto cru no contexto do campo.
    const ctx = (session.context as Record<string, unknown> | null) ?? {};
    const expectedField = ctx.expectedField as string | undefined;
    const retryCount = (ctx.retryCount as number | undefined) ?? 0;

    if (missing && expectedField && missing.key === expectedField) {
      const contextualFields = parseForExpectedField(text, expectedField);
      if (Object.keys(contextualFields).length > 0) {
        newDraft = { ...newDraft, ...contextualFields };
        missing = nextMissingField(newDraft);
      }
    }

    if (!missing) {
      await touchSession(session.id, {
        state: "confirming",
        draftWish: asJson(newDraft),
        context: null,
      });
      await sendText(session.phoneE164, buildConfirmationText(newDraft), {
        recipientId: user.id, recipientType: "vendedor", templateName: "confirmacao_desejo",
      });
      return;
    }

    // Loop breaker: se estamos pedindo o MESMO campo 3+ vezes seguidas,
    // muda a mensagem pra algo mais específico com escape.
    const sameField = expectedField === missing.key;
    const nextRetry = sameField ? retryCount + 1 : 0;

    await touchSession(session.id, {
      state: "collecting_wish",
      draftWish: asJson(newDraft),
      context: { expectedField: missing.key, retryCount: nextRetry },
    });

    if (nextRetry >= 2) {
      const hint = fieldHint(missing.key);
      await sendText(
        session.phoneE164,
        `Hmm, não consegui entender. ${hint}\n\nSe quiser interromper, envie *cancelar*.`,
        { recipientId: user.id, recipientType: "vendedor", templateName: `retry_${missing.key}` }
      );
      return;
    }

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
