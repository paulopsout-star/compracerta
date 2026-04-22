/**
 * Cron: reexecuta matching em todos os desejos ativos. Notifica o vendedor
 * via WhatsApp apenas quando descobre um match NOVO com score >= threshold.
 *
 * Agendado em vercel.json para rodar periodicamente. Também pode ser
 * invocado manualmente via GET.
 *
 * Segurança: se CRON_SECRET estiver configurada, exige Authorization: Bearer.
 * Vercel Cron envia isso automaticamente quando a env var está definida.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getNumber, isEnabled } from "@/lib/feature-flags";
import { runMatchingForWish, type MatchSummary } from "@/lib/services/match-runner";
import { sendText } from "@/lib/services/whatsapp";
import { renderTemplate } from "@/lib/whatsapp-templates";
import { hasBeenNotified, recordNotification } from "@/lib/services/notification-log";
import type { Offer } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos (Pro plan). Hobby ignora, limite 10s.

function verifyCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // sem secret configurado — aceita (Vercel Cron usa domínio interno)
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

interface WishListRow {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  client_phone: string;
  expires_at: string;
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

/**
 * Envia notification para o vendedor e registra em notifications.
 * Retorna false se já havia registro prévio (skip idempotente).
 */
function panelBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (!raw) return "https://compracerta-seven.vercel.app";
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;
}

function buildAlternativasLinha(alt: number, wishId: string): string {
  const link = `${panelBaseUrl()}/vendedor/matches?wishId=${encodeURIComponent(wishId)}`;
  const plural = alt > 1 ? "s" : "";
  return `📊 Há mais *${alt} alternativa${plural}* para esse desejo.\nAcesse o painel do Compra Certa para avaliar:\n🔗 ${link}`;
}

async function notifySellerForNewMatch(
  sellerId: string,
  sellerPhone: string,
  wishId: string,
  top: MatchSummary,
  totalMatches: number
): Promise<boolean> {
  if (top.matchId && await hasBeenNotified(top.matchId, "whatsapp")) {
    return false;
  }

  const { label: origemLabel, detalhes: origemDetalhes } = originLabel(top.offer);
  const alt = totalMatches - 1;

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
    alternativas_linha: alt > 0 ? buildAlternativasLinha(alt, wishId) : "",
    alt_count: alt,
  });

  const result = await sendText(sellerPhone, body, {
    recipientId: sellerId,
    recipientType: "vendedor",
    templateName: "match_encontrado",
  });

  if (top.matchId) {
    await recordNotification({
      matchId: top.matchId,
      recipientId: sellerId,
      channel: "whatsapp",
      template: "match_encontrado",
      content: body,
      status: result.status === "sent" ? "enviado" : result.status === "failed" ? "erro" : "pendente",
    });
  }
  return result.status === "sent";
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const start = Date.now();
  const now = new Date().toISOString();
  const report: Array<{
    wishId: string;
    brand: string;
    model: string;
    matches: number;
    newMatches: number;
    notified: boolean;
  }> = [];

  try {
    const minScore = await getNumber("match.min_score_threshold", 70);
    const autoNotify = await isEnabled("match.auto_notify.enabled");

    // Busca desejos ativos, não expirados, limitado a 50 por execução
    const { data: wishes, error } = await supabase
      .from("wishes")
      .select("id, seller_id, brand, model, client_phone, expires_at")
      .in("status", ["procurando", "match_encontrado"])
      .gt("expires_at", now)
      .order("updated_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    // Carrega phones dos vendedores (1 query pra todos)
    const sellerIds = Array.from(new Set((wishes ?? []).map((w) => w.seller_id)));
    const { data: sellers } = await supabase
      .from("users")
      .select("id, phone, active")
      .in("id", sellerIds.length > 0 ? sellerIds : ["__none__"]);
    const sellerPhoneMap = new Map<string, { phone: string | null; active: boolean }>();
    for (const s of sellers ?? []) {
      sellerPhoneMap.set(s.id as string, { phone: (s.phone as string | null) ?? null, active: s.active as boolean });
    }

    for (const w of (wishes ?? []) as WishListRow[]) {
      try {
        const matches = await runMatchingForWish(w.id);
        const newMatches = matches.filter((m) => m.isNew);
        const topNew = newMatches.find((m) => m.score >= minScore);

        let notified = false;
        if (topNew && autoNotify) {
          const seller = sellerPhoneMap.get(w.seller_id);
          if (seller?.active && seller.phone) {
            notified = await notifySellerForNewMatch(w.seller_id, seller.phone, w.id, topNew, matches.length);
          }
        }

        report.push({
          wishId: w.id,
          brand: w.brand,
          model: w.model,
          matches: matches.length,
          newMatches: newMatches.length,
          notified,
        });
      } catch (err) {
        console.error(`[CRON rematch] wish ${w.id} falhou:`, err instanceof Error ? err.message : err);
        report.push({
          wishId: w.id,
          brand: w.brand,
          model: w.model,
          matches: 0,
          newMatches: 0,
          notified: false,
        });
      }
    }

    const notifiedCount = report.filter((r) => r.notified).length;
    const totalNew = report.reduce((sum, r) => sum + r.newMatches, 0);

    return NextResponse.json({
      processedWishes: report.length,
      newMatchesFound: totalNew,
      notificationsSent: notifiedCount,
      durationMs: Date.now() - start,
      report,
    });
  } catch (err) {
    console.error("[CRON rematch] falhou:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
