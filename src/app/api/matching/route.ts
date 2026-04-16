import { NextRequest, NextResponse } from "next/server";
import { findMatches, MATCH_THRESHOLDS } from "@/lib/services/matching";
import { mockWishes, mockOffers } from "@/lib/data/mock-data";

// POST /api/matching/run — Trigger matching engine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const wishId = body.wishId as string | undefined;

    // Filter wishes if specific wishId provided
    const wishes = wishId
      ? mockWishes.filter((w) => w.id === wishId)
      : mockWishes.filter((w) => w.status === "procurando");

    const offers = mockOffers.filter((o) => o.active);

    const results = findMatches(wishes, offers, MATCH_THRESHOLDS.SUGGESTION);

    const autoNotify = results.filter((r) => r.score >= MATCH_THRESHOLDS.AUTO_NOTIFY);
    const suggestions = results.filter(
      (r) => r.score >= MATCH_THRESHOLDS.SUGGESTION && r.score < MATCH_THRESHOLDS.AUTO_NOTIFY
    );

    // TODO: Send WhatsApp notifications for auto_notify matches
    // TODO: Save matches to database

    return NextResponse.json({
      message: `Matching concluído: ${autoNotify.length} notificações automáticas, ${suggestions.length} sugestões`,
      autoNotify: autoNotify.length,
      suggestions: suggestions.length,
      total: results.length,
      results: results.slice(0, 20),
    });
  } catch (error) {
    console.error("[API] Matching error:", error);
    return NextResponse.json(
      { error: "Erro no motor de matching" },
      { status: 500 }
    );
  }
}

// GET /api/matching — Get matching status/stats
export async function GET() {
  return NextResponse.json({
    status: "active",
    lastRun: new Date().toISOString(),
    config: {
      autoNotifyThreshold: MATCH_THRESHOLDS.AUTO_NOTIFY,
      suggestionThreshold: MATCH_THRESHOLDS.SUGGESTION,
      priceTolerance: "5%",
      scanIntervalMinutes: 5,
    },
  });
}
