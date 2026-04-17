import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";

// GET /api/notificacoes — List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*, matches(*, wishes(*), offers(*))", { count: "exact" })
      .eq("recipient_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    console.error("[API] Error listing notifications:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/notificacoes — Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const ids = body.ids as string[];

    if (!ids?.length) {
      return NextResponse.json({ error: "IDs obrigatórios" }, { status: 400 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ status: "lido", read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("recipient_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ message: `${ids.length} notificações marcadas como lidas` });
  } catch (error) {
    console.error("[API] Error updating notifications:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
