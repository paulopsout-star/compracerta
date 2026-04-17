import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// GET /api/cron/expire-wishes — Expire wishes past their validity date
// Can be called by Vercel Cron or any scheduler
export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("wishes")
      .update({ status: "expirado", updated_at: now })
      .lt("expires_at", now)
      .in("status", ["procurando", "match_encontrado"])
      .select("id");

    if (error) throw error;

    const expired = data?.length ?? 0;
    return NextResponse.json({
      message: `${expired} desejos expirados`,
      expired,
      timestamp: now,
    });
  } catch (error) {
    console.error("[CRON] Expire wishes error:", error);
    return NextResponse.json({ error: "Erro ao expirar desejos" }, { status: 500 });
  }
}
