import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, type TemplateName } from "@/lib/services/whatsapp";

// POST /api/notificacoes — Send a notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, template, parameters } = body;

    if (!phone || !template || !parameters) {
      return NextResponse.json(
        { error: "Campos obrigatórios: phone, template, parameters" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(
      phone,
      template as TemplateName,
      parameters
    );

    // TODO: Save notification to database with match reference

    return NextResponse.json({
      message: result.status === "sent" ? "Notificação enviada" : "Falha no envio",
      ...result,
    });
  } catch (error) {
    console.error("[API] Notification error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar notificação" },
      { status: 500 }
    );
  }
}

// GET /api/notificacoes — List notifications
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const recipientId = searchParams.get("recipientId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // TODO: Replace with Prisma query
  return NextResponse.json({
    data: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
    filters: { recipientId, status },
  });
}
